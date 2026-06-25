// Incident details — reached by tapping a saved incident in a list. Renders
// DocumentDetails (type="incident"): description/cause/actions narrative,
// EDITABLE signatures (the expert's saved signature is auto-applied; blank rows
// can be added), NO certificates (the inspection_attachments table is
// inspection-scoped — see AGENTS.md). The post-save success screen is the
// separate /incidents/[id]/success route. Replaces the old detail page.
//
// REGULATORY: captured signatures live only in this screen's state and are never
// persisted — only the rendered PDF is uploaded (see features/signatures/AGENTS.md).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TriangleAlert } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { DocumentDetails, NoteBlocksContent, type DocumentInfoRow } from '../../components/document-details';
import { ErrorScreen } from '../../components/ErrorScreen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SkeletonListCard } from '../../components/Skeleton';
import { SubscriptionNotice } from '../../components/SubscriptionNotice';
import { useTheme } from '../../lib/theme';
import { useSession } from '../../lib/session';
import { useToast } from '../../lib/toast';
import { useSignaturesState } from '../../features/signatures';
import { useIncident, useProject, invalidateRecordLists } from '../../lib/apiHooks';
import { queryClient } from '../../lib/queryClient';
import { incidentsApi, storageApi } from '../../lib/services';
import { generateAndSharePdf, PdfLimitReachedError } from '../../lib/pdfOpen';
import { hashPdf } from '../../lib/pdfSecurity';
import { buildIncidentPdfHtml } from '../../lib/incidentPdf';
import { generatePdfName } from '../../lib/pdfName';
import { signatureAsDataUrl, pdfPhotoEmbed } from '../../lib/imageUrl';
import { queuePdfUpload, stagePdfForQueue } from '../../lib/pdfUploadQueue';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { usePdfUsage, useInvalidatePdfUsage } from '../../lib/usePdfUsage';
import { reopenDocument } from '../../lib/documents/reopen';
import { duplicateDocument } from '../../lib/documents/duplicate';
import { haptic } from '../../lib/haptics';
import { friendlyError } from '../../lib/errorMap';
import { logError } from '../../lib/logError';
import { formatShortDateTime } from '../../lib/formatDate';
import { shortCode } from '../../lib/shared/documentName';
import { INCIDENT_TYPE_FULL_LABEL, INCIDENT_TYPE_LABEL } from '../../types/models';
import * as FileSystem from 'expo-file-system/legacy';

