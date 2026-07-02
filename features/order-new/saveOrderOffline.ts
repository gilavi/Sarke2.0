// saveOrderOffline.ts — the wizard's order writes, routed through the offline
// write outbox instead of raw ordersApi.create/update. Online this is exactly
// the direct call it replaces (errors surface unchanged); offline — or on a
// network-classified failure — the op is queued and the optimistic model seeds
// qk.orders.byId so the success/detail screens can keep going via cachedRead.

import { saveRecordThroughOutbox, enqueueOutboxOp } from '../../lib/outbox';
import { qk } from '../../lib/apiHooks';
import { queryClient } from '../../lib/queryClient';
import { stagePdfForQueue } from '../../lib/pdfUploadQueue';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import type { Order, OrderDocumentType, OrderFormData } from '../../types/models';

export interface SaveOrderArgs {
  /** Stable client id — editId when editing, a fresh uuid otherwise. */
  orderId: string;
  /** Present when the wizard is in edit mode (?editId=). */
  editId?: string;
  projectId: string;
  /** Signed-in user id — fills the optimistic model's userId. */
  userId?: string;
  docType: OrderDocumentType;
  formData: OrderFormData;
  status: 'draft' | 'completed';
}

/**
 * Save an order through the write outbox. Returns the service's order when the
 * save ran directly (online), or the cache-seeded optimistic order when it was
 * queued (`queued: true`) — either way `order.id` is routable.
 */
export async function saveOrderRecord(args: SaveOrderArgs): Promise<{ queued: boolean; order: Order }> {
  const { orderId, editId, projectId, docType, formData, status } = args;
  // Exact ordersApi call args: Partial<Order> patch for update, create args
  // (with the client id, so offline creates are routable) otherwise.
  const payload = editId
    ? { documentType: docType, formData, status }
    : { id: orderId, projectId, documentType: docType, formData, status };

  // Optimistic model matching ordersApi.getById — a queued edit keeps the
  // cached order's createdAt/pdfUrl instead of wiping them.
  const prev = queryClient.getQueryData<Order>(qk.orders.byId(orderId));
  const now = new Date().toISOString();
  const optimistic: Order = {
    id: orderId,
    projectId,
    userId: args.userId ?? prev?.userId ?? '',
    documentType: docType,
    formData,
    status,
    pdfUrl: prev?.pdfUrl ?? null,
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
  };

  const res = await saveRecordThroughOutbox({
    entity: 'order',
    mode: editId ? 'update' : 'create',
    recordId: orderId,
    payload,
    displayTitle: 'ბრძანება',
    projectId,
    detailKey: qk.orders.byId(orderId),
    optimistic,
  });
  return { queued: res.queued, order: res.queued ? optimistic : (res.record as Order) };
}

/**
 * Patch pdfUrl/pdfHash on an order after a successful direct (online) upload.
 * Routed through the outbox: online it is exactly the ordersApi.update it
 * replaces; a connection drop between upload and patch queues the patch
 * instead of losing it. Non-network errors still throw to the caller.
 */
export async function patchOrderPdfUrl(args: {
  orderId: string;
  projectId?: string | null;
  pdfPath: string;
  pdfHash?: string;
}): Promise<void> {
  await saveRecordThroughOutbox({
    entity: 'order',
    mode: 'update',
    recordId: args.orderId,
    payload: { pdfUrl: args.pdfPath, ...(args.pdfHash ? { pdfHash: args.pdfHash } : {}) },
    displayTitle: 'ბრძანება',
    projectId: args.projectId,
  });
}

/**
 * Queue an order PDF for offline upload: stage the freshly generated local
 * file, then enqueue a pdf_upload op that uploads it and patches the order row
 * (pdfUrl + pdfHash) once the connection returns. Grouped under the order id
 * so it flushes after the order's own queued create/update.
 */
export async function queueOrderPdfUpload(args: {
  orderId: string;
  pdfName: string;
  /** Storage path inside the pdfs bucket (`orders/<pdfName>`). */
  pdfPath: string;
  localUri: string;
  pdfHash?: string;
}): Promise<void> {
  const stagedUri = await stagePdfForQueue(args.localUri, args.pdfName);
  await enqueueOutboxOp({
    kind: 'pdf_upload',
    groupId: args.orderId,
    bucket: STORAGE_BUCKETS.pdfs,
    path: args.pdfPath,
    localUri: stagedUri,
    dbPatch: {
      entity: 'order',
      recordId: args.orderId,
      patch: { pdfUrl: args.pdfPath, ...(args.pdfHash ? { pdfHash: args.pdfHash } : {}) },
    },
    displayTitle: 'ბრძანება',
  });
}
