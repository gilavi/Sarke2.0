import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBottomSheet } from '../../../components/BottomSheet';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Button, Card, Screen } from '../../../components/ui';
import { SignatureCanvas } from '../../../components/SignatureCanvas';
import { useToast } from '../../../lib/toast';
import { useSession } from '../../../lib/session';
import {
  answersApi,
  certificatesApi,
  projectsApi,
  questionnairesApi,
  schedulesApi,
  signaturesApi,
  storageApi,
  templatesApi,
} from '../../../lib/services';
import { googleCalendar } from '../../../lib/googleCalendar';
import { scheduleReminder } from '../../../lib/notifications';
import { STORAGE_BUCKETS } from '../../../lib/supabase';
import { uploadSignature } from '../../../lib/signatures';
import { getStorageImageDataUrl, getStorageImageDisplayUrl } from '../../../lib/imageUrl';
import { theme } from '../../../lib/theme';
import type {
  Answer,
  AnswerPhoto,
  Certificate,
  Project,
  ProjectSigner,
  Question,
  Questionnaire,
  SignatureRecord,
  SignerRole,
  Template,
} from '../../../types/models';
import { SIGNER_ROLE_LABEL } from '../../../types/models';
import { buildPdfHtml } from '../../../lib/pdf';

/**
 * After a questionnaire completes, the DB trigger advances the matching
 * schedules row. Re-fetch it and push to Google Calendar if connected, plus
 * reschedule the local 24h reminder. Best-effort — swallow failures.
 */
async function syncScheduleForCompletion(projectItemId: string | null) {
  if (!projectItemId) return;
  const all = await schedulesApi.list().catch(() => null);
  if (!all) return;
  const updated = all.find(s => s.project_item_id === projectItemId);
  if (!updated) return;
  await scheduleReminder(updated).catch(() => undefined);
  const connected = await googleCalendar.isConnected().catch(() => false);
  if (connected) {
    await googleCalendar.pushDueDate(updated).catch(() => undefined);
  }
}

