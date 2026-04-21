import { useCallback, useMemo, useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useActionSheet } from '@expo/react-native-action-sheet';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import SignatureScreen, { type SignatureViewRef } from 'react-native-signature-canvas';
import { Button, Card, Screen } from '../../../components/ui';
import { useToast } from '../../../lib/toast';
import { useSession } from '../../../lib/session';
import {
  answersApi,
  certificatesApi,
  projectsApi,
  questionnairesApi,
  signaturesApi,
  storageApi,
  templatesApi,
} from '../../../lib/services';
import { STORAGE_BUCKETS } from '../../../lib/supabase';
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

export default function SigningScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { showActionSheetWithOptions } = useActionSheet();
  const { state } = useSession();

  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [signers, setSigners] = useState<ProjectSigner[]>([]);
  const [existingSigs, setExistingSigs] = useState<SignatureRecord[]>([]);
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [selectedCerts, setSelectedCerts] = useState<Record<string, string>>({}); // certType -> cert.id
  const [photosByAnswer, setPhotosByAnswer] = useState<Record<string, AnswerPhoto[]>>({});
  const [busy, setBusy] = useState(false);
  const [capture, setCapture] = useState<{ role: SignerRole; presetName: string } | null>(null);
  const [sigImages, setSigImages] = useState<Record<string, string>>({}); // signer_role -> data URL preview

  const load = useCallback(async () => {
    if (!id) return;
    const [allQ, allT] = await Promise.all([
      questionnairesApi.recent(500),
      templatesApi.list(),
    ]);
    const q = allQ.find(x => x.id === id) ?? null;
    setQuestionnaire(q);
    if (!q) return;
    const t = allT.find(x => x.id === q.template_id) ?? null;
    setTemplate(t);
    const [allP, qs, ans, ps, sigs, cs] = await Promise.all([
      projectsApi.list().catch(() => []),
      t ? templatesApi.questions(t.id) : Promise.resolve([] as Question[]),
      answersApi.list(q.id).catch(() => []),
      projectsApi.signers(q.project_id).catch(() => []),
      signaturesApi.list(q.id).catch(() => []),
      certificatesApi.list().catch(() => []),
    ]);
    setProject(allP.find(p => p.id === q.project_id) ?? null);
    setQuestions(qs);
    setAnswers(ans);
    setSigners(ps);
    setExistingSigs(sigs);
    setCerts(cs);
    // Auto-select first matching cert for each required type
    const initialSelected: Record<string, string> = {};
    for (const type of t?.required_cert_types ?? []) {
      const m = cs.find(c => c.type === type);
      if (m) initialSelected[type] = m.id;
    }
    setSelectedCerts(initialSelected);
    const photoMap: Record<string, AnswerPhoto[]> = {};
    await Promise.all(
      ans.map(async a => {
        const ps2 = await answersApi.photos(a.id).catch(() => [] as AnswerPhoto[]);
        if (ps2.length > 0) photoMap[a.id] = ps2;
      }),
    );
    setPhotosByAnswer(photoMap);
    // Fetch signature previews
    const sigMap: Record<string, string> = {};
    await Promise.all(
      sigs.map(async s => {
        if (!s.signature_png_url) return;
        try {
          const blob = await storageApi.download(STORAGE_BUCKETS.signatures, s.signature_png_url);
          sigMap[s.signer_role] = await blobToDataUrl(blob);
        } catch {
          sigMap[s.signer_role] = storageApi.publicUrl(STORAGE_BUCKETS.signatures, s.signature_png_url);
        }
      }),
    );
    setSigImages(sigMap);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const requiredRoles = template?.required_signer_roles ?? [];
  const requiredCertTypes = template?.required_cert_types ?? [];
  const user = state.status === 'signedIn' ? state.user : null;
  const expertDefaultName = user ? `${user.first_name} ${user.last_name}`.trim() : '';

  const signersByRole = useMemo(() => {
    const m: Record<string, ProjectSigner[]> = {};
    for (const s of signers) {
      (m[s.role] ??= []).push(s);
    }
    return m;
  }, [signers]);

  const pickSignerForRole = (role: SignerRole) => {
    const options: string[] = [];
    const actions: (() => void)[] = [];

    const roster = signersByRole[role] ?? [];
    for (const s of roster) {
      const label = s.signature_png_url ? `${s.full_name} · შენახული ხელმოწერით` : s.full_name;
      options.push(label);
      actions.push(() => {
        if (s.signature_png_url) {
          void applyRoster(role, s);
        } else {
          setCapture({ role, presetName: s.full_name });
        }
      });
    }

    // Always offer "draw new"
    options.push('ახალი ხელმოწერის დახატვა');
    actions.push(() => {
      const preset =
        role === 'expert' ? expertDefaultName : '';
      setCapture({ role, presetName: preset });
    });
    options.push('გაუქმება');

    showActionSheetWithOptions(
      {
        title: SIGNER_ROLE_LABEL[role],
        options,
        cancelButtonIndex: options.length - 1,
      },
      idx => {
        if (idx == null || idx === options.length - 1) return;
        actions[idx]?.();
      },
    );
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
      })) as unknown as SignatureRecord;
      setExistingSigs(prev => [...prev.filter(s => s.signer_role !== role), saved]);
      // Fetch preview
      try {
        const blob = await storageApi.download(STORAGE_BUCKETS.signatures, signer.signature_png_url);
        const dataUrl = await blobToDataUrl(blob);
        setSigImages(prev => ({ ...prev, [role]: dataUrl }));
      } catch {
        setSigImages(prev => ({
          ...prev,
          [role]: storageApi.publicUrl(STORAGE_BUCKETS.signatures, signer.signature_png_url!),
        }));
      }
      toast.success('ხელმოწერა დამატებულია');
    } catch (e: any) {
      toast.error(e?.message ?? 'შეცდომა');
    }
  };

  const onCaptured = async (role: SignerRole, base64Png: string, fullName: string) => {
    if (!questionnaire) return;
    setCapture(null);
    try {
      const cleaned = base64Png.replace(/^data:image\/png;base64,/, '');
      const dataUrl = `data:image/png;base64,${cleaned}`;
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const path = `${questionnaire.id}/${role}-${Date.now()}.png`;
      await storageApi.upload(STORAGE_BUCKETS.signatures, path, blob, 'image/png');
      const saved = (await signaturesApi.upsert({
        questionnaire_id: questionnaire.id,
        signer_role: role,
        full_name: fullName || (role === 'expert' ? expertDefaultName : 'ხელმომწერი'),
        phone: null,
        position: null,
        signature_png_url: path,
      })) as unknown as SignatureRecord;
      setExistingSigs(prev => [...prev.filter(s => s.signer_role !== role), saved]);
      setSigImages(prev => ({ ...prev, [role]: dataUrl }));
      toast.success('ხელმოწერა შენახულია');
    } catch (e: any) {
      toast.error(`შენახვა ვერ მოხერხდა: ${e?.message ?? 'ქსელის შეცდომა'}`);
    }
  };

  const removeSignature = async (role: SignerRole) => {
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
    setBusy(true);
    try {
      const sigsForPdf = await Promise.all(
        existingSigs.map(async s => {
          if (!s.signature_png_url) return s;
          if (s.signature_png_url.startsWith('data:')) return s;
          try {
            const blob = await storageApi.download(STORAGE_BUCKETS.signatures, s.signature_png_url);
            return { ...s, signature_png_url: await blobToDataUrl(blob) };
          } catch {
            return {
              ...s,
              signature_png_url: storageApi.publicUrl(STORAGE_BUCKETS.signatures, s.signature_png_url),
            };
          }
        }),
      );
      const photosForPdf: Record<string, AnswerPhoto[]> = {};
      await Promise.all(
        Object.entries(photosByAnswer).map(async ([answerId, photos]) => {
          photosForPdf[answerId] = await Promise.all(
            photos.map(async p => {
              try {
                const blob = await storageApi.download(STORAGE_BUCKETS.answerPhotos, p.storage_path);
                return { ...p, storage_path: await blobToDataUrl(blob) };
              } catch {
                return {
                  ...p,
                  storage_path: storageApi.publicUrl(STORAGE_BUCKETS.answerPhotos, p.storage_path),
                };
              }
            }),
          );
        }),
      );
      // Resolve attached certificates
      const attachedCerts: Array<Certificate & { file_data_url?: string }> = [];
      for (const type of requiredCertTypes) {
        const id = selectedCerts[type];
        if (!id) continue;
        const cert = certs.find(c => c.id === id);
        if (!cert) continue;
        let fileDataUrl: string | undefined;
        if (cert.file_url) {
          try {
            const blob = await storageApi.download(STORAGE_BUCKETS.certificates, cert.file_url);
            fileDataUrl = await blobToDataUrl(blob);
          } catch {
            fileDataUrl = storageApi.publicUrl(STORAGE_BUCKETS.certificates, cert.file_url);
          }
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
      <Stack.Screen options={{ headerShown: true, title: 'შეჯამება და PDF' }} />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
          <Card>
            <Text style={styles.cardLabel}>შეჯამება</Text>
            <Text style={{ fontSize: 17, fontWeight: '700', color: theme.colors.ink, marginTop: 6 }}>
              {template?.name ?? 'კითხვარი'}
            </Text>
            {project ? (
              <Text style={{ color: theme.colors.inkSoft, fontSize: 12, marginTop: 2 }}>
                {project.name}
              </Text>
            ) : null}
            <View style={{ height: 10 }} />
            <Text style={styles.cardLabel}>დასკვნა</Text>
            <Text style={{ color: theme.colors.ink, marginTop: 4 }}>
              {questionnaire?.conclusion_text || '—'}
            </Text>
            <View style={{ height: 10 }} />
            <Text
              style={{
                fontWeight: '700',
                color: questionnaire?.is_safe_for_use === false ? theme.colors.danger : theme.colors.accent,
              }}
            >
              {questionnaire?.is_safe_for_use === false
                ? '✗ არ არის უსაფრთხო ექსპლუატაციისთვის'
                : '✓ უსაფრთხოა ექსპლუატაციისთვის'}
            </Text>
            <View style={{ height: 10 }} />
            <View style={{ flexDirection: 'row', gap: 14 }}>
              <Text style={{ fontSize: 12, color: theme.colors.inkSoft }}>
                პასუხი: <Text style={{ fontWeight: '700', color: theme.colors.ink }}>{answers.length}</Text>
              </Text>
              <Text style={{ fontSize: 12, color: theme.colors.inkSoft }}>
                ფოტო:{' '}
                <Text style={{ fontWeight: '700', color: theme.colors.ink }}>
                  {Object.values(photosByAnswer).reduce((n, arr) => n + arr.length, 0)}
                </Text>
              </Text>
            </View>
          </Card>

          {/* Signatures */}
          <Card>
            <Text style={styles.cardLabel}>ხელმოწერები</Text>
            <View style={{ gap: 10, marginTop: 10 }}>
              {requiredRoles.map(role => {
                const sig = existingSigs.find(s => s.signer_role === role);
                const img = sigImages[role];
                return (
                  <View key={role} style={styles.roleRow}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ fontWeight: '600', color: theme.colors.ink }}>
                        {SIGNER_ROLE_LABEL[role]}
                      </Text>
                      {sig ? (
                        <Text style={{ fontSize: 11, color: theme.colors.inkSoft }}>
                          {sig.full_name}
                        </Text>
                      ) : null}
                      {img ? (
                        <View style={styles.sigPreview}>
                          <Image
                            source={{ uri: img }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="contain"
                          />
                        </View>
                      ) : null}
                    </View>
                    <View style={{ gap: 6 }}>
                      <Button
                        title={sig ? 'ცვლა' : 'მოწერა'}
                        variant={sig ? 'secondary' : 'primary'}
                        onPress={() => pickSignerForRole(role)}
                      />
                      {sig ? (
                        <Pressable onPress={() => removeSignature(role)} hitSlop={8}>
                          <Text
                            style={{
                              color: theme.colors.danger,
                              fontSize: 11,
                              fontWeight: '600',
                              textAlign: 'center',
                              paddingVertical: 4,
                            }}
                          >
                            წაშლა
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>

          {/* Certificates */}
          {requiredCertTypes.length > 0 ? (
            <Card>
              <Text style={styles.cardLabel}>სერტიფიკატები</Text>
              <View style={{ gap: 10, marginTop: 10 }}>
                {requiredCertTypes.map(type => {
                  const selectedId = selectedCerts[type];
                  const selected = selectedId ? certs.find(c => c.id === selectedId) : null;
                  return (
                    <Pressable key={type} onPress={() => pickCert(type)} style={styles.roleRow}>
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

          <Button title="PDF-ის დაგენერირება" onPress={generate} loading={busy} />
        </ScrollView>
      </SafeAreaView>

      <SignatureCaptureModal
        capture={capture}
        onCancel={() => setCapture(null)}
        onDone={onCaptured}
      />
    </Screen>
  );
}

function SignatureCaptureModal({
  capture,
  onCancel,
  onDone,
}: {
  capture: { role: SignerRole; presetName: string } | null;
  onCancel: () => void;
  onDone: (role: SignerRole, base64Png: string, fullName: string) => void;
}) {
  const [fullName, setFullName] = useState('');
  const ref = useRef<SignatureViewRef>(null);

  // Reset name when capture opens
  useMemo(() => {
    if (capture) setFullName(capture.presetName);
  }, [capture?.role, capture?.presetName]);

  const handleOK = (sig: string) => {
    if (!capture) return;
    onDone(capture.role, sig, fullName.trim() || capture.presetName);
    setFullName('');
  };

  const handleSave = () => ref.current?.readSignature();
  const handleClear = () => ref.current?.clearSignature();

  const webStyle = `
    .m-signature-pad { box-shadow: none; border: none; background: #fff; margin: 0; }
    .m-signature-pad--body { border: 1px solid #E8E1D4; }
    .m-signature-pad--footer { display: none; }
    body, html { background: #fff; margin: 0; }
  `;

  return (
    <Modal visible={capture !== null} animationType="slide" transparent onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.ink, flex: 1 }}>
              {capture ? SIGNER_ROLE_LABEL[capture.role] : ''}
            </Text>
            <Pressable onPress={onCancel} hitSlop={10}>
              <Ionicons name="close" size={22} color={theme.colors.inkSoft} />
            </Pressable>
          </View>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="სახელი გვარი"
            placeholderTextColor={theme.colors.inkFaint}
            style={styles.nameInput}
          />
          <View style={styles.canvasBox}>
            <SignatureScreen
              ref={ref}
              onOK={handleOK}
              webStyle={webStyle}
              descriptionText=""
              autoClear={false}
              imageType="image/png"
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="გასუფთავება" variant="secondary" style={{ flex: 1 }} onPress={handleClear} />
            <Button title="შენახვა" style={{ flex: 1.4 }} onPress={handleSave} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

const styles = StyleSheet.create({
  cardLabel: {
    fontSize: 11,
    color: theme.colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: theme.colors.subtleSurface,
    borderRadius: 12,
  },
  sigPreview: {
    marginTop: 8,
    height: 52,
    width: 160,
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    overflow: 'hidden',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameInput: {
    backgroundColor: theme.colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    padding: 12,
    fontSize: 15,
    color: theme.colors.ink,
  },
  canvasBox: {
    height: 260,
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.hairline,
  },
});
