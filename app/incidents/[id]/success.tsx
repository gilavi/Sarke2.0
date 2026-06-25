// Incident success screen.
//
// Renders the unified FlowSuccessScreen in the "incident" config: a severity
// hero pill, editable signatures, and a Share-PDF pill. The inspector's saved
// signature is auto-applied on entry (the user can change/delete/re-sign via the
// signature modal), and any number of blank hand-sign rows can be added for
// other people. "Share PDF" rebuilds the incident report with those signatures
// and shares + re-uploads it. Captured signatures live only in this screen's
// state — never persisted (see features/signatures/AGENTS.md).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlowSuccessScreen } from '../../../components/success';
import { SubscriptionNotice } from '../../../components/SubscriptionNotice';
import { useSignaturesState } from '../../../features/signatures';
import { useIncident, useProject, invalidateRecordLists } from '../../../lib/apiHooks';
import { queryClient } from '../../../lib/queryClient';
import { incidentsApi, storageApi } from '../../../lib/services';
import { generateAndSharePdf, PdfLimitReachedError } from '../../../lib/pdfOpen';
import { hashPdf } from '../../../lib/pdfSecurity';
import { buildIncidentPdfHtml } from '../../../lib/incidentPdf';
import { generatePdfName } from '../../../lib/pdfName';
import { signatureAsDataUrl, pdfPhotoEmbed } from '../../../lib/imageUrl';
import { queuePdfUpload, stagePdfForQueue } from '../../../lib/pdfUploadQueue';
import { STORAGE_BUCKETS } from '../../../lib/supabase';
import { usePdfUsage, useInvalidatePdfUsage } from '../../../lib/usePdfUsage';
import { useSession } from '../../../lib/session';
import { useToast } from '../../../lib/toast';
import { friendlyError } from '../../../lib/errorMap';
import { logError } from '../../../lib/logError';
import { INCIDENT_TYPE_FULL_LABEL } from '../../../types/models';
import * as FileSystem from 'expo-file-system/legacy';

export default function IncidentSuccessScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const session = useSession();

  const { data: incident } = useIncident(id);
  const { data: project } = useProject(incident?.project_id);

  const signatures = useSignaturesState();
  const [sharing, setSharing] = useState(false);
  const [limitNoticeVisible, setLimitNoticeVisible] = useState(false);
  const { data: pdfUsage } = usePdfUsage();
  const invalidatePdfUsage = useInvalidatePdfUsage();

  const creatorName = useMemo(() => {
    if (session.state.status !== 'signedIn') return '';
    const u = session.state.user;
    return u
      ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()
      : session.state.session.user.email ?? '';
  }, [session.state]);

  // Auto-apply the inspector's saved signature on entry (if one exists). The
  // user can still change / delete / re-sign via the signature modal.
  //
  // REGULATORY NOTE: incidents are a SEPARATE signature basis from inspection
  // acts (see features/signatures/AGENTS.md "Out of scope" — the incident
  // expert signature is allowed to persist). The captured base64 lives only in
  // this screen's `useSignaturesState` and is never written to storage/DB; only
  // the rendered incident-report PDF is uploaded, exactly as the flow has always
  // done with the saved expert signature. The no-persistence rule (which bans
  // persisting the signature DATA) is therefore preserved.
  useEffect(() => {
    if (session.state.status !== 'signedIn') return;
    const sigPath = session.state.user?.saved_signature_url;
    if (!sigPath || signatures.creatorSignature) return;
    let cancelled = false;
    signatureAsDataUrl(STORAGE_BUCKETS.signatures, sigPath)
      .then((dataUrl) => {
        if (cancelled || !dataUrl) return;
        // Strip any `data:<mime>;base64,` prefix (saved sigs may be png OR jpeg).
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
        // Background: upload the signed PDF + update the incident row.
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
            logError(e, 'incidentSuccess.backgroundUpload');
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

  return (
    <>
      <FlowSuccessScreen
        flow="incident"
        hero={incident ? { tone: 'severe', label: INCIDENT_TYPE_FULL_LABEL[incident.type] } : null}
        signatures={signatures}
        creatorName={creatorName}
        onSharePdf={sharePdf}
        sharing={sharing}
        pdfLocked={pdfUsage?.isLocked}
        onBackEdit={() => router.replace(`/incidents/${id}` as any)}
        onBackHome={() => router.replace('/(tabs)/home' as any)}
      />
      <SubscriptionNotice visible={limitNoticeVisible} onClose={() => setLimitNoticeVisible(false)} />
    </>
  );
}
