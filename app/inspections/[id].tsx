// Inspection result screen.
//
// Live PDF preview as the main content (full-screen WebView). Three buttons
// in the bottom bar:
//   - სერტიფიკატები: opens CertificatesActionSheet
//   - ხელმოწერები (n/m):  opens SignatureSheet (ephemeral, no DB)
//   - გადმოწერა:        renders the same HTML through expo-print and shares
//
// The preview is regenerated whenever a sheet saves a change, so the inspector
// always sees the current state of the PDF.

import { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useBottomSheet } from '../../components/BottomSheet';
import {
  answersApi,
  inspectionAttachmentsApi,
  inspectionsApi,
  projectsApi,
  templatesApi,
} from '../../lib/services';
import {
  useInspection,
  useProject,
  useTemplate,
  useTemplateQuestions,
  useInspectionAnswers,
} from '../../lib/apiHooks';
import { buildPdfHtml, buildPdfPreviewHtml, type PdfAttachment } from '../../lib/pdf';
import { generateAndSharePdf, PdfLimitReachedError } from '../../lib/pdfOpen';
import { generatePdfName } from '../../lib/pdfName';
import { inspectionDisplayName } from '../../lib/shared/documentName';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import {
  pdfPhotoEmbed,
  imageForDisplay,
} from '../../lib/imageUrl';
import { useSession } from '../../lib/session';
import { useToast } from '../../lib/toast';
import { recordRedirect, isOscillating } from '../../lib/navigationGuard';
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
  const [redirectBlocked, setRedirectBlocked] = useState(false);
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const mountedRef = useRef(true);

  // React Query hooks seed cached data instantly so skeletons disappear faster.
  // loadAll() below still runs on mount for nested photo / attachment data.
  const inspectionQ = useInspection(id);
  const projectQ = useProject(inspection?.project_id);
  const templateQ = useTemplate(inspection?.template_id);
  const questionsQ = useTemplateQuestions(inspection?.template_id);
  const answersQ = useInspectionAnswers(id);

  useEffect(() => { if (inspectionQ.data !== undefined) setInspection(inspectionQ.data); }, [inspectionQ.data]);
  useEffect(() => { if (projectQ.data !== undefined) setProject(projectQ.data); }, [projectQ.data]);
  useEffect(() => { if (templateQ.data !== undefined) setTemplate(templateQ.data); }, [templateQ.data]);
  useEffect(() => { if (questionsQ.data !== undefined) setQuestions(questionsQ.data); }, [questionsQ.data]);
  useEffect(() => { if (answersQ.data !== undefined) setAnswers(answersQ.data); }, [answersQ.data]);

  const loadAll = useCallback(async () => {
    if (!id) {
      if (mountedRef.current) setLoading(false);
      return;
    }
    if (mountedRef.current) {
      setLoading(true);
      setLoadError(null);
      setNotFound(false);
    }
    try {
      const insp = await inspectionsApi.getById(id);
      if (!insp) {
        if (mountedRef.current) setNotFound(true);
        return;
      }
      if (mountedRef.current) setInspection(insp);
      if (insp.status === 'draft' && !redirectBlocked) {
        const tpl = await templatesApi.getById(insp.template_id).catch(() => null);
        const target =
          tpl?.category === 'bobcat' ? `bobcat/${insp.id}` :
          tpl?.category === 'excavator' ? `excavator/${insp.id}` :
          tpl?.category === 'general_equipment' ? `general-equipment/${insp.id}` :
          tpl?.category === 'cargo_platform' ? `cargo-platform/${insp.id}` :
          tpl?.category === 'harness' ? `harness/${insp.id}` :
          `${insp.id}/wizard`;
        if (isOscillating('detail', target)) {
          if (mountedRef.current) setRedirectBlocked(true);
          /* oscillation detected — blocking redirect */
        } else {
          recordRedirect('detail', target);
          router.replace(`/inspections/${target}` as any);
          return;
        }
      }
      const [tpl, proj, atts] = await Promise.all([
        templatesApi.getById(insp.template_id).catch(() => null),
        projectsApi.getById(insp.project_id).catch(() => null),
        inspectionAttachmentsApi
          .listByInspection(insp.id)
          .catch(() => [] as InspectionAttachment[]),
      ]);
      if (mountedRef.current) {
        setTemplate(tpl);
        setProject(proj);
        setAttachments(atts);
      }
      if (tpl && mountedRef.current) {
        const [qs, ans] = await Promise.all([
          templatesApi.questions(tpl.id).catch(() => [] as Question[]),
          answersApi.list(insp.id).catch(() => [] as Answer[]),
        ]);
        if (mountedRef.current) {
          setQuestions(qs);
          setAnswers(ans);
        }
        if (ans.length > 0 && mountedRef.current) {
          const photoMap = await answersApi
            .photosByAnswerIds(ans.map(a => a.id))
            .catch(() => ({} as Record<string, AnswerPhoto[]>));
          if (mountedRef.current) setPhotosByAnswer(photoMap);
        }
      }
    } catch (e) {
      if (mountedRef.current) setLoadError(e);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [id, router]);

  // Load on mount only — useFocusEffect was re-hammering Supabase on every
  // back-navigation. Cached data from the hooks above renders instantly;
  // loadAll() fills in nested photo / attachment data on first paint.
  useEffect(() => {
    mountedRef.current = true;
    void loadAll();
    return () => { mountedRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Navigation timeout guard: if loading takes >5 s, show recovery UI.
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setLoadTimedOut(true), 5000);
    return () => clearTimeout(t);
  }, [loading]);

  const buildPreview = useCallback(
    async (currentAttachments: InspectionAttachment[]) => {
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
            } catch (e) {
              console.warn(
                '[inspection.cert] embed failed, falling back to URL:',
                a.photo_path,
                toErrorMessage(e),
              );
              try {
                const url = await imageForDisplay(STORAGE_BUCKETS.certificates, a.photo_path);
                return { ...a, photo_data_url: url };
              } catch {
                return { ...a };
              }
            }
          }),
        );

        const html = await buildPdfPreviewHtml({
          questionnaire: inspection,
          template,
          project,
          questions,
          answers,
          signatures: [],
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
    if ((loading && !loadTimedOut) || !inspection || !template || !project) return;
    void buildPreview(attachments);
  }, [loading, loadTimedOut, inspection, template, project, questions, answers, photosByAnswer, attachments, buildPreview]);

  const refreshAfterSheetSave = useCallback(async () => {
    if (!inspection) return;
    const atts = await inspectionAttachmentsApi
      .listByInspection(inspection.id)
      .catch(() => attachments);
    setAttachments(atts);
    await buildPreview(atts);
  }, [inspection, attachments, buildPreview]);

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
          } catch (e) {
            console.warn(
              '[inspection.cert] embed failed, falling back to URL:',
              a.photo_path,
              toErrorMessage(e),
            );
            try {
              const url = await imageForDisplay(STORAGE_BUCKETS.certificates, a.photo_path);
              return { ...a, photo_data_url: url };
            } catch {
              return { ...a };
            }
          }
        }),
      );

      const html = await buildPdfHtml({
        questionnaire: inspection,
        template,
        project,
        questions,
        answers,
        signatures: [],
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
      const authorName = session.state.status === 'signedIn'
        ? `${session.state.user?.first_name ?? ''} ${session.state.user?.last_name ?? ''}`.trim()
        : '';
      // pdfOpen wraps expo-print in its own 30s timeout, but keep an outer
      // race here too as belt-and-braces against UI freezes.
      const pdfPromise = generateAndSharePdf(html, filename, false, userId, {
        title: template.name,
        author: authorName || undefined,
        documentId: inspection.id,
        subject: 'შრომის უსაფრთხოების შემოწმება',
      });
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

  const certBadge = attachments.length > 0 ? `(${attachments.length})` : '';

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: inspectionDisplayName(template?.name),
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

      <View style={styles.bottomBarSafe}>
        <View style={styles.bottomBar}>
          <Pressable
            onPress={openCertificatesSheet}
            style={({ pressed }) => [styles.bottomBtn, styles.bottomBtnGhost, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="document-attach-outline" size={18} color={theme.colors.ink} />
            <Text style={styles.bottomBtnText} numberOfLines={1}>
              სერტიფიკატები {certBadge}
            </Text>
          </Pressable>
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
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <>
                <Ionicons name={pdfUsage?.isLocked ? 'lock-closed-outline' : 'share-outline'} size={18} color={theme.colors.white} />
                <Text style={[styles.bottomBtnText, { color: theme.colors.white }]} numberOfLines={1}>
                  {pdfUsage?.isLocked ? '🔒 გადმოწერა' : 'გადმოწერა'}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
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
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 16,
    },
    bottomBarRow: {
      flexDirection: 'row',
      gap: 10,
    },
    bottomBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 48,
      borderRadius: 12,
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
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.ink,
    },
  });
}
