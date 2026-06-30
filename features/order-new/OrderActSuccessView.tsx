// OrderActSuccessView — the act-style success screen for "act-style" orders
// (crane operator, crane technical, scaffold supervision).
//
// These orders finish like a შემოწმების აქტი: the wizard saves the record (no
// PDF), and HERE the user adds signature graphs and shares the PDF. The PDF is
// generated on demand with the in-memory signature snapshot — nothing
// signature-related is persisted (see features/signatures/AGENTS.md). Reuses
// the unified FlowSuccessScreen (flow="order") + the SignaturesScreen modal.

import { useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { FlowSuccessScreen } from '../../components/success';
import { SubscriptionNotice } from '../../components/SubscriptionNotice';
import { useSignaturesState } from '../../features/signatures';

import { useToast } from '../../lib/toast';
import { useSession } from '../../lib/session';
import { pdfPhotoEmbed } from '../../lib/imageUrl';
import { generateAndSharePdf, PdfLimitReachedError } from '../../lib/pdfOpen';
import { hashPdf } from '../../lib/pdfSecurity';
import { generatePdfName } from '../../lib/pdfName';
import { queuePdfUpload, stagePdfForQueue } from '../../lib/pdfUploadQueue';
import {
  buildCraneOperatorOrderHtml,
  buildCraneTechnicalOrderHtml,
  buildScaffoldSupervisionOrderHtml,
  buildFireSafetyOrderHtml,
  buildLaborSafetyOrderHtml,
  buildTrainingScheduleOrderHtml,
} from '../../lib/orderPdf';
import { ordersApi } from '../../lib/ordersApi';
import { storageApi } from '../../lib/services';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { queryClient } from '../../lib/queryClient';
import { invalidateRecordLists } from '../../lib/apiHooks';
import { reopenDocument } from '../../lib/documents/reopen';
import { usePdfUsage, useInvalidatePdfUsage } from '../../lib/usePdfUsage';
import { logError } from '../../lib/logError';
import { friendlyError } from '../../lib/errorMap';
import { haptic } from '../../lib/haptics';

import {
  ORDER_DOCUMENT_TYPE_LABEL,
  type Order,
  type Project,
  type CraneOperatorOrderFormData,
  type CraneTechnicalOrderFormData,
  type ScaffoldSupervisionOrderFormData,
  type FireSafetyOrderFormData,
  type LaborSafetyOrderFormData,
  type TrainingScheduleOrderFormData,
} from '../../types/models';
import { docSlug } from './orderFormSchema';

// Broad view over the act-style order payloads — fields not present on a given
// type read as undefined at runtime (e.g. scaffold has no crane photos).
type ActOrderForm = CraneOperatorOrderFormData &
  Partial<CraneTechnicalOrderFormData> &
  Partial<ScaffoldSupervisionOrderFormData> &
  Partial<LaborSafetyOrderFormData> &
  Partial<TrainingScheduleOrderFormData>;

export function OrderActSuccessView({ order, project }: { order: Order; project: Project | null }) {
  const router = useRouter();
  const toast = useToast();
  const session = useSession();
  const { t } = useTranslation();

  const signatures = useSignaturesState();
  const [sharing, setSharing] = useState(false);
  const [limitNoticeVisible, setLimitNoticeVisible] = useState(false);
  const { data: pdfUsage } = usePdfUsage();
  const invalidatePdfUsage = useInvalidatePdfUsage();

  const f = order.formData as ActOrderForm;
  const userId = session.state.status === 'signedIn' ? session.state.session.user.id : undefined;

  const resolvePhoto = async (path: string | null | undefined): Promise<string | null> => {
    if (!path) return null;
    try {
      return await pdfPhotoEmbed(STORAGE_BUCKETS.answerPhotos, path);
    } catch (e) {
      logError(e, 'orderActSuccess.photoEmbed');
      return null;
    }
  };

  const onSharePdf = async () => {
    if (pdfUsage?.isLocked) { setLimitNoticeVisible(true); return; }
    setSharing(true);
    try {
      const projectName = project?.company_name || project?.name || '';
      const sigArgs = {
        directorSignatureBase64: signatures.creatorSignature?.pngBase64 ?? null,
        extraSignatureRows: signatures.additionalRows.length,
      };

      let html: string;
      if (order.documentType === 'scaffold_supervision_order') {
        html = buildScaffoldSupervisionOrderHtml({
          formData: f as ScaffoldSupervisionOrderFormData,
          projectName,
          ...sigArgs,
        });
      } else if (order.documentType === 'fire_safety_order') {
        html = buildFireSafetyOrderHtml({
          formData: order.formData as FireSafetyOrderFormData,
          projectName,
          ...sigArgs,
        });
      } else if (order.documentType === 'labor_safety_specialist') {
        html = buildLaborSafetyOrderHtml({
          formData: order.formData as LaborSafetyOrderFormData,
          projectName,
          ...sigArgs,
        });
      } else if (order.documentType === 'training_schedule_order') {
        html = buildTrainingScheduleOrderHtml({
          formData: order.formData as TrainingScheduleOrderFormData,
          projectName,
          ...sigArgs,
        });
      } else {
        const [certPhotoDataUrl, inspCertPhotoDataUrl] = await Promise.all([
          resolvePhoto(f.craneOperatorCertPhoto),
          resolvePhoto(f.craneInspCertPhoto),
        ]);
        html = order.documentType === 'crane_technical_order'
          ? buildCraneTechnicalOrderHtml({
              formData: f as CraneTechnicalOrderFormData,
              projectName,
              certPhotoDataUrl,
              inspCertPhotoDataUrl,
              ...sigArgs,
            })
          : buildCraneOperatorOrderHtml({
              formData: f as CraneOperatorOrderFormData,
              projectName,
              certPhotoDataUrl,
              inspCertPhotoDataUrl,
              ...sigArgs,
            });
      }

      const pdfName = generatePdfName(projectName, docSlug(order.documentType), new Date(f.orderDate), order.id);
      const pdfPath = `orders/${pdfName}`;
      const localUri = await generateAndSharePdf(html, pdfName, true, userId, {
        title: ORDER_DOCUMENT_TYPE_LABEL[order.documentType],
        author: f.appointedName || f.craneOperatorName || f.specialistName || f.directorName || undefined,
        documentId: order.id,
        subject: 'შრომის უსაფრთხოების ბრძანება',
      });
      const pdfHash = localUri ? await hashPdf(localUri).catch(() => undefined) : undefined;
      invalidatePdfUsage();

      if (localUri) {
        (async () => {
          try {
            await storageApi.uploadFromUri(STORAGE_BUCKETS.pdfs, pdfPath, localUri, 'application/pdf');
            await ordersApi.update(order.id, { pdfUrl: pdfPath, ...(pdfHash ? { pdfHash } : {}) });
            invalidateRecordLists(queryClient);
            FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
          } catch (e) {
            logError(e, 'orderActSuccess.upload');
            const stagedUri = await stagePdfForQueue(localUri, pdfName);
            await queuePdfUpload({
              localUri: stagedUri,
              bucket: STORAGE_BUCKETS.pdfs,
              path: pdfPath,
              contentType: 'application/pdf',
              dbOp: { kind: 'none' },
            });
          }
        })();
      }
    } catch (e) {
      if (e instanceof PdfLimitReachedError) { setLimitNoticeVisible(true); return; }
      toast.error(friendlyError(e, t('orders.pdfGenerateFailed')));
    } finally {
      setSharing(false);
    }
  };

  const onBackEdit = async () => {
    try {
      haptic.medium();
      await reopenDocument({ kind: 'order', id: order.id }, queryClient);
      router.replace(`/orders/new?editId=${order.id}&projectId=${order.projectId}` as any);
    } catch {
      // stay on the success screen on failure
    }
  };

  return (
    <>
      <FlowSuccessScreen
        flow="order"
        signatures={signatures}
        creatorName={f.directorName || ''}
        onSharePdf={onSharePdf}
        sharing={sharing}
        pdfLocked={pdfUsage?.isLocked}
        onBackEdit={onBackEdit}
        onBackHome={() => router.replace('/(tabs)/home' as any)}
      />
      <SubscriptionNotice visible={limitNoticeVisible} onClose={() => setLimitNoticeVisible(false)} />
    </>
  );
}
