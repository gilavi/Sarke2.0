// Generate a PDF report from an existing completed inspection.
//
// Reached from the done screen or the inspection detail CTA.
// Lets the inspector review/pick qualification certs, add extra certs,
// confirm their own signature, and optionally collect other signers —
// all before generating the PDF.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useBottomSheet } from '../../components/BottomSheet';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Button, Card, Screen } from '../../components/ui';
import { SignatureCanvas } from '../../components/SignatureCanvas';
import {
  answersApi,
  certificatesApi,
  inspectionsApi,
  projectsApi,
  qualificationsApi,
  signaturesApi,
  storageApi,
  templatesApi,
} from '../../lib/services';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import { getStorageImageDataUrl, getStorageImageDisplayUrl } from '../../lib/imageUrl';
import { buildPdfHtml } from '../../lib/pdf';
import { useToast } from '../../lib/toast';
import { theme } from '../../lib/theme';
import type {
  Answer,
  AnswerPhoto,
  Inspection,
  Project,
  Qualification,
  Question,
  SignatureRecord,
  SignerRole,
  Template,
} from '../../types/models';
import { SIGNER_ROLE_LABEL } from '../../types/models';

// ── Types ────────────────────────────────────────────────────────────────────

// Roles that can be picked for "other signers" (expert is always the
// current user and doesn't appear in this list).
const OTHER_SIGNER_ROLES: SignerRole[] = ['xaracho_supervisor', 'xaracho_assembler'];

