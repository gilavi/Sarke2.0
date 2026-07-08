import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { queryClient } from '../../lib/queryClient';
import { invalidateRecordLists } from '../../lib/apiHooks';
import { friendlyError } from '../../lib/errorMap';
import { useToast } from '../../lib/toast';
import {
  buildIncidentFields,
  saveIncidentRow,
  uploadIncidentPhotos,
} from './saveIncident';
import type { FormData } from './incidentFormSchema';

/**
 * Draft-save operations for the incident flow: the explicit step-4 "save
 * without PDF" button and the fire-and-forget exit-draft save (batch-4 exit
 * dialog honesty). Both go through the offline write outbox (see
 * `saveIncident`) and own their own toasts; routing stays with the caller for
 * the exit path (the row write must never block leaving). The PDF completion
 * flow lives in the sibling `useIncidentPdfSave`.
 */
export function useIncidentDraftSave(args: {
  form: FormData;
  incidentId: string;
  projectId?: string;
  editId?: string;
  userId?: string;
  inspector: { name: string; sigPath: string | null };
  exitSavesDraft: boolean;
}) {
  const { form, incidentId, projectId, editId, userId, inspector, exitSavesDraft } = args;
  const router = useRouter();
  const toast = useToast();
  const { t } = useTranslation();
  const [savingDraft, setSavingDraft] = useState(false);

  // A NEW incident with real content is silently kept as a draft on exit.
  // Fire-and-forget: the row write goes through the outbox (offline it
  // queues), so leaving never blocks on the network. Failure = the old
  // discard, surfaced honestly via toast.
  const saveExitDraft = () => {
    const pid = projectId;
    if (!exitSavesDraft || !form.type || !pid) return;
    const type = form.type;
    (async () => {
      const uploaded = await uploadIncidentPhotos(incidentId, form.photos);
      const { queued } = await saveIncidentRow({
        incidentId,
        projectId: pid,
        mode: 'create',
        userId,
        fields: buildIncidentFields(
          { ...form, type },
          uploaded.map(u => u.path),
          inspector.sigPath,
          'draft',
        ),
      });
      invalidateRecordLists(queryClient);
      toast.success(queued ? t('components.savedOffline') : t('incidents.savedDraft'));
    })().catch(() => toast.error(t('errors.saveFailed')));
  };

  // ── save (draft) ────────────────────────────────────────────────────────────
  const saveDraft = async () => {
    if (!projectId) return;
    if (!form.type) {
      toast.error(t('incidents.selectTypeError'));
      return;
    }
    setSavingDraft(true);
    try {
      // Offline: photos are staged + queued and the row write queues through
      // the outbox — the flow proceeds exactly as if saved.
      const uploaded = await uploadIncidentPhotos(incidentId, form.photos);
      const { queued } = await saveIncidentRow({
        incidentId,
        projectId,
        mode: editId ? 'update' : 'create',
        userId,
        fields: buildIncidentFields(
          { ...form, type: form.type },
          uploaded.map(u => u.path),
          inspector.sigPath,
          'draft',
        ),
      });
      invalidateRecordLists(queryClient);
      toast.success(queued ? t('components.savedOffline') : t('incidents.savedDraft'));
      router.back();
    } catch (e) {
      toast.error(friendlyError(e, t('errors.saveFailed')));
    } finally {
      setSavingDraft(false);
    }
  };

  return { savingDraft, saveDraft, saveExitDraft };
}
