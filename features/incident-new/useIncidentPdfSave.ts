import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { onlineManager } from '@tanstack/react-query';
import { generateAndSharePdf, PdfLimitReachedError } from '../../lib/pdfOpen';
import { hashPdf } from '../../lib/pdfSecurity';
import { generatePdfName } from '../../lib/pdfName';
import { storageApi } from '../../lib/services';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { queryClient } from '../../lib/queryClient';
import { invalidateRecordLists } from '../../lib/apiHooks';
import { friendlyError } from '../../lib/errorMap';
import { useToast } from '../../lib/toast';
import { INCIDENT_TYPE_FULL_LABEL, type Project } from '../../types/models';
import {
  buildIncidentFields,
  composeIncidentPdfHtml,
  persistIncidentPdf,
  saveIncidentRow,
  uploadIncidentPhotos,
} from './saveIncident';
import type { FormData } from './incidentFormSchema';

/**
 * The incident flow's completion path: save the row as `completed`, generate +
 * share the PDF, and persist it in the background — all through the offline
 * write outbox (see `saveIncident`). Owns its toasts and the success/detail
 * routing; behaviour is unchanged from the pre-split route. Draft saves live
 * in the sibling `useIncidentDraftSave`.
 */
export function useIncidentPdfSave(args: {
  form: FormData;
  incidentId: string;
  projectId?: string;
  editId?: string;
  project: Project | null;
  userId?: string;
  inspector: { name: string; sigPath: string | null };
  pdfLocked: boolean;
  invalidatePdfUsage: () => void;
  onLimitReached: () => void;
}) {
  const { form, incidentId, projectId, editId, project, userId, inspector,
    pdfLocked, invalidatePdfUsage, onLimitReached } = args;
  const router = useRouter();
  const toast = useToast();
  const { t } = useTranslation();
  const [savingPdf, setSavingPdf] = useState(false);

  const saveAndGeneratePdf = async () => {
    if (!projectId || !project) {
      toast.error(t('errors.notFoundProject'));
      return;
    }
    if (pdfLocked) { onLimitReached(); return; }
    if (!form.type) {
      toast.error(t('incidents.selectTypeError'));
      return;
    }
    setSavingPdf(true);
    let savedId = incidentId;
    let incidentCommitted = false;
    // Only new uploads that actually reached storage are cleaned up on a
    // failed commit; existing photos (edit mode) must never be deleted, and
    // queued (offline) photos were never uploaded in the first place.
    let newlyUploadedPaths: string[] = [];
    try {
      // 1. upload photos (offline: staged + queued through the outbox)
      const uploaded = await uploadIncidentPhotos(incidentId, form.photos);
      newlyUploadedPaths = uploaded.filter(u => u.isNew && !u.queued).map(u => u.path);

      // 2. create or (edit mode) update the incident record. Offline the row
      // queues through the outbox and we proceed exactly as if saved.
      const { queued, incident: saved } = await saveIncidentRow({
        incidentId,
        projectId,
        mode: editId ? 'update' : 'create',
        userId,
        fields: buildIncidentFields(
          { ...form, type: form.type },
          uploaded.map(u => u.path),
          inspector.sigPath,
          'completed',
        ),
      });
      savedId = saved.id;
      invalidateRecordLists(queryClient);
      incidentCommitted = true;
      if (queued) toast.success(t('components.savedOffline'));

      // 3. compose the PDF HTML — inspector saved-signature data URL + embedded
      // photos + the canonical builder, all offline-safe (composeIncidentPdfHtml).
      const html = await composeIncidentPdfHtml({
        incident: saved,
        project,
        inspectorName: inspector.name,
        inspectorSigPath: inspector.sigPath,
        uploaded,
      });

      // 4. open/share PDF instantly; keep the pretty-named copy for background upload
      const incidentTypeLabel = INCIDENT_TYPE_FULL_LABEL[form.type];
      const docType = `ინციდენტი_${incidentTypeLabel}`;
      const pdfName = generatePdfName(project.company_name || project.name, docType, form.dateTime, savedId);
      const pdfPath = `incidents/${pdfName}`;
      // The PDF-gate RPC can't run offline — skip it so generation still works.
      const gateUserId = onlineManager.isOnline() ? userId : undefined;
      const localUri = await generateAndSharePdf(html, pdfName, true, gateUserId, {
        title: INCIDENT_TYPE_FULL_LABEL[form.type],
        author: inspector.name || undefined,
        documentId: savedId,
        subject: t('incidents.reportSubject'),
      });
      const pdfHash = localUri ? await hashPdf(localUri).catch(() => undefined) : undefined;
      invalidatePdfUsage();
      if (localUri) {
        router.replace(`/incidents/${savedId}/success` as any);
        // Background: persist the PDF — upload + row patch online, or stage it
        // behind the (possibly queued) row through the outbox. Never blocks.
        persistIncidentPdf({ incidentId: savedId, localUri, pdfPath, pdfName, pdfHash, rowQueued: queued })
          .then((r) => {
            if (r === 'queued' && !queued) toast.info(t('incidents.pdfSavedLocally'));
          })
          .catch(() => {});
      } else {
        router.replace(`/incidents/${savedId}/success` as any);
      }
    } catch (e) {
      if (e instanceof PdfLimitReachedError) { onLimitReached(); return; }
      if (!incidentCommitted) {
        // Incident was never written to DB - clean up only the photos uploaded
        // this session (never the pre-existing ones in edit mode).
        for (const path of newlyUploadedPaths) {
          storageApi.remove(STORAGE_BUCKETS.incidentPhotos, path).catch(() => {});
        }
        toast.error(friendlyError(e, t('incidents.createFailed')));
        return;
      }
      console.warn('[incident] PDF generation failed', e);
      toast.error(friendlyError(e, t('incidents.pdfCreateFailedSaved')));
      router.replace(`/incidents/${savedId}` as any);
    } finally {
      setSavingPdf(false);
    }
  };

  return { savingPdf, saveAndGeneratePdf };
}