interface AdditionalSigner {
  id: string;
  name: string;
  role: SignerRole;
  /** base64 PNG (with data: prefix) captured via SignatureCanvas */
  dataUrl: string | null;
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function GenerateCertificateScreen() {
  const urlParams = useLocalSearchParams<{ inspectionId?: string }>();
  const inspectionId = urlParams.inspectionId ?? null;
  const router = useRouter();
  const toast = useToast();
  const showActionSheetWithOptions = useBottomSheet();
  const { state } = useSession();
  const user = state.status === 'signedIn' ? state.user : null;

  // Core data
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [photosByAnswer, setPhotosByAnswer] = useState<Record<string, AnswerPhoto[]>>({});
  const [quals, setQuals] = useState<Qualification[]>([]);

  // Required cert selection: certType → qualId
  const [selectedQuals, setSelectedQuals] = useState<Record<string, string>>({});
  // Extra certs (beyond required), each is a qualId
  const [extraQualIds, setExtraQualIds] = useState<string[]>([]);
  // Additional signers (besides the expert)
  const [additionalSigners, setAdditionalSigners] = useState<AdditionalSigner[]>([]);
  // Expert signature display URL (data URL for Image)
  const [expertSigDisplayUrl, setExpertSigDisplayUrl] = useState<string | null>(null);
  // Which signer we're currently capturing a signature for (by id)
  const [captureSignerId, setCaptureSignerId] = useState<string | null>(null);
  // Which qual type we're uploading for
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!inspectionId) {
      toast.error('ინსპექცია არ არის მითითებული');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const insp = await inspectionsApi.getById(inspectionId);
      if (!insp) {
        toast.error('ინსპექცია ვერ მოიძებნა');
        setLoading(false);
        return;
      }
      setInspection(insp);
      const tpl = await templatesApi.getById(insp.template_id).catch(() => null);
      setTemplate(tpl);
      const [proj, qs, ans, qualsList] = await Promise.all([
        projectsApi.getById(insp.project_id).catch(() => null),
        tpl ? templatesApi.questions(tpl.id).catch(() => [] as Question[]) : Promise.resolve([] as Question[]),
        answersApi.list(insp.id).catch(() => []),
        qualificationsApi.list().catch(() => []),
      ]);
      setProject(proj);
      setQuestions(qs);
      setAnswers(ans);
      setQuals(qualsList);

      // Pre-select first available qual for each required type
      const initial: Record<string, string> = {};
      for (const t of tpl?.required_qualifications ?? []) {
        const first = qualsList.find(q => q.type === t);
        if (first) initial[t] = first.id;
      }
      setSelectedQuals(initial);

      // Fetch answer photos
      const photoMap: Record<string, AnswerPhoto[]> = {};
      await Promise.all(
        ans.map(async a => {
          const ps = await answersApi.photos(a.id).catch(() => [] as AnswerPhoto[]);
          if (ps.length > 0) photoMap[a.id] = ps;
        }),
      );
      setPhotosByAnswer(photoMap);
    } finally {
      setLoading(false);
    }
  }, [inspectionId, toast]);

  useEffect(() => { void load(); }, [load]);

  // Load expert signature preview
  useEffect(() => {
    let cancelled = false;
    if (!user?.saved_signature_url) { setExpertSigDisplayUrl(null); return; }
    getStorageImageDisplayUrl(STORAGE_BUCKETS.signatures, user.saved_signature_url)
      .then(url => { if (!cancelled) setExpertSigDisplayUrl(url); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?.saved_signature_url]);

  // ── Derived ─────────────────────────────────────────────────────────────────

  const requiredCertTypes = template?.required_qualifications ?? [];

  const missingQualTypes = useMemo(
    () => requiredCertTypes.filter(t => !selectedQuals[t]),
    [requiredCertTypes, selectedQuals],
  );

  // Qual IDs already in use (required + extra) — exclude from "add extra" picker
  const usedQualIds = useMemo(() => {
    const ids = new Set(Object.values(selectedQuals));
    extraQualIds.forEach(id => ids.add(id));
    return ids;
  }, [selectedQuals, extraQualIds]);

  // ── Cert actions ─────────────────────────────────────────────────────────────

  const pickQual = (certType: string) => {
    const matches = quals.filter(q => q.type === certType);
    if (matches.length === 0) {
      Alert.alert(
        'კვალიფიკაცია არ არის',
        'ატვირთე სერტიფიკატი ან ახლავე ატვირთე ახალი.',
        [
          { text: 'გაუქმება', style: 'cancel' },
          { text: 'ატვირთვა', onPress: () => void uploadQual(certType) },
        ],
      );
      return;
    }
    const options = matches.map(m => `${m.type}${m.number ? ` · №${m.number}` : ''}`);
    options.push('გაუქმება');
    showActionSheetWithOptions(
      { title: certType, options, cancelButtonIndex: options.length - 1 },
      idx => {
        if (idx == null || idx === options.length - 1) return;
        setSelectedQuals(prev => ({ ...prev, [certType]: matches[idx].id }));
      },
    );
  };

  const uploadQual = async (certType: string) => {
    if (!user) { toast.error('ავტორიზაცია საჭიროა'); return; }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { toast.error('ფოტოზე წვდომა არ არის'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;
    setUploadingFor(certType);
    try {
      const asset = result.assets[0];
      const res = await fetch(asset.uri);
      const blob = await res.blob();
      const ext = asset.mimeType?.split('/')[1] ?? 'jpg';
      const path = `${user.id}/${Date.now()}.${ext}`;
      await storageApi.upload(STORAGE_BUCKETS.certificates, path, blob, asset.mimeType ?? 'image/jpeg');
      const qual = await qualificationsApi.upsert({
        id: crypto.randomUUID(),
        user_id: user.id,
        type: certType,
        number: null,
        issued_at: new Date().toISOString().slice(0, 10),
        expires_at: null,
        file_url: path,
      });
      setQuals(prev => [qual, ...prev.filter(q => q.id !== qual.id)]);
      setSelectedQuals(prev => ({ ...prev, [certType]: qual.id }));
      toast.success('სერტიფიკატი აიტვირთა');
    } catch (e: any) {
      toast.error(e?.message ?? 'ატვირთვა ვერ მოხერხდა');
    } finally {
      setUploadingFor(null);
    }
  };

  const addExtraQual = () => {
    const available = quals.filter(q => !usedQualIds.has(q.id));
    if (available.length === 0) {
      toast.info('სხვა კვალიფიკაცია არ არის');
      return;
    }
    const options = available.map(q => `${q.type}${q.number ? ` · №${q.number}` : ''}`);
    options.push('გაუქმება');
    showActionSheetWithOptions(
      { title: 'დამატებითი სერტიფიკატი', options, cancelButtonIndex: options.length - 1 },
      idx => {
        if (idx == null || idx === options.length - 1) return;
        setExtraQualIds(prev => [...prev, available[idx].id]);
      },
    );
  };

  const removeExtraQual = (id: string) => {
    setExtraQualIds(prev => prev.filter(x => x !== id));
  };

  // ── Signer actions ──────────────────────────────────────────────────────────

  const addSigner = () => {
    const newSigner: AdditionalSigner = {
      id: crypto.randomUUID(),
      name: '',
      role: 'xaracho_supervisor',
      dataUrl: null,
    };
    setAdditionalSigners(prev => [...prev, newSigner]);
  };

  const updateSignerName = (id: string, name: string) => {
    setAdditionalSigners(prev => prev.map(s => s.id === id ? { ...s, name } : s));
  };

  const pickSignerRole = (signerId: string) => {
    const options = [...OTHER_SIGNER_ROLES.map(r => SIGNER_ROLE_LABEL[r]), 'გაუქმება'];
    showActionSheetWithOptions(
      { title: 'როლი', options, cancelButtonIndex: options.length - 1 },
      idx => {
        if (idx == null || idx === options.length - 1) return;
        const role = OTHER_SIGNER_ROLES[idx];
        setAdditionalSigners(prev => prev.map(s => s.id === signerId ? { ...s, role } : s));
      },
    );
  };

  const removeSigner = (id: string) => {
    setAdditionalSigners(prev => prev.filter(s => s.id !== id));
  };

  const onSignatureCaptured = (base64: string) => {
    if (!captureSignerId) return;
    setAdditionalSigners(prev =>
      prev.map(s =>
        s.id === captureSignerId
          ? { ...s, dataUrl: `data:image/png;base64,${base64}` }
          : s,
      ),
    );
    setCaptureSignerId(null);
  };

  // ── Generate ─────────────────────────────────────────────────────────────────

  const generate = async () => {
    if (!inspection || !template || !project) return;
    if (missingQualTypes.length > 0) {
      Alert.alert('აკლია კვალიფიკაცია', `მიუთითე: ${missingQualTypes.join(', ')}`);
      return;
    }
    setBusy(true);
    try {
      // Expert signature
      const expertDataUrl = user?.saved_signature_url
        ? await getStorageImageDataUrl(STORAGE_BUCKETS.signatures, user.saved_signature_url)
        : null;
      const expertName = user ? `${user.first_name} ${user.last_name}`.trim() : 'ექსპერტი';
      const expertRec: SignatureRecord = {
        id: 'expert-auto',
        inspection_id: inspection.id,
        signer_role: 'expert',
        full_name: expertName,
        phone: null,
        position: 'შრომის უსაფრთხოების სპეციალისტი',
        signature_png_url: expertDataUrl,
        signed_at: new Date().toISOString(),
        status: 'signed',
        person_name: expertName,
      };

      // Additional signers — upload each signature to storage, then persist
      // both the row in `signatures` and keep a data-URL copy for PDF embedding.
      const otherRecs: SignatureRecord[] = [];
      for (const s of additionalSigners.filter(x => x.name.trim())) {
        let storagePath: string | null = null;
        if (s.dataUrl) {
          // Convert data URL → Blob via fetch (RN supports this without atob).
          const blob = await (await fetch(s.dataUrl)).blob();
          const path = `${inspection.id}/${s.id}-${Date.now()}.png`;
          await storageApi.upload(STORAGE_BUCKETS.signatures, path, blob, 'image/png');
          storagePath = path;
        }
        otherRecs.push({
          id: s.id,
          inspection_id: inspection.id,
          signer_role: s.role,
          full_name: s.name.trim(),
          phone: null,
          position: null,
          signature_png_url: s.dataUrl, // data URL for PDF embedding
          signed_at: new Date().toISOString(),
          status: s.dataUrl ? 'signed' : 'not_present',
          person_name: s.name.trim(),
        });
        // Persist to DB (storage path, not data URL) so the inspection has
        // a real audit trail.
        await signaturesApi.upsert({
          id: s.id,
          inspection_id: inspection.id,
          signer_role: s.role,
          full_name: s.name.trim(),
          phone: null,
          position: null,
          signature_png_url: storagePath,
          status: s.dataUrl ? 'signed' : 'not_present',
          person_name: s.name.trim(),
        }).catch(() => { /* non-blocking: PDF still generates */ });
      }
      // Persist the expert's signature record too
      await signaturesApi.upsert({
        id: crypto.randomUUID(),
        inspection_id: inspection.id,
        signer_role: 'expert',
        full_name: expertName,
        phone: null,
        position: 'შრომის უსაფრთხოების სპეციალისტი',
        signature_png_url: user?.saved_signature_url ?? null,
        status: 'signed',
        person_name: expertName,
      }).catch(() => { /* non-blocking */ });

      const sigsForPdf = [expertRec, ...otherRecs];

      // Inline photos
      const photosForPdf: Record<string, AnswerPhoto[]> = {};
      await Promise.all(
        Object.entries(photosByAnswer).map(async ([answerId, photos]) => {
          photosForPdf[answerId] = await Promise.all(
            photos.map(async p => ({
              ...p,
              storage_path: await getStorageImageDataUrl(STORAGE_BUCKETS.answerPhotos, p.storage_path),
            })),
          );
        }),
      );

      // Attach required + extra qualifications
      const allQualIds = [
        ...requiredCertTypes.map(t => selectedQuals[t]).filter(Boolean),
        ...extraQualIds,
      ];
      const attachedQuals: Array<Qualification & { file_data_url?: string }> = [];
      for (const id of allQualIds) {
        const qual = quals.find(q => q.id === id);
        if (!qual) continue;
        let fileDataUrl: string | undefined;
        if (qual.file_url) {
          fileDataUrl = await getStorageImageDataUrl(STORAGE_BUCKETS.certificates, qual.file_url);
        }
        attachedQuals.push({ ...qual, file_data_url: fileDataUrl });
      }

      const html = buildPdfHtml({
        questionnaire: inspection,
        template,
        project,
        questions,
        answers,
        signatures: sigsForPdf,
        photosByAnswer: photosForPdf,
        certificates: attachedQuals,
      });
      const { uri } = await Print.printToFileAsync({ html });
      const fileName = `${inspection.id}-${Date.now()}.pdf`;
      const blob = await (await fetch(uri)).blob();
      await storageApi.upload(STORAGE_BUCKETS.pdfs, fileName, blob, 'application/pdf');
      await certificatesApi.create({
        inspectionId: inspection.id,
        templateId: inspection.template_id,
        pdfUrl: fileName,
        isSafeForUse: inspection.is_safe_for_use,
        conclusionText: inspection.conclusion_text,
        params: {
          expertName,
          qualTypes: attachedQuals.map(q => ({ type: q.type, number: q.number ?? null })),
          signerNames: otherRecs.map(s => s.full_name),
          // Local file:// URI so the preview/share screen can open it
          // directly without going through storage (works in mock mode too).
          localUri: uri,
        },
      });
      toast.success('PDF რეპორტი შეიქმნა');
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      }
      router.replace(`/inspections/${inspection.id}` as any);
    } catch (e: any) {
      toast.error(e?.message ?? 'გენერაცია ვერ მოხერხდა');
    } finally {
      setBusy(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'PDF რეპორტის გენერაცია' }} />
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: theme.colors.inkSoft }}>იტვირთება…</Text>
        </SafeAreaView>
      </Screen>
    );
  }

  if (!inspection || !template) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'PDF რეპორტის გენერაცია' }} />
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ color: theme.colors.inkSoft, textAlign: 'center' }}>
            ინსპექცია ვერ მოიძებნა. სცადე ხელახლა.
          </Text>
        </SafeAreaView>
      </Screen>
    );
  }

  const captureSigner = additionalSigners.find(s => s.id === captureSignerId);

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'PDF რეპორტის გენერაცია' }} />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 14 }}>

          {/* ── Inspection summary ─────────────────────────────── */}
          <Card>
            <Text style={styles.eyebrow}>ინსპექცია</Text>
            <Text style={styles.inspTitle}>{template.name}</Text>
            {project ? <Text style={styles.inspMeta}>{project.name}</Text> : null}
            <Text style={styles.inspMeta}>
              {new Date(inspection.completed_at ?? inspection.created_at).toLocaleString('ka')}
            </Text>
            {inspection.conclusion_text ? (
              <Text style={{ marginTop: 8, color: theme.colors.ink, fontSize: 13, lineHeight: 18 }} numberOfLines={3}>
                {inspection.conclusion_text}
              </Text>
            ) : null}
          </Card>

          {/* ── My signature ───────────────────────────────────── */}
          <Card>
            <Text style={styles.eyebrow}>ჩემი ხელმოწერა</Text>
            <View style={styles.expertRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.expertName}>
                  {user ? `${user.first_name} ${user.last_name}`.trim() : 'ექსპერტი'}
                </Text>
                <Text style={styles.expertRole}>შრომის უსაფრთხოების სპეციალისტი</Text>
              </View>
              {user?.saved_signature_url ? (
                <Ionicons name="checkmark-circle" size={22} color={theme.colors.accent} />
              ) : (
                <Pressable
                  onPress={() => router.push('/signature' as any)}
                  style={styles.drawBtn}
                >
                  <Text style={styles.drawBtnText}>დახაზვა ›</Text>
                </Pressable>
              )}
            </View>
            {expertSigDisplayUrl ? (
              <View style={styles.sigThumb}>
                <Image
                  source={{ uri: expertSigDisplayUrl }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <Pressable onPress={() => router.push('/signature' as any)} style={styles.missingRow}>
                <Ionicons name="create-outline" size={14} color={theme.colors.warn} />
                <Text style={{ fontSize: 12, color: theme.colors.warn }}>
                  ხელმოწერა ჯერ არ არის შენახული — შეეხე დასახატად
                </Text>
              </Pressable>
            )}
          </Card>

          {/* ── Other signers ──────────────────────────────────── */}
          <Card>
            <View style={styles.sectionHeader}>
              <Text style={styles.eyebrow}>სხვა ხელმომწერები</Text>
              <Pressable onPress={addSigner} style={styles.addBtn}>
                <Ionicons name="add" size={14} color={theme.colors.accent} />
                <Text style={styles.addBtnText}>დამატება</Text>
              </Pressable>
            </View>
            {additionalSigners.length === 0 ? (
              <Text style={{ fontSize: 12, color: theme.colors.inkSoft, marginTop: 6 }}>
                სურვილისამებრ — დაამატე სხვა ხელმომწერი
              </Text>
            ) : (
              <View style={{ gap: 10, marginTop: 10 }}>
                {additionalSigners.map(signer => (
                  <View key={signer.id} style={styles.signerCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TextInput
                        style={styles.nameInput}
                        value={signer.name}
                        onChangeText={t => updateSignerName(signer.id, t)}
                        placeholder="სახელი გვარი"
                        placeholderTextColor={theme.colors.inkFaint}
                      />
                      <Pressable hitSlop={8} onPress={() => removeSigner(signer.id)}>
                        <Ionicons name="close-circle" size={20} color={theme.colors.inkFaint} />
                      </Pressable>
                    </View>
                    <Pressable onPress={() => pickSignerRole(signer.id)} style={styles.roleRow}>
                      <Ionicons name="person-circle-outline" size={16} color={theme.colors.inkSoft} />
                      <Text style={styles.roleText}>{SIGNER_ROLE_LABEL[signer.role]}</Text>
                      <Ionicons name="chevron-down" size={14} color={theme.colors.inkFaint} />
                    </Pressable>
                    {signer.dataUrl ? (
                      <View style={styles.sigThumb}>
                        <Image
                          source={{ uri: signer.dataUrl }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="contain"
                        />
                        <Pressable
                          onPress={() => setCaptureSignerId(signer.id)}
                          style={styles.resignOverlay}
                        >
                          <Text style={{ fontSize: 11, color: theme.colors.inkSoft }}>
                            შეცვლა ›
                          </Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Button
                        title="ხელმოწერა"
                        variant="secondary"
                        onPress={() => {
                          if (!signer.name.trim()) {
                            toast.error('ჯერ შეიყვანე სახელი');
                            return;
                          }
                          setCaptureSignerId(signer.id);
                        }}
                        style={{ marginTop: 6 }}
                      />
                    )}
                  </View>
                ))}
              </View>
            )}
          </Card>

          {/* ── Required qualification certs ───────────────────── */}
          {requiredCertTypes.length > 0 ? (
            <Card>
              <Text style={styles.eyebrow}>კვალიფიკაციის სერტიფიკატები</Text>
              <View style={{ gap: 10, marginTop: 10 }}>
                {requiredCertTypes.map(certType => {
                  const selectedId = selectedQuals[certType];
                  const selected = selectedId ? quals.find(q => q.id === selectedId) : null;
                  const hasAny = quals.some(q => q.type === certType);
                  const isUploading = uploadingFor === certType;
                  return (
                    <View key={certType} style={styles.qualBlock}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {selected ? (
                          <Ionicons name="checkmark-circle" size={18} color={theme.colors.accent} />
                        ) : (
                          <Ionicons name="alert-circle" size={18} color={theme.colors.warn} />
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.qualTitle}>{certType}</Text>
                          <Text style={styles.qualMeta}>
                            {selected
                              ? (selected.number ? `№ ${selected.number}` : 'ატვირთულია')
                              : 'არ არის არჩეული'}
                          </Text>
                        </View>
                        <Pressable onPress={() => pickQual(certType)} style={styles.changeBtn}>
                          <Text style={styles.changeBtnText}>
                            {hasAny ? 'შეცვლა' : 'არჩევა'}
                          </Text>
                        </Pressable>
                      </View>
                      {!selected ? (
                        <Button
                          title={isUploading ? 'იტვირთება…' : '+ ახლავე ატვირთვა'}
                          variant="secondary"
                          loading={isUploading}
                          onPress={() => void uploadQual(certType)}
                          style={{ marginTop: 8 }}
                        />
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </Card>
          ) : null}

          {/* ── Extra certs ─────────────────────────────────────── */}
          <Card>
            <View style={styles.sectionHeader}>
              <Text style={styles.eyebrow}>დამატებითი სერტიფიკატები</Text>
              <Pressable onPress={addExtraQual} style={styles.addBtn}>
                <Ionicons name="add" size={14} color={theme.colors.accent} />
                <Text style={styles.addBtnText}>დამატება</Text>
              </Pressable>
            </View>
            {extraQualIds.length === 0 ? (
              <Text style={{ fontSize: 12, color: theme.colors.inkSoft, marginTop: 6 }}>
                სურვილისამებრ — დაამატე სხვა კვალიფიკაციის სერტიფიკატი
              </Text>
            ) : (
              <View style={{ gap: 8, marginTop: 10 }}>
                {extraQualIds.map(id => {
                  const q = quals.find(x => x.id === id);
                  if (!q) return null;
                  return (
                    <View key={id} style={styles.extraRow}>
                      <Ionicons name="ribbon-outline" size={14} color={theme.colors.accent} />
                      <Text style={{ flex: 1, fontSize: 13, color: theme.colors.ink }}>
                        {q.type}{q.number ? ` · №${q.number}` : ''}
                      </Text>
                      <Pressable hitSlop={8} onPress={() => removeExtraQual(id)}>
                        <Ionicons name="close-circle" size={18} color={theme.colors.inkFaint} />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}
          </Card>

          {/* ── Generate button ─────────────────────────────────── */}
          <Button
            title={busy ? 'მიმდინარეობს…' : 'PDF-ის გენერაცია'}
            onPress={generate}
            loading={busy}
            disabled={busy || missingQualTypes.length > 0}
          />
        </ScrollView>
      </SafeAreaView>

      {/* Signature capture modal */}
      <SignatureCanvas
        visible={captureSignerId !== null}
        personName={captureSigner?.name ?? ''}
        onCancel={() => setCaptureSignerId(null)}
        onConfirm={onSignatureCaptured}
      />
    </Screen>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  eyebrow: {
    fontSize: 11,
    color: theme.colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  inspTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.ink,
    marginTop: 6,
  },
  inspMeta: {
    fontSize: 12,
    color: theme.colors.inkSoft,
    marginTop: 2,
  },

  // Expert
  expertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  expertName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  expertRole: {
    fontSize: 11,
    color: theme.colors.inkSoft,
    marginTop: 1,
  },
  drawBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: theme.colors.warnSoft,
  },
  drawBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.warn,
  },
  missingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.warnSoft,
  },
  sigThumb: {
    marginTop: 10,
    height: 60,
    backgroundColor: theme.colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    overflow: 'hidden',
  },
  resignOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 6,
  },

  // Signers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: theme.colors.accentSoft,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  signerCard: {
    backgroundColor: theme.colors.subtleSurface,
    borderRadius: 12,
    padding: 10,
  },
  nameInput: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: theme.colors.ink,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.inkSoft,
  },

  // Qual certs
  qualBlock: {
    backgroundColor: theme.colors.subtleSurface,
    borderRadius: 12,
    padding: 12,
  },
  qualTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  qualMeta: {
    fontSize: 11,
    color: theme.colors.inkSoft,
    marginTop: 2,
  },
  changeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: theme.colors.subtleSurface,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
  },
  changeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.ink,
  },
  extraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    backgroundColor: theme.colors.subtleSurface,
    borderRadius: 10,
  },
});