export default function SigningScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const showActionSheetWithOptions = useBottomSheet();
  const { state } = useSession();

  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [signers, setSigners] = useState<ProjectSigner[]>([]);
  const [existingSigs, setExistingSigs] = useState<SignatureRecord[]>([]);
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [selectedCerts, setSelectedCerts] = useState<Record<string, string>>({});
  const [photosByAnswer, setPhotosByAnswer] = useState<Record<string, AnswerPhoto[]>>({});
  const [busy, setBusy] = useState(false);
  const [expertSigUrl, setExpertSigUrl] = useState<string | null>(null);
  const [sigImages, setSigImages] = useState<Record<string, string>>({}); // role -> data URL
  const [nameInputs, setNameInputs] = useState<Record<string, string>>({}); // role -> person name
  const [capture, setCapture] = useState<{ role: SignerRole; personName: string } | null>(null);

  const user = state.status === 'signedIn' ? state.user : null;
  const expertDefaultName = user ? `${user.first_name} ${user.last_name}`.trim() : 'ექსპერტი';

  // Cancellation token: invalidate any in-flight load() when the screen blurs
  // so late-returning fetches can't clobber state touched on the next focus
  // (e.g. a signature the user just added).
  const loadCtrlRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  const load = useCallback(async () => {
    if (!id) return;
    loadCtrlRef.current.cancelled = true;
    const ctrl = { cancelled: false };
    loadCtrlRef.current = ctrl;

    const q = await questionnairesApi.getById(id).catch(() => null);
    if (ctrl.cancelled) return;
    setQuestionnaire(q);
    if (!q) return;
    const t = await templatesApi.getById(q.template_id).catch(() => null);
    if (ctrl.cancelled) return;
    setTemplate(t);
    const [proj, qs, ans, ps, sigs, cs] = await Promise.all([
      projectsApi.getById(q.project_id).catch(() => null),
      t ? templatesApi.questions(t.id) : Promise.resolve([] as Question[]),
      answersApi.list(q.id).catch(() => []),
      projectsApi.signers(q.project_id).catch(() => []),
      signaturesApi.list(q.id).catch(() => []),
      certificatesApi.list().catch(() => []),
    ]);
    if (ctrl.cancelled) return;
    setProject(proj);
    setQuestions(qs);
    setAnswers(ans);
    setSigners(ps);
    setExistingSigs(sigs);
    setCerts(cs);

    const initialSelected: Record<string, string> = {};
    for (const type of t?.required_cert_types ?? []) {
      const m = cs.find(c => c.type === type);
      if (m) initialSelected[type] = m.id;
    }
    setSelectedCerts(initialSelected);

    // Pre-fill name inputs from existing sigs
    const names: Record<string, string> = {};
    for (const s of sigs) names[s.signer_role] = s.full_name ?? '';
    setNameInputs(prev => ({ ...prev, ...names }));

    const photoMap: Record<string, AnswerPhoto[]> = {};
    await Promise.all(
      ans.map(async a => {
        const ps2 = await answersApi.photos(a.id).catch(() => [] as AnswerPhoto[]);
        if (ps2.length > 0) photoMap[a.id] = ps2;
      }),
    );
    if (ctrl.cancelled) return;
    setPhotosByAnswer(photoMap);

    // Load sig image previews
    const sigMap: Record<string, string> = {};
    await Promise.all(
      sigs.map(async s => {
        if (!s.signature_png_url) return;
        sigMap[s.signer_role] = await getStorageImageDisplayUrl(
          STORAGE_BUCKETS.signatures,
          s.signature_png_url,
        );
      }),
    );
    if (ctrl.cancelled) return;
    setSigImages(sigMap);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        loadCtrlRef.current.cancelled = true;
      };
    }, [load]),
  );

  // Preview expert saved signature (reacts only when the URL changes, not on
  // every focus — avoids the re-download the old twin useFocusEffect caused).
  useEffect(() => {
    let cancelled = false;
    const url = user?.saved_signature_url;
    if (!url) {
      setExpertSigUrl(null);
      return;
    }
    (async () => {
      const dataUrl = await getStorageImageDisplayUrl(STORAGE_BUCKETS.signatures, url);
      if (!cancelled) setExpertSigUrl(dataUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.saved_signature_url]);

  const templateRoles = template?.required_signer_roles ?? [];
  const otherRoles = useMemo(
    () => templateRoles.filter(r => r !== 'expert'),
    [templateRoles],
  );
  const expertRequired = templateRoles.includes('expert');
  const requiredCertTypes = template?.required_cert_types ?? [];

  const signedRoles = new Set(
    existingSigs.filter(s => s.status === 'signed').map(s => s.signer_role),
  );

  // Expert auto-counts when saved_signature_url is set.
  const totalRequired = (expertRequired ? 1 : 0) + otherRoles.length;
  const totalSigned =
    (expertRequired && user?.saved_signature_url ? 1 : 0) +
    otherRoles.filter(r => signedRoles.has(r)).length;

  // ----- Actions -----

  const setName = (role: SignerRole, name: string) => {
    setNameInputs(prev => ({ ...prev, [role]: name }));
  };

  const startSign = async (role: SignerRole) => {
    const personName = (nameInputs[role] ?? '').trim();
    if (!personName) {
      toast.error('ჯერ შეიყვანე სახელი და გვარი');
      return;
    }

    // Auto-fill: look for an existing sig for the same person_name in this project's roster
    if (project) {
      const typed = personName.toLowerCase();
      const match = signers.find(
        s =>
          s.role === role &&
          s.full_name.trim().toLowerCase() === typed &&
          s.signature_png_url,
      );
      if (match) {
        void applyRoster(role, match);
        return;
      }
    }

    setCapture({ role, personName });
  };

  const applyRoster = async (role: SignerRole, signer: ProjectSigner) => {
    if (!questionnaire || !signer.signature_png_url) return;
    try {
      const saved = (await signaturesApi.upsert({
        questionnaire_id: questionnaire.id,
        signer_role: role,
        full_name: signer.full_name,
        phone: signer.phone,
        position: signer.position,
        signature_png_url: signer.signature_png_url,
        status: 'signed',
        person_name: signer.full_name,
      }));
      setExistingSigs(prev => [...prev.filter(s => s.signer_role !== role), saved]);
      const dataUrl = await getStorageImageDisplayUrl(
        STORAGE_BUCKETS.signatures,
        signer.signature_png_url,
      );
      setSigImages(prev => ({ ...prev, [role]: dataUrl }));
      toast.success('ავტომატურად შევსებულია');
    } catch (e: any) {
      toast.error(e?.message ?? 'შეცდომა');
    }
  };

  const onCaptured = async (base64: string) => {
    if (!capture || !questionnaire) return;
    const { role, personName } = capture;
    setCapture(null);
    try {
      const path = `${questionnaire.id}/${role}-${Date.now()}.png`;
      await uploadSignature(path, base64);
      const saved = (await signaturesApi.upsert({
        questionnaire_id: questionnaire.id,
        signer_role: role,
        full_name: personName,
        phone: null,
        position: null,
        signature_png_url: path,
        status: 'signed',
        person_name: personName,
      }));
      setExistingSigs(prev => [...prev.filter(s => s.signer_role !== role), saved]);
      setSigImages(prev => ({ ...prev, [role]: `data:image/png;base64,${base64}` }));

      // Persist onto the project roster for future auto-fill
      try {
        await projectsApi.saveRosterSignature({
          project_id: questionnaire.project_id,
          role,
          full_name: personName,
          signature_png_url: path,
        });
      } catch {
        // non-fatal
      }
      toast.success('ხელმოწერა შენახულია');
    } catch (e: any) {
      toast.error(e?.message ?? 'შენახვა ვერ მოხერხდა');
    }
  };

  const markNotPresent = async (role: SignerRole) => {
    if (!questionnaire) return;
    const personName = (nameInputs[role] ?? '').trim() || null;
    try {
      const saved = (await signaturesApi.upsert({
        questionnaire_id: questionnaire.id,
        signer_role: role,
        full_name: personName ?? '',
        phone: null,
        position: null,
        signature_png_url: null,
        status: 'not_present',
        person_name: personName,
      }));
      setExistingSigs(prev => [...prev.filter(s => s.signer_role !== role), saved]);
      setSigImages(prev => {
        const copy = { ...prev };
        delete copy[role];
        return copy;
      });
      toast.info('არ იყო დამსწრე');
    } catch (e: any) {
      toast.error(e?.message ?? 'შეცდომა');
    }
  };

  const clearRole = async (role: SignerRole) => {
    if (!questionnaire) return;
    try {
      await signaturesApi.remove(questionnaire.id, role);
      setExistingSigs(prev => prev.filter(s => s.signer_role !== role));
      setSigImages(prev => {
        const copy = { ...prev };
        delete copy[role];
        return copy;
      });
    } catch (e: any) {
      toast.error(e?.message ?? 'ვერ წაიშალა');
    }
  };

  const pickCert = (certType: string) => {
    const matches = certs.filter(c => c.type === certType);
    if (matches.length === 0) {
      showActionSheetWithOptions(
        { title: 'სერტიფიკატი არ არის', options: ['ატვირთვა', 'გაუქმება'], cancelButtonIndex: 1 },
        idx => {
          if (idx === 0) router.push('/certificates' as any);
        },
      );
      return;
    }
    const options = matches.map(c => `${c.type}${c.number ? ` · ${c.number}` : ''}`);
    options.push('გაუქმება');
    showActionSheetWithOptions(
      { title: certType, options, cancelButtonIndex: options.length - 1 },
      idx => {
        if (idx == null || idx === options.length - 1) return;
        setSelectedCerts(prev => ({ ...prev, [certType]: matches[idx].id }));
      },
    );
  };

  const generate = async () => {
    if (!questionnaire || !template || !project) return;
    if (!user?.saved_signature_url) {
      toast.info('ჯერ დახაზეთ თქვენი ხელმოწერა');
      router.push('/signature?first=1' as any);
      return;
    }
    setBusy(true);
    try {
      // Inline expert signature into a synthetic SignatureRecord for the PDF
      let expertDataUrl = expertSigUrl;
      if (!expertDataUrl && user.saved_signature_url) {
        expertDataUrl = await getStorageImageDataUrl(
          STORAGE_BUCKETS.signatures,
          user.saved_signature_url,
        );
      }
      const expertRec: SignatureRecord = {
        id: 'expert-auto',
        questionnaire_id: questionnaire.id,
        signer_role: 'expert',
        full_name: expertDefaultName,
        phone: null,
        position: 'შრომის უსაფრთხოების სპეციალისტი',
        signature_png_url: expertDataUrl ?? null,
        signed_at: new Date().toISOString(),
        status: 'signed',
        person_name: expertDefaultName,
      };

      const otherSigs = await Promise.all(
        existingSigs
          .filter(s => s.signer_role !== 'expert')
          .map(async s => {
            if (s.status === 'not_present' || !s.signature_png_url) return s;
            if (s.signature_png_url.startsWith('data:')) return s;
            return {
              ...s,
              signature_png_url: await getStorageImageDataUrl(
                STORAGE_BUCKETS.signatures,
                s.signature_png_url,
              ),
            };
          }),
      );
      const sigsForPdf = [expertRec, ...otherSigs];

      // Pre-embed photos
      const photosForPdf: Record<string, AnswerPhoto[]> = {};
      await Promise.all(
        Object.entries(photosByAnswer).map(async ([answerId, photos]) => {
          photosForPdf[answerId] = await Promise.all(
            photos.map(async p => ({
              ...p,
              storage_path: await getStorageImageDataUrl(
                STORAGE_BUCKETS.answerPhotos,
                p.storage_path,
              ),
            })),
          );
        }),
      );

      const attachedCerts: Array<Certificate & { file_data_url?: string }> = [];
      for (const type of requiredCertTypes) {
        const selectedId = selectedCerts[type];
        if (!selectedId) continue;
        const cert = certs.find(c => c.id === selectedId);
        if (!cert) continue;
        let fileDataUrl: string | undefined;
        if (cert.file_url) {
          fileDataUrl = await getStorageImageDataUrl(
            STORAGE_BUCKETS.certificates,
            cert.file_url,
          );
        }
        attachedCerts.push({ ...cert, file_data_url: fileDataUrl });
      }

      const html = buildPdfHtml({
        questionnaire,
        template,
        project,
        questions,
        answers,
        signatures: sigsForPdf,
        photosByAnswer: photosForPdf,
        certificates: attachedCerts,
      });
      const { uri } = await Print.printToFileAsync({ html });
      const fileName = `${questionnaire.id}.pdf`;
      const blob = await (await fetch(uri)).blob();
      await storageApi.upload(STORAGE_BUCKETS.pdfs, fileName, blob, 'application/pdf');
      await questionnairesApi.complete(questionnaire.id, fileName);
      // Best-effort Google Calendar sync for the newly-advanced schedule.
      void syncScheduleForCompletion(questionnaire.project_item_id).catch(() => undefined);
      toast.success('PDF შეიქმნა');
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      }
      router.back();
    } catch (e: any) {
      toast.error(e?.message ?? 'შეცდომა');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'ხელმოწერები' }} />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 14 }}>
          {/* Summary card */}
          <Card>
            <Text style={styles.eyebrow}>შეჯამება</Text>
            <Text style={{ fontSize: 17, fontWeight: '700', color: theme.colors.ink, marginTop: 6 }}>
              {template?.name ?? 'კითხვარი'}
            </Text>
            {project ? (
              <Text style={{ color: theme.colors.inkSoft, fontSize: 12, marginTop: 2 }}>
                {project.name}
              </Text>
            ) : null}
            <View style={{ height: 10 }} />
            <Text style={styles.eyebrow}>დასკვნა</Text>
            <Text style={{ color: theme.colors.ink, marginTop: 4 }}>
              {questionnaire?.conclusion_text || '—'}
            </Text>
            <View style={{ height: 10 }} />
            <Text
              style={{
                fontWeight: '700',
                color:
                  questionnaire?.is_safe_for_use === false ? theme.colors.danger : theme.colors.accent,
              }}
            >
              {questionnaire?.is_safe_for_use === false
                ? '✗ არ არის უსაფრთხო ექსპლუატაციისთვის'
                : '✓ უსაფრთხოა ექსპლუატაციისთვის'}
            </Text>
          </Card>

          {/* Signatures */}
          <Card>
            <View style={styles.sectionHead}>
              <Text style={styles.eyebrow}>ხელმოწერები</Text>
              <View style={styles.progressBadge}>
                <Ionicons name="checkmark-circle" size={12} color={theme.colors.accent} />
                <Text style={styles.progressText}>
                  {totalSigned} / {totalRequired} ხელმოწერილი
                </Text>
              </View>
            </View>

            {/* Expert card — pre-signed, locked */}
            {expertRequired ? (
              <ExpertCard
                name={expertDefaultName}
                signatureUrl={expertSigUrl}
                hasSaved={!!user?.saved_signature_url}
                onOpenSignature={() => router.push('/signature' as any)}
              />
            ) : null}

            {/* Other role cards */}
            <View style={{ gap: 10, marginTop: expertRequired ? 10 : 0 }}>
              {otherRoles.map(role => {
                const sig = existingSigs.find(s => s.signer_role === role);
                const img = sigImages[role];
                const typed = (nameInputs[role] ?? '').trim().toLowerCase();
                const rosterCandidates = signers.filter(
                  s => s.role === role && s.signature_png_url,
                );
                const roster = typed
                  ? rosterCandidates.find(
                      s => s.full_name.trim().toLowerCase() === typed,
                    )
                  : undefined;
                const autoFilled =
                  sig?.status === 'signed' &&
                  !!roster &&
                  sig.signature_png_url === roster.signature_png_url;
                return (
                  <RoleCard
                    key={role}
                    role={role}
                    signature={sig}
                    signatureImg={img}
                    nameInput={nameInputs[role] ?? ''}
                    onNameChange={n => setName(role, n)}
                    hasAutoFillAvailable={!!roster}
                    autoFilled={autoFilled}
                    rosterCandidates={rosterCandidates}
                    onPickRoster={signer => {
                      setName(role, signer.full_name);
                      void applyRoster(role, signer);
                    }}
                    onSign={() => startSign(role)}
                    onMarkNotPresent={() => markNotPresent(role)}
                    onClear={() => clearRole(role)}
                  />
                );
              })}
            </View>
          </Card>

          {/* Certificates */}
          {requiredCertTypes.length > 0 ? (
            <Card>
              <Text style={styles.eyebrow}>სერტიფიკატები</Text>
              <View style={{ gap: 10, marginTop: 10 }}>
                {requiredCertTypes.map(type => {
                  const selectedId = selectedCerts[type];
                  const selected = selectedId ? certs.find(c => c.id === selectedId) : null;
                  return (
                    <Pressable key={type} onPress={() => pickCert(type)} style={styles.certRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '600', color: theme.colors.ink }}>{type}</Text>
                        <Text style={{ fontSize: 11, color: theme.colors.inkSoft, marginTop: 2 }}>
                          {selected
                            ? selected.number
                              ? `№ ${selected.number}`
                              : 'არჩეული'
                            : 'ჯერ არ არის არჩეული'}
                        </Text>
                      </View>
                      <Ionicons
                        name={selected ? 'checkmark-circle' : 'chevron-forward'}
                        size={22}
                        color={selected ? theme.colors.accent : theme.colors.inkFaint}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </Card>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Button title="დასრულება და PDF" onPress={generate} loading={busy} />
        </View>
      </SafeAreaView>

      <SignatureCanvas
        visible={capture !== null}
        personName={capture?.personName ?? ''}
        onCancel={() => setCapture(null)}
        onConfirm={onCaptured}
      />
    </Screen>
  );
}

// ===== Cards =====

function ExpertCard({
  name,
  signatureUrl,
  hasSaved,
  onOpenSignature,
}: {
  name: string;
  signatureUrl: string | null;
  hasSaved: boolean;
  onOpenSignature: () => void;
}) {
  return (
    <View style={[styles.card, styles.cardExpert]}>
      <View style={styles.roleHeader}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: theme.colors.accent, fontWeight: '600' }}>ექსპერტი</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.ink, marginTop: 1 }}>{name}</Text>
        </View>
        {hasSaved
          ? <Ionicons name="checkmark-circle" size={22} color={theme.colors.accent} />
          : <Pressable onPress={onOpenSignature} hitSlop={10}>
              <Text style={{ color: theme.colors.warn, fontSize: 13, fontWeight: '700' }}>დახატვა ›</Text>
            </Pressable>
        }
      </View>
      {hasSaved && signatureUrl ? (
        <Pressable onPress={onOpenSignature}>
          <View style={styles.sigThumb}>
            <Image source={{ uri: signatureUrl }} style={styles.sigThumbImg} resizeMode="contain" />
          </View>
          <Text style={{ fontSize: 11, color: theme.colors.inkSoft, marginTop: 4, textAlign: 'right' }}>
            შეცვლა ›
          </Text>
        </Pressable>
      ) : !hasSaved ? (
        <Pressable onPress={onOpenSignature} style={styles.missingRow}>
          <Ionicons name="create-outline" size={16} color={theme.colors.warn} />
          <Text style={{ color: theme.colors.warn, fontSize: 12, fontWeight: '600', flex: 1 }}>
            ჯერ არ გაქვს შენახული ხელმოწერა. შეეხე დასახატად.
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function RoleCard({
  role,
  signature,
  signatureImg,
  nameInput,
  onNameChange,
  hasAutoFillAvailable,
  autoFilled,
  rosterCandidates,
  onPickRoster,
  onSign,
  onMarkNotPresent,
  onClear,
}: {
  role: SignerRole;
  signature: SignatureRecord | undefined;
  signatureImg: string | undefined;
  nameInput: string;
  onNameChange: (name: string) => void;
  hasAutoFillAvailable: boolean;
  autoFilled: boolean;
  rosterCandidates: ProjectSigner[];
  onPickRoster: (signer: ProjectSigner) => void;
  onSign: () => void;
  onMarkNotPresent: () => void;
  onClear: () => void;
}) {
  const state: 'empty' | 'signed' | 'not_present' =
    signature?.status === 'signed'
      ? 'signed'
      : signature?.status === 'not_present'
        ? 'not_present'
        : 'empty';

  return (
    <View style={[styles.card, state === 'signed' && styles.cardSigned]}>
      <View style={styles.roleHeader}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: theme.colors.inkSoft, fontWeight: '600' }}>
            {SIGNER_ROLE_LABEL[role]}
          </Text>
          {state !== 'empty' && signature?.full_name ? (
            <Text
              style={{
                fontSize: 14,
                fontWeight: '700',
                color: theme.colors.ink,
                marginTop: 1,
              }}
              numberOfLines={1}
            >
              {signature.full_name}
            </Text>
          ) : null}
        </View>
        {state === 'signed' ? (
          <Ionicons name="checkmark-circle" size={22} color={theme.colors.accent} />
        ) : state === 'not_present' ? (
          <View style={styles.notPresentChip}>
            <Text style={{ color: theme.colors.inkSoft, fontSize: 11, fontWeight: '700' }}>
              არ არის დამსწრე
            </Text>
          </View>
        ) : null}
      </View>

      {/* Signature preview when signed */}
      {state === 'signed' && signatureImg ? (
        <>
          <View style={styles.sigThumb}>
            <Image source={{ uri: signatureImg }} style={styles.sigThumbImg} resizeMode="contain" />
          </View>
          {autoFilled ? (
            <View style={styles.autoFilledChip}>
              <Ionicons name="flash" size={11} color={theme.colors.accent} />
              <Text style={{ color: theme.colors.accent, fontSize: 11, fontWeight: '700' }}>
                ავტომატურად შევსებული — გადახაზვა ›
              </Text>
            </View>
          ) : null}
        </>
      ) : null}

      {state === 'empty' ? (
        <>
          {rosterCandidates.length > 0 ? (
            <View style={styles.rosterBlock}>
              <Text style={styles.rosterLabel}>შენახული პროექტიდან</Text>
              <View style={styles.rosterChipRow}>
                {rosterCandidates.map(c => (
                  <Pressable
                    key={c.id}
                    onPress={() => onPickRoster(c)}
                    style={styles.rosterChip}
                  >
                    <Ionicons name="person-circle" size={16} color={theme.colors.accent} />
                    <Text style={styles.rosterChipText} numberOfLines={1}>
                      {c.full_name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
          <TextInput
            value={nameInput}
            onChangeText={onNameChange}
            placeholder="სახელი გვარი"
            placeholderTextColor={theme.colors.inkFaint}
            style={styles.nameInput}
          />
          {hasAutoFillAvailable ? (
            <Text style={{ fontSize: 11, color: theme.colors.accent, marginTop: 4 }}>
              ✓ ავტომატურად შევსდება
            </Text>
          ) : null}
          <Button title="ხელმოწერა" onPress={onSign} style={{ marginTop: 10 }} />
          <Pressable onPress={onMarkNotPresent} style={{ marginTop: 8, alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: theme.colors.inkSoft }}>არ არის დამსწრე</Text>
          </Pressable>
        </>
      ) : state === 'signed' ? (
        <Pressable onPress={onSign}>
          <View style={styles.sigThumb}>
            {signatureImg
              ? <Image source={{ uri: signatureImg }} style={styles.sigThumbImg} resizeMode="contain" />
              : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="checkmark-circle" size={24} color={theme.colors.accent} />
                </View>
            }
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={{ fontSize: 11, color: theme.colors.inkSoft }}>შეეხე გადასახაზად</Text>
            <Pressable onPress={onClear} hitSlop={10}>
              <Text style={{ fontSize: 11, color: theme.colors.danger }}>გასუფთავება</Text>
            </Pressable>
          </View>
        </Pressable>
      ) : (
        /* not_present */
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 }}>
          <Text style={{ flex: 1, fontSize: 12, color: theme.colors.inkSoft }}>არ იყო დამსწრე</Text>
          <Button title="ხელმოწერა" onPress={onSign} style={{ flex: 0 }} />
          <Pressable onPress={onClear} hitSlop={10}>
            <Ionicons name="close" size={18} color={theme.colors.inkSoft} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontSize: 11,
    color: theme.colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.accent,
  },

  card: {
    backgroundColor: theme.colors.subtleSurface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  cardExpert: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accent,
  },
  cardSigned: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.accent,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  sigThumb: {
    marginTop: 10,
    height: 64,
    backgroundColor: theme.colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    overflow: 'hidden',
  },
  sigThumbImg: { width: '100%', height: '100%' },
  missingRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warnSoft,
    padding: 8,
    borderRadius: 8,
  },
  nameInput: {
    marginTop: 10,
    backgroundColor: theme.colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.ink,
  },
  rosterBlock: {
    marginTop: 10,
    gap: 6,
  },
  rosterLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  rosterChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  rosterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    maxWidth: 200,
  },
  rosterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.accent,
    flexShrink: 1,
  },
  autoFilledChip: {
    marginTop: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.accentSoft,
  },
  notPresentChip: {
    backgroundColor: theme.colors.subtleSurface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
  },
  smallRemove: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: theme.colors.subtleSurface,
  },
  certRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: theme.colors.subtleSurface,
    borderRadius: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: theme.colors.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.hairline,
  },
});