export default function IncidentDetailScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const session = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: incident, isLoading } = useIncident(id);
  const { data: project } = useProject(incident?.project_id);

  const signatures = useSignaturesState();
  const [sharing, setSharing] = useState(false);
  const [limitNoticeVisible, setLimitNoticeVisible] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const { data: pdfUsage } = usePdfUsage();
  const invalidatePdfUsage = useInvalidatePdfUsage();

  const creatorName = useMemo(() => {
    if (session.state.status !== 'signedIn') return '';
    const u = session.state.user;
    return u
      ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()
      : session.state.session.user.email ?? '';
  }, [session.state]);

  // Auto-apply the expert's saved signature on entry (the user can re-sign via
  // the signature modal). Incidents are a separate signature basis from acts:
  // the captured base64 lives only in state; only the rendered PDF is uploaded.
  useEffect(() => {
    if (session.state.status !== 'signedIn') return;
    const sigPath = session.state.user?.saved_signature_url;
    if (!sigPath || signatures.creatorSignature) return;
    let cancelled = false;
    signatureAsDataUrl(STORAGE_BUCKETS.signatures, sigPath)
      .then((dataUrl) => {
        if (cancelled || !dataUrl) return;
        signatures.setCreatorSignature(dataUrl.replace(/^data:[^,]+,/, ''));
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.state.status]);

  const sharePdf = useCallback(async () => {
    if (!incident || !project) return;
    if (pdfUsage?.isLocked) { setLimitNoticeVisible(true); return; }
    setSharing(true);
    try {
      const creator = signatures.creatorSignature;
      const sigDataUrl = creator ? `data:image/png;base64,${creator.pngBase64}` : undefined;
      const photoDataUrls = await Promise.all(
        (incident.photos ?? []).map((p) =>
          pdfPhotoEmbed(STORAGE_BUCKETS.incidentPhotos, p).catch(() => ''),
        ),
      ).then((urls) => urls.filter(Boolean));

      const html = buildIncidentPdfHtml({
        incident,
        project,
        inspectorName: creatorName,
        inspectorSignatureDataUrl: sigDataUrl,
        additionalSignatureRows: signatures.additionalRows.length,
        photoDataUrls,
      });
      const docType = `ინციდენტი_${INCIDENT_TYPE_FULL_LABEL[incident.type]}`;
      const pdfName = generatePdfName(project.company_name || project.name, docType, new Date(incident.date_time), incident.id);
      const pdfPath = `incidents/${pdfName}`;
      const userId = session.state.status === 'signedIn' ? session.state.session.user.id : undefined;
      const localUri = await generateAndSharePdf(html, pdfName, true, userId, {
        title: INCIDENT_TYPE_FULL_LABEL[incident.type],
        author: creatorName || undefined,
        documentId: incident.id,
        subject: t('incidents.reportSubject'),
      });
      const pdfHash = localUri ? await hashPdf(localUri).catch(() => undefined) : undefined;
      invalidatePdfUsage();
      if (localUri) {
        (async () => {
          try {
            await storageApi.uploadFromUri(STORAGE_BUCKETS.pdfs, pdfPath, localUri, 'application/pdf');
            await incidentsApi.update(incident.id, {
              pdf_url: pdfPath,
              status: 'completed',
              ...(pdfHash ? { pdf_hash: pdfHash } : {}),
            });
            invalidateRecordLists(queryClient);
            FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
          } catch (e) {
            logError(e, 'incidentDetail.backgroundUpload');
            const stagedUri = await stagePdfForQueue(localUri, pdfName);
            await queuePdfUpload({
              localUri: stagedUri,
              bucket: STORAGE_BUCKETS.pdfs,
              path: pdfPath,
              contentType: 'application/pdf',
              dbOp: {
                kind: 'incident_update',
                payload: { incidentId: incident.id, pdf_url: pdfPath, status: 'completed', pdf_hash: pdfHash },
              },
            });
          }
        })();
      }
    } catch (e) {
      if (e instanceof PdfLimitReachedError) { setLimitNoticeVisible(true); return; }
      toast.error(friendlyError(e, t('incidents.pdfCreateFailed')));
    } finally {
      setSharing(false);
    }
  }, [incident, project, creatorName, signatures, pdfUsage, invalidatePdfUsage, session.state, toast, t]);

  const onEdit = useCallback(async () => {
    if (!incident || reopening) return;
    setReopening(true);
    try {
      haptic.medium();
      await reopenDocument({ kind: 'incident', id: incident.id }, queryClient);
      router.replace(`/incidents/new?editId=${incident.id}&projectId=${incident.project_id}` as any);
    } catch (e) {
      toast.error(friendlyError(e, t('common.error')));
      setReopening(false);
    }
  }, [incident, reopening, router, toast, t]);

  const onDuplicate = useCallback(async () => {
    if (!incident || duplicating) return;
    setDuplicating(true);
    try {
      haptic.medium();
      const { id: newId } = await duplicateDocument({ kind: 'incident', id: incident.id }, queryClient);
      toast.success(t('details.duplicate.done'));
      router.replace(`/incidents/new?editId=${newId}&projectId=${incident.project_id}` as any);
    } catch (e) {
      toast.error(friendlyError(e, t('details.duplicate.failed')));
      setDuplicating(false);
    }
  }, [incident, duplicating, router, toast, t]);

  const onDelete = useCallback(() => {
    if (!incident) return;
    Alert.alert(t('details.delete.title'), t('details.delete.confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await incidentsApi.remove(incident.id);
            invalidateRecordLists(queryClient);
            toast.success(t('notifications.deleted'));
            router.back();
          } catch (e) {
            toast.error(friendlyError(e, t('errors.deleteFailed')));
          }
        },
      },
    ]);
  }, [incident, router, toast, t]);

  if (!id) {
    return <ErrorScreen onGoHome={() => router.replace('/(tabs)/home')} onRetry={() => router.back()} />;
  }

  if (isLoading || !incident) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScreenHeader title={t('incidents.headerTitle')} />
        <View style={{ flex: 1, padding: 16 }}>
          <SkeletonListCard rows={5} />
        </View>
      </View>
    );
  }

  const isNearMiss = incident.type === 'nearmiss';
  const tone = incident.type === 'minor' || incident.type === 'nearmiss' ? 'muted' : 'severe';

  const info: DocumentInfoRow[] = [
    { label: t('details.info.project'), value: project ? (project.company_name || project.name) : '—' },
    { label: t('details.info.location'), value: incident.location || '—' },
    { label: t('details.info.date'), value: formatShortDateTime(incident.date_time) },
  ];
  if (!isNearMiss && incident.injured_name) {
    info.push({ label: t('details.info.injured'), value: incident.injured_name });
  }
  if (!isNearMiss && incident.injured_role) {
    info.push({ label: t('details.info.role'), value: incident.injured_role });
  }
  info.push({ label: t('details.info.expert'), value: creatorName || '—' });
  info.push({ label: t('details.info.code'), value: shortCode(incident.id) });

  const blocks = [
    { text: incident.description ?? '' },
    { label: t('incidents.sectionCause'), text: incident.cause ?? '' },
    { label: t('incidents.sectionActions'), text: incident.actions_taken ?? '' },
    {
      label: t('details.info.witnesses'),
      text: (incident.witnesses ?? []).join(', '),
    },
  ];

  return (
    <>
      <DocumentDetails
        type="incident"
        tileIcon={TriangleAlert}
        title={INCIDENT_TYPE_FULL_LABEL[incident.type] ?? incident.type}
        typeLabel={t('details.type.incident')}
        status={{ tone, label: INCIDENT_TYPE_LABEL[incident.type] ?? incident.type }}
        info={info}
        contentLabel={t('details.content.incident')}
        contentTab={t('details.content.incident')}
        signatures={{ mode: 'edit', state: signatures, creatorName }}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        editing={reopening}
        duplicating={duplicating}
        onSharePdf={sharePdf}
        sharing={sharing}
        pdfLocked={pdfUsage?.isLocked}
        onBack={() => router.back()}
      >
        <NoteBlocksContent blocks={blocks} />
      </DocumentDetails>
      <SubscriptionNotice visible={limitNoticeVisible} onClose={() => setLimitNoticeVisible(false)} />
    </>
  );
}
