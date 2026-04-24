// Generate a certificate (PDF) from an existing completed inspection.
//
// Reached from:
//   - the inspection-done fork screen (`/inspections/[id]/done` → "generate"),
//   - the inspection detail screen (`/inspections/[id]` → "ახალი სერტიფიკატი").
//
// Loads the inspection + everything needed to render the PDF, lets the
// inspector pick which professional qualifications to attach, then renders
// via `buildPdfHtml` → uploads to the `pdfs` bucket → inserts a
// `certificates` row → shares via OS share sheet.
//
// Signing is explicitly out of scope — we read whatever signature rows were
// already captured in the signing step. Re-signing would be a separate flow.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Button, Card, Screen } from '../../components/ui';
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
import { getStorageImageDataUrl } from '../../lib/imageUrl';
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
  Template,
} from '../../types/models';

export default function GenerateCertificateScreen() {
  const params = useLocalSearchParams<{ inspectionId?: string }>();
  const inspectionId = params.inspectionId ?? null;
  const router = useRouter();
  const toast = useToast();
  const { showActionSheetWithOptions } = useActionSheet();
  const { state } = useSession();
  const user = state.status === 'signedIn' ? state.user : null;

  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [signatures, setSignatures] = useState<SignatureRecord[]>([]);
  const [quals, setQuals] = useState<Qualification[]>([]);
  // qualification-type → selected qualification id; defaults to first match
  // per required type when the screen opens.
  const [selectedQuals, setSelectedQuals] = useState<Record<string, string>>({});
  const [photosByAnswer, setPhotosByAnswer] = useState<Record<string, AnswerPhoto[]>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

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
      const [proj, qs, ans, sigs, qualsList] = await Promise.all([
        projectsApi.getById(insp.project_id).catch(() => null),
        tpl ? templatesApi.questions(tpl.id).catch(() => [] as Question[]) : Promise.resolve([] as Question[]),
        answersApi.list(insp.id).catch(() => []),
        signaturesApi.list(insp.id).catch(() => []),
        qualificationsApi.list().catch(() => []),
      ]);
      setProject(proj);
      setQuestions(qs);
      setAnswers(ans);
      setSignatures(sigs);
      setQuals(qualsList);

      // Preselect the first available (non-expired) qual for each required
      // type, matching today's behavior from the signing screen.
      const initial: Record<string, string> = {};
      for (const t of tpl?.required_qualifications ?? []) {
        const first = qualsList.find(q => q.type === t);
        if (first) initial[t] = first.id;
      }
      setSelectedQuals(initial);

      // Fetch photos for each answer that has any.
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

  const requiredCertTypes = template?.required_qualifications ?? [];

  const pickQual = (certType: string) => {
    const matches = quals.filter(q => q.type === certType);
    if (matches.length === 0) {
      showActionSheetWithOptions(
        { title: 'კვალიფიკაცია არ არის', options: ['ატვირთვა', 'გაუქმება'], cancelButtonIndex: 1 },
        idx => {
          if (idx === 0) router.push('/qualifications/new' as any);
        },
      );
      return;
    }
    const options = matches.map(m => `${m.type}${m.number ? ` · ${m.number}` : ''}`);
    options.push('გაუქმება');
    showActionSheetWithOptions(
      { title: certType, options, cancelButtonIndex: options.length - 1 },
      idx => {
        if (idx == null || idx === options.length - 1) return;
        setSelectedQuals(prev => ({ ...prev, [certType]: matches[idx].id }));
      },
    );
  };

  const missingQualTypes = useMemo(() => {
    return requiredCertTypes.filter(t => !selectedQuals[t]);
  }, [requiredCertTypes, selectedQuals]);

  const generate = async () => {
    if (!inspection || !template || !project) return;
    if (missingQualTypes.length > 0) {
      Alert.alert(
        'აკლია კვალიფიკაცია',
        `მიუთითე კვალიფიკაციის სერტიფიკატი: ${missingQualTypes.join(', ')}`,
      );
      return;
    }
    setBusy(true);
    try {
      // Inline the expert's saved signature so the PDF has an image path
      // even for the implicit expert row (matches pre-0006 behavior).
      const expertFromDb = signatures.find(s => s.signer_role === 'expert');
      const expertDataUrl = user?.saved_signature_url
        ? await getStorageImageDataUrl(STORAGE_BUCKETS.signatures, user.saved_signature_url)
        : null;
      const expertName = user ? `${user.first_name} ${user.last_name}`.trim() : 'ექსპერტი';
      const expertRec: SignatureRecord = expertFromDb
        ? {
            ...expertFromDb,
            signature_png_url: expertFromDb.signature_png_url
              ? await getStorageImageDataUrl(STORAGE_BUCKETS.signatures, expertFromDb.signature_png_url)
              : expertDataUrl,
          }
        : {
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

      // Inline other signatures' images as data URLs so the WebView render
      // doesn't fire off fresh Supabase requests for each.
      const otherSigs = await Promise.all(
        signatures
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

      // Inline photos.
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

      // Attach the user-picked qualifications.
      const attachedQuals: Array<Qualification & { file_data_url?: string }> = [];
      for (const t of requiredCertTypes) {
        const id = selectedQuals[t];
        if (!id) continue;
        const qual = quals.find(q => q.id === id);
        if (!qual) continue;
        let fileDataUrl: string | undefined;
        if (qual.file_url) {
          fileDataUrl = await getStorageImageDataUrl(
            STORAGE_BUCKETS.certificates,
            qual.file_url,
          );
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
      // Unique filename per certificate — an inspection can have many.
      const fileName = `${inspection.id}-${Date.now()}.pdf`;
      const blob = await (await fetch(uri)).blob();
      await storageApi.upload(STORAGE_BUCKETS.pdfs, fileName, blob, 'application/pdf');
      await certificatesApi.create({
        inspectionId: inspection.id,
        templateId: inspection.template_id,
        pdfUrl: fileName,
        isSafeForUse: inspection.is_safe_for_use,
        conclusionText: inspection.conclusion_text,
      });
      toast.success('PDF რეპორტი შეიქმნა');
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      }
      // Land on the inspection detail so the user can see their new cert
      // in the list, download again, etc.
      router.replace(`/inspections/${inspection.id}` as any);
    } catch (e: any) {
      toast.error(e?.message ?? 'გენერაცია ვერ მოხერხდა');
    } finally {
      setBusy(false);
    }
  };

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

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'PDF რეპორტის გენერაცია' }} />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 14 }}>
          <Card>
            <Text style={styles.eyebrow}>ინსპექცია</Text>
            <Text style={styles.inspTitle}>{template.name}</Text>
            {project ? <Text style={styles.inspMeta}>{project.name}</Text> : null}
            <Text style={styles.inspMeta}>
              {new Date(inspection.completed_at ?? inspection.created_at).toLocaleString('ka')}
            </Text>
            <Text style={{ marginTop: 10, color: theme.colors.ink }} numberOfLines={3}>
              {inspection.conclusion_text || '—'}
            </Text>
          </Card>

          {requiredCertTypes.length > 0 ? (
            <Card>
              <Text style={styles.eyebrow}>კვალიფიკაციის სერტიფიკატები</Text>
              <View style={{ gap: 10, marginTop: 10 }}>
                {requiredCertTypes.map(t => {
                  const selectedId = selectedQuals[t];
                  const selected = selectedId ? quals.find(c => c.id === selectedId) : null;
                  return (
                    <Pressable key={t} onPress={() => pickQual(t)} style={styles.qualRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.qualTitle}>{t}</Text>
                        <Text style={styles.qualMeta}>
                          {selected
                            ? selected.number ? `№ ${selected.number}` : 'არჩეული'
                            : 'ჯერ არ არის არჩეული'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
                    </Pressable>
                  );
                })}
              </View>
            </Card>
          ) : null}

          <Button
            title={busy ? 'მიმდინარეობს…' : 'PDF-ის გენერაცია'}
            onPress={generate}
            loading={busy}
            disabled={busy || missingQualTypes.length > 0}
          />
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

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
  qualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: theme.colors.subtleSurface,
    borderRadius: 10,
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
});
