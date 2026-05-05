// Inspection result screen.
//
// Live PDF preview as the main content (full-screen WebView). Three buttons
// in the bottom bar:
//   - სერტიფიკატები: opens CertificatesActionSheet
//   - ხელმოწერები (n/m):  opens SignaturesActionSheet
//   - გადმოწერა:        renders the same HTML through expo-print and shares
//
// The preview is regenerated whenever a sheet saves a change, so the inspector
// always sees the current state of the PDF.

import { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import WebView from 'react-native-webview';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { Button, Screen } from '../../components/ui';
import { ErrorState } from '../../components/ErrorState';
import { CertificatesActionSheet } from '../../components/CertificatesActionSheet';
import { SignaturesActionSheet } from '../../components/SignaturesActionSheet';
import { useBottomSheet } from '../../components/BottomSheet';
import {
  answersApi,
  inspectionAttachmentsApi,
  inspectionsApi,
  projectsApi,
  signaturesApi,
  templatesApi,
} from '../../lib/services';
import {
  useInspection,
  useProject,
  useTemplate,
  useTemplateQuestions,
  useInspectionAnswers,
  useSignatures,
} from '../../lib/apiHooks';
import { buildPdfHtml, buildPdfPreviewHtml, type PdfAttachment } from '../../lib/pdf';
import { generateAndSharePdf, PdfLimitReachedError } from '../../lib/pdfOpen';
import { generatePdfName } from '../../lib/pdfName';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import {
  signatureAsDataUrl,
  pdfPhotoEmbed,
} from '../../lib/imageUrl';
import { useSession } from '../../lib/session';
import { useToast } from '../../lib/toast';
import { friendlyError } from '../../lib/errorMap';
import { PaywallModal } from '../../components/PaywallModal';
import { usePdfUsage, useInvalidatePdfUsage } from '../../lib/usePdfUsage';
import { toErrorMessage } from '../../lib/logError';
import { haptic } from '../../lib/haptics';
import { useTheme } from '../../lib/theme';
import type {
  Answer,
  AnswerPhoto,
  Inspection,
  InspectionAttachment,
  Project,
  Question,
  SignatureRecord,
  Template,
} from '../../types/models';

export default function InspectionResultScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const session = useSession();
  const showSheet = useBottomSheet();

  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [signatures, setSignatures] = useState<SignatureRecord[]>([]);
  const [photosByAnswer, setPhotosByAnswer] = useState<Record<string, AnswerPhoto[]>>({});
  const [attachments, setAttachments] = useState<InspectionAttachment[]>([]);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [notFound, setNotFound] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const { data: pdfUsage } = usePdfUsage();
  const invalidatePdfUsage = useInvalidatePdfUsage();

  // React Query hooks seed cached data instantly so skeletons disappear faster.
  // loadAll() below still runs on mount for nested photo / attachment data.
  const inspectionQ = useInspection(id);
  const projectQ = useProject(inspection?.project_id);
  const templateQ = useTemplate(inspection?.template_id);
  const questionsQ = useTemplateQuestions(inspection?.template_id);
  const answersQ = useInspectionAnswers(id);
  const signaturesQ = useSignatures(id);

  useEffect(() => { if (inspectionQ.data !== undefined) setInspection(inspectionQ.data); }, [inspectionQ.data]);
  useEffect(() => { if (projectQ.data !== undefined) setProject(projectQ.data); }, [projectQ.data]);
  useEffect(() => { if (templateQ.data !== undefined) setTemplate(templateQ.data); }, [templateQ.data]);
  useEffect(() => { if (questionsQ.data !== undefined) setQuestions(questionsQ.data); }, [questionsQ.data]);
  useEffect(() => { if (answersQ.data !== undefined) setAnswers(answersQ.data); }, [answersQ.data]);
  useEffect(() => { if (signaturesQ.data !== undefined) setSignatures(signaturesQ.data); }, [signaturesQ.data]);

  const loadAll = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    setNotFound(false);
    try {
      const insp = await inspectionsApi.getById(id);
      if (!insp) {
        setNotFound(true);
        return;
      }
      setInspection(insp);
      if (insp.status === 'draft') {
        const tpl = await templatesApi.getById(insp.template_id).catch(() => null);
        if (tpl?.category === 'bobcat') {
          router.replace(`/inspections/bobcat/${insp.id}` as any);
        } else if (tpl?.category === 'excavator') {
          router.replace(`/inspections/excavator/${insp.id}` as any);
        } else if (tpl?.category === 'general_equipment') {
          router.replace(`/inspections/general-equipment/${insp.id}` as any);
        } else {
          router.replace(`/inspections/${insp.id}/wizard` as any);
        }
        return;
      }
      const [tpl, proj, sigs, atts] = await Promise.all([
        templatesApi.getById(insp.template_id).catch(() => null),
        projectsApi.getById(insp.project_id).catch(() => null),
        signaturesApi.list(insp.id).catch(() => [] as SignatureRecord[]),
        inspectionAttachmentsApi
          .listByInspection(insp.id)
          .catch(() => [] as InspectionAttachment[]),
      ]);
      setTemplate(tpl);
      setProject(proj);
      setSignatures(sigs);
      setAttachments(atts);
      if (tpl) {
        const [qs, ans] = await Promise.all([
          templatesApi.questions(tpl.id).catch(() => [] as Question[]),
          answersApi.list(insp.id).catch(() => [] as Answer[]),
        ]);
        setQuestions(qs);
        setAnswers(ans);
        if (ans.length > 0) {
          const photoMap = await answersApi
            .photosByAnswerIds(ans.map(a => a.id))
            .catch(() => ({} as Record<string, AnswerPhoto[]>));
          setPhotosByAnswer(photoMap);
        }
      }
    } catch (e) {
      setLoadError(e);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  // Load on mount only — useFocusEffect was re-hammering Supabase on every
  // back-navigation. Cached data from the hooks above renders instantly;
  // loadAll() fills in nested photo / attachment data on first paint.
  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const buildPreview = useCallback(
    async (
      currentSignatures: SignatureRecord[],
      currentAttachments: InspectionAttachment[],
    ) => {
      if (!inspection || !template || !project) return;
      setPreviewBusy(true);
      setPreviewError(null);
      try {
        // Photos → resized data URLs (raw paths can't be reached from WebView).
        const photosEmbedded: Record<string, AnswerPhoto[]> = {};
        await Promise.all(
          Object.entries(photosByAnswer).map(async ([answerId, photos]) => {
            photosEmbedded[answerId] = await Promise.all(
              photos.map(async p => {
                if (p.storage_path.startsWith('data:') || p.storage_path.startsWith('file:')) return p;
                try {
                  const dataUrl = await pdfPhotoEmbed(
                    STORAGE_BUCKETS.answerPhotos,
                    p.storage_path,
                  );
                  return { ...p, storage_path: dataUrl };
                } catch {
                  return p;
                }
              }),
            );
          }),
        );

        // Signatures → data URLs.
        const sigsEmbedded = await Promise.all(
          currentSignatures.map(async sig => {
            if (!sig.signature_png_url || sig.signature_png_url.startsWith('data:')) return sig;
            try {
              const dataUrl = await signatureAsDataUrl(
                STORAGE_BUCKETS.signatures,
                sig.signature_png_url,
              );
              return { ...sig, signature_png_url: dataUrl };
            } catch {
              return sig;
            }
          }),
        );

        // Attachments → data URLs for cert photos.
        const attsEmbedded: PdfAttachment[] = await Promise.all(
          currentAttachments.map(async a => {
            if (!a.photo_path) return { ...a };
            if (a.photo_path.startsWith('data:') || a.photo_path.startsWith('file:')) {
              return { ...a, photo_data_url: a.photo_path };
            }
            try {
              const dataUrl = await pdfPhotoEmbed(
                STORAGE_BUCKETS.certificates,
                a.photo_path,
              );
              return { ...a, photo_data_url: dataUrl };
            } catch {
              return { ...a };
            }
          }),
        );

        const html = await buildPdfPreviewHtml({
          questionnaire: inspection,
          template,
          project,
          questions,
          answers,
          signatures: sigsEmbedded,
          photosByAnswer: photosEmbedded,
          attachments: attsEmbedded,
        });
        setPreviewHtml(html);
      } catch (e) {
        const msg = toErrorMessage(e);
        console.error('[inspection.preview] buildPdfPreviewHtml failed:', msg, e);
        setPreviewError(msg || 'პრევიუ ვერ აიწყო');
      } finally {
        setPreviewBusy(false);
      }
    },
    [inspection, template, project, questions, answers, photosByAnswer],
  );

  // Initial preview build whenever core data is loaded. Subsequent rebuilds
  // are triggered explicitly when sheets save changes.
  useEffect(() => {
    if (loading || !inspection || !template || !project) return;
    void buildPreview(signatures, attachments);
    // Intentional: don't refire on signatures/attachments changing — the
    // sheet onChanged handler does that with fresh data so we avoid races
    // with stale state still in the closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, inspection, template, project, questions, answers, photosByAnswer]);

  const refreshAfterSheetSave = useCallback(async () => {
    if (!inspection) return;
    const [sigs, atts] = await Promise.all([
      signaturesApi.list(inspection.id).catch(() => signatures),
      inspectionAttachmentsApi.listByInspection(inspection.id).catch(() => attachments),
    ]);
    setSignatures(sigs);
    setAttachments(atts);
    await buildPreview(sigs, atts);
  }, [inspection, signatures, attachments, buildPreview]);

  const openCertificatesSheet = useCallback(() => {
    if (!inspection) return;
    showSheet({
      content: ({ dismiss }) => (
        <CertificatesActionSheet
          inspectionId={inspection.id}
          onClose={dismiss}
          onChanged={() => void refreshAfterSheetSave()}
        />
      ),
    });
  }, [inspection, showSheet, refreshAfterSheetSave]);

  const openSignaturesSheet = useCallback(() => {
    if (!inspection || !template) return;
    showSheet({
      content: ({ dismiss }) => (
        <SignaturesActionSheet
          inspectionId={inspection.id}
          requiredRoles={template.required_signer_roles ?? []}
          onClose={dismiss}
          onChanged={() => void refreshAfterSheetSave()}
        />
      ),
    });
  }, [inspection, template, showSheet, refreshAfterSheetSave]);

  const downloadPdf = useCallback(async () => {
    if (!inspection || !template || !project || downloading) return;
    if (pdfUsage?.isLocked) { setPaywallVisible(true); return; }
    setDownloading(true);
    try {
      // Re-embed everything fresh — signatures or attachments may have been
      // edited since the preview was last built.
      const photosEmbedded: Record<string, AnswerPhoto[]> = {};
      await Promise.all(
        Object.entries(photosByAnswer).map(async ([answerId, photos]) => {
          photosEmbedded[answerId] = await Promise.all(
            photos.map(async p => {
              if (p.storage_path.startsWith('data:') || p.storage_path.startsWith('file:')) return p;
              try {
                const dataUrl = await pdfPhotoEmbed(
                  STORAGE_BUCKETS.answerPhotos,
                  p.storage_path,
                );
                return { ...p, storage_path: dataUrl };
              } catch {
                return p;
              }
            }),
          );
        }),
      );
      const sigsEmbedded = await Promise.all(
        signatures.map(async sig => {
          if (!sig.signature_png_url || sig.signature_png_url.startsWith('data:')) return sig;
          try {
            const dataUrl = await signatureAsDataUrl(
              STORAGE_BUCKETS.signatures,
              sig.signature_png_url,
            );
            return { ...sig, signature_png_url: dataUrl };
          } catch {
            return sig;
          }
        }),
      );
      const attsEmbedded: PdfAttachment[] = await Promise.all(
        attachments.map(async a => {
          if (!a.photo_path) return { ...a };
          if (a.photo_path.startsWith('data:') || a.photo_path.startsWith('file:')) {
            return { ...a, photo_data_url: a.photo_path };
          }
          try {
            const dataUrl = await pdfPhotoEmbed(
              STORAGE_BUCKETS.certificates,
              a.photo_path,
            );
            return { ...a, photo_data_url: dataUrl };
          } catch {
            return { ...a };
          }
        }),
      );

      const html = await buildPdfHtml({
        questionnaire: inspection,
        template,
        project,
        questions,
        answers,
        signatures: sigsEmbedded,
        photosByAnswer: photosEmbedded,
        attachments: attsEmbedded,
      });

      const filename = generatePdfName(
        project.company_name || project.name,
        template.category === 'harness' ? 'aprzhilebis_shemowmeba' : 'kharachos_shemowmeba',
        new Date(inspection.created_at),
        inspection.id,
      );
      const userId = session.state.status === 'signedIn' ? session.state.session.user.id : undefined;
      // pdfOpen wraps expo-print in its own 30s timeout, but keep an outer
      // race here too as belt-and-braces against UI freezes.
      const pdfPromise = generateAndSharePdf(html, filename, false, userId);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('PDF გენერირება ძალიან დიდხანს გრძელდება — სცადე თავიდან')), 30_000),
      );
      await Promise.race([pdfPromise, timeoutPromise]);
      haptic.success();
      invalidatePdfUsage();
    } catch (e) {
      if (e instanceof PdfLimitReachedError) { setPaywallVisible(true); return; }
      toast.error(friendlyError(e, 'PDF-ის გენერირება ვერ მოხერხდა'));
    } finally {
      setDownloading(false);
    }
  }, [
    inspection,
    template,
    project,
    questions,
    answers,
    signatures,
    attachments,
    photosByAnswer,
    downloading,
    toast,
    pdfUsage,
    invalidatePdfUsage,
  ]);

  if (!loading && (notFound || loadError)) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'შემოწმების აქტი' }} />
        <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
          <ErrorState
            title={notFound ? 'შემოწმების აქტი ვერ მოიძებნა' : 'ვერ ჩაიტვირთა'}
            error={loadError ?? undefined}
            message={notFound ? 'შესაძლოა წაიშალა, ან თქვენ არ გაქვთ წვდომა.' : undefined}
            icon={notFound ? 'alert-circle-outline' : 'cloud-offline-outline'}
            onRetry={notFound ? undefined : () => void loadAll()}
            retrying={loading}
          />
          <View style={{ padding: 16 }}>
            <Button
              title="მთავარ გვერდზე"
              variant="ghost"
              onPress={() => router.replace('/(tabs)/home' as any)}
            />
          </View>
        </SafeAreaView>
      </Screen>
    );
  }

  const signedCount = signatures.filter(s => s.status === 'signed' && !!s.signature_png_url).length;
  const requiredRoles = template?.required_signer_roles ?? [];
  const totalSlots = Math.max(requiredRoles.length, signatures.length);

  const certBadge = attachments.length > 0 ? `(${attachments.length})` : '';
  const sigBadge = totalSlots > 0 ? `(${signedCount}/${totalSlots})` : '';

  return (
    <Screen edgeToEdge>
      <Stack.Screen
        options={{
          headerShown: true,
          title: template?.name ?? 'შემოწმების აქტი',
          headerBackTitle: 'უკან',
        }}
      />
      <View style={styles.previewWrap}>
        {previewBusy && !previewHtml ? (
          <View style={styles.previewState}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
            <Text style={{ color: theme.colors.inkSoft, marginTop: 12 }}>პრევიუ იტვირთება…</Text>
          </View>
        ) : previewError && !previewHtml ? (
          <View style={styles.previewState}>
            <Ionicons name="alert-circle" size={36} color={theme.colors.danger} />
            <Text style={{ color: theme.colors.danger, textAlign: 'center', marginTop: 12 }}>
              {previewError}
            </Text>
          </View>
        ) : previewHtml ? (
          Platform.OS === 'web'
            ? createElement('iframe', {
                srcDoc: previewHtml,
                style: { flex: 1, width: '100%', height: '100%', border: 'none' },
              })
            : (
              <WebView
                key={previewHtml.length /* force remount on new HTML */}
                originWhitelist={['*']}
                source={{ html: previewHtml }}
                style={styles.webview}
                scalesPageToFit
                javaScriptEnabled={false}
                domStorageEnabled={false}
              />
            )
        ) : null}
      </View>

      <SafeAreaView edges={['bottom']} style={styles.bottomBarSafe}>
        <View style={styles.bottomBar}>
          <View style={styles.bottomBarRow}>
            <Pressable
              onPress={openCertificatesSheet}
              style={({ pressed }) => [styles.bottomBtn, styles.bottomBtnGhost, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="document-attach-outline" size={18} color={theme.colors.ink} />
              <Text style={styles.bottomBtnText} numberOfLines={1}>
                სერტ. {certBadge}
              </Text>
            </Pressable>
            <Pressable
              onPress={openSignaturesSheet}
              style={({ pressed }) => [styles.bottomBtn, styles.bottomBtnGhost, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="create-outline" size={18} color={theme.colors.ink} />
              <Text style={styles.bottomBtnText} numberOfLines={1}>
                ხელმ. {sigBadge}
              </Text>
            </Pressable>
          </View>
          <Pressable
            onPress={downloadPdf}
            disabled={downloading}
            style={({ pressed }) => [
              styles.bottomBtn,
              styles.bottomBtnPrimary,
              styles.bottomBtnFull,
              pressed && { opacity: 0.85 },
              downloading && { opacity: 0.6 },
            ]}
          >
            {downloading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name={pdfUsage?.isLocked ? 'lock-closed-outline' : 'share-outline'} size={18} color="#fff" />
                <Text style={[styles.bottomBtnText, { color: '#fff' }]} numberOfLines={1}>
                  {pdfUsage?.isLocked ? '🔒 გადმოწერა' : 'გადმოწერა'}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
      <PaywallModal visible={paywallVisible} onClose={() => setPaywallVisible(false)} />
    </Screen>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    previewWrap: {
      flex: 1,
      backgroundColor: theme.colors.subtleSurface,
    },
    previewState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    webview: {
      flex: 1,
      backgroundColor: '#fff',
    },
    bottomBarSafe: {
      backgroundColor: theme.colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.hairline,
    },
    bottomBar: {
      flexDirection: 'column',
      gap: 8,
      paddingHorizontal: 24,
      paddingTop: 8,
      paddingBottom: 8,
    },
    bottomBarRow: {
      flexDirection: 'row',
      gap: 8,
    },
    bottomBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 44,
      borderRadius: 10,
    },
    bottomBtnGhost: {
      borderWidth: 1,
      borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.surface,
    },
    bottomBtnPrimary: {
      backgroundColor: theme.colors.accent,
    },
    bottomBtnFull: {
      flex: 0,
    },
    bottomBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.ink,
    },
  });
}
