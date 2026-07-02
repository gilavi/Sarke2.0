// Save orchestration for the incident flow (app/incidents/new.tsx): photo
// upload with offline staging, the row write through the write outbox, PDF
// photo embedding, and post-share PDF persistence. Pure async functions with
// explicit dependencies — results come back to the screen, which owns all
// toasts and routing.
//
// REGULATORY: nothing here touches captured signature data. The inspector's
// reusable saved signature is referenced by storage path only.

import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { onlineManager } from '@tanstack/react-query';
import { incidentsApi, storageApi } from '../../lib/services';
import { queryClient } from '../../lib/queryClient';
import { qk } from '../../lib/apiHooks';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { saveRecordThroughOutbox, enqueueOutboxOp } from '../../lib/outbox';
import { isNetworkError } from '../../lib/outbox/storage';
import { stageCompressedPhotoForOffline } from '../../lib/photoCompression';
import { stagePdfForQueue, queuePdfUpload } from '../../lib/pdfUploadQueue';
import { pdfPhotoEmbed } from '../../lib/imageUrl';
import { logError } from '../../lib/logError';
import type { Incident, IncidentStatus, IncidentType } from '../../types/models';

/** Georgian display title for the pending-sync list (all incident outbox ops). */
const DISPLAY_TITLE = 'ინციდენტი';

export interface IncidentPhotoInput {
  uri: string;
  /** Storage path when already uploaded (edit mode) — kept as-is on save. */
  existingPath?: string;
}

export interface UploadedIncidentPhoto {
  /** Storage path: existing, freshly uploaded, or pre-computed for a queued upload. */
  path: string;
  /** False for edit-mode photos that already lived in storage. */
  isNew: boolean;
  /** True when the file was staged + enqueued (outbox) instead of uploaded. */
  queued: boolean;
  /** Local file:// uri for photos picked this session — PDF embeds prefer it. */
  localUri?: string;
}

/**
 * Upload the flow's photos to the `incident-photos` bucket. Edit-mode photos
 * with an `existingPath` keep their path untouched (never re-uploaded, never
 * deleted). Offline — or when an upload fails with a network-classified error
 * — each new photo is compressed + staged on disk and a `file_upload` op is
 * enqueued instead, so the returned paths array is correct either way and the
 * row's `photos` column can be written before the files land. Non-network
 * upload failures drop the photo with a warning (pre-outbox semantics).
 */
export async function uploadIncidentPhotos(
  incidentId: string,
  photos: IncidentPhotoInput[],
): Promise<UploadedIncidentPhoto[]> {
  const results: UploadedIncidentPhoto[] = [];
  for (const photo of photos) {
    // Edit mode: an already-stored photo keeps its path (no re-upload).
    if (photo.existingPath) {
      results.push({ path: photo.existingPath, isNew: false, queued: false });
      continue;
    }
    const photoId = Crypto.randomUUID();
    if (!onlineManager.isOnline()) {
      results.push(await stagePhotoOp(incidentId, photoId, photo.uri));
      continue;
    }
    const ext = photo.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `${incidentId}/${photoId}.${ext}`;
    try {
      await storageApi.uploadFromUri(
        STORAGE_BUCKETS.incidentPhotos,
        path,
        photo.uri,
        'image/jpeg',
        'incident',
      );
      results.push({ path, isNew: true, queued: false, localUri: photo.uri });
    } catch (e) {
      if (isNetworkError(e)) {
        results.push(await stagePhotoOp(incidentId, photoId, photo.uri));
      } else {
        console.warn('[incident] photo upload failed', e);
      }
    }
  }
  return results;
}

/** Stage a new photo on disk and enqueue its `file_upload` op (same group as the row). */
async function stagePhotoOp(
  incidentId: string,
  photoId: string,
  uri: string,
): Promise<UploadedIncidentPhoto> {
  // Staged files are always compressed to JPEG, so the path is always .jpg.
  const path = `${incidentId}/${photoId}.jpg`;
  const stagedUri = await stageCompressedPhotoForOffline(uri, 'incident');
  await enqueueOutboxOp({
    kind: 'file_upload',
    groupId: incidentId,
    bucket: STORAGE_BUCKETS.incidentPhotos,
    path,
    localUri: stagedUri,
    contentType: 'image/jpeg',
    displayTitle: DISPLAY_TITLE,
  });
  return { path, isNew: true, queued: true, localUri: uri };
}

export interface IncidentFormValues {
  type: IncidentType;
  injuredName: string;
  injuredRole: string;
  dateTime: Date;
  location: string;
  description: string;
  cause: string;
  actionsTaken: string;
  witnesses: string[];
}

/**
 * The exact snake_case column set both save paths write. Only `status`
 * differs between draft and completed; `pdf_url` always resets to null (a
 * fresh PDF is generated after save).
 */
export function buildIncidentFields(
  form: IncidentFormValues,
  photoPaths: string[],
  inspectorSignature: string | null,
  status: IncidentStatus,
) {
  return {
    type: form.type,
    injured_name: form.type !== 'nearmiss' ? form.injuredName || null : null,
    injured_role: form.type !== 'nearmiss' ? form.injuredRole || null : null,
    date_time: form.dateTime.toISOString(),
    location: form.location,
    description: form.description,
    cause: form.cause,
    actions_taken: form.actionsTaken,
    witnesses: form.witnesses,
    photos: photoPaths,
    inspector_signature: inspectorSignature,
    status,
    pdf_url: null,
  };
}

export type IncidentFields = ReturnType<typeof buildIncidentFields>;

/**
 * Write the incident row through the outbox. Online this is exactly the old
 * `incidentsApi.create/update` call; offline (or on a network-classified
 * failure) the op queues and the detail cache is seeded with an optimistic
 * row so the flow — and the success/detail screens — keep working. Returns
 * the saved row (server copy online, optimistic copy when queued).
 */
export async function saveIncidentRow(args: {
  incidentId: string;
  projectId: string;
  mode: 'create' | 'update';
  /** Signed-in user id — used for the optimistic row's user_id. */
  userId: string | undefined;
  fields: IncidentFields;
}): Promise<{ queued: boolean; incident: Incident }> {
  const { incidentId, projectId, mode, fields } = args;
  const cached = queryClient.getQueryData<Incident | null>(qk.incidents.byId(incidentId));
  const now = new Date().toISOString();
  const optimistic: Incident = {
    ...(cached ?? {}),
    id: incidentId,
    project_id: projectId,
    user_id: cached?.user_id ?? args.userId ?? '',
    ...fields,
    created_at: cached?.created_at ?? now,
    updated_at: now,
  };
  const res = await saveRecordThroughOutbox({
    entity: 'incident',
    mode,
    recordId: incidentId,
    payload: mode === 'create' ? { id: incidentId, project_id: projectId, ...fields } : { ...fields },
    displayTitle: DISPLAY_TITLE,
    projectId,
    detailKey: qk.incidents.byId(incidentId),
    optimistic,
  });
  return { queued: res.queued, incident: res.queued ? optimistic : (res.record as Incident) };
}

/**
 * data: URLs for the PDF's photo section. New photos (picked this session)
 * embed from their local file — offline-safe, no re-download; existing photos
 * go through the canonical `pdfPhotoEmbed`. Failed embeds are dropped rather
 * than rendering a broken <img>.
 */
export async function embedIncidentPhotosForPdf(
  photos: UploadedIncidentPhoto[],
): Promise<string[]> {
  const urls = await Promise.all(
    photos.map(p =>
      p.localUri
        ? localPhotoForPdf(p.localUri)
        : pdfPhotoEmbed(STORAGE_BUCKETS.incidentPhotos, p.path).catch(() => ''),
    ),
  );
  return urls.filter(Boolean);
}

/**
 * Mirror pdfPhotoEmbed's 1200px / JPEG 0.7 shrink for a local file (keeps the
 * print WebView from freezing on photo-heavy PDFs). Falls back to the raw
 * file:// uri, which expo-print can render (precedent: shareActPdf).
 */
async function localPhotoForPdf(uri: string): Promise<string> {
  try {
    const resized = await manipulateAsync(uri, [{ resize: { width: 1200 } }], {
      compress: 0.7,
      format: SaveFormat.JPEG,
      base64: true,
    });
    let b64 = resized.base64;
    if (!b64 && resized.uri) {
      b64 = await FileSystem.readAsStringAsync(resized.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }
    if (resized.uri) FileSystem.deleteAsync(resized.uri, { idempotent: true }).catch(() => undefined);
    if (b64) return `data:image/jpeg;base64,${b64}`;
  } catch (e) {
    console.warn('[incident] local pdf embed failed, using file uri', e);
  }
  return uri;
}

/**
 * Background persistence of the generated PDF: upload to the `pdfs` bucket +
 * patch the row's pdf_url/pdf_hash. If the row save was queued — or we're
 * offline — the PDF is staged and follows the row through the outbox (same
 * group, so it replays after the row lands). Online it uploads immediately,
 * falling back to the legacy pdf queue exactly as before. Returns how the PDF
 * was persisted so the caller can toast.
 */
export async function persistIncidentPdf(args: {
  incidentId: string;
  /** Local pretty-named PDF copy from generateAndSharePdf. */
  localUri: string;
  pdfPath: string;
  pdfName: string;
  pdfHash?: string;
  /** True when the row save queued through the outbox. */
  rowQueued: boolean;
}): Promise<'uploaded' | 'queued'> {
  const { incidentId, localUri, pdfPath, pdfName, pdfHash, rowQueued } = args;
  const patch = { pdf_url: pdfPath, ...(pdfHash ? { pdf_hash: pdfHash } : {}) };
  if (rowQueued || !onlineManager.isOnline()) {
    const stagedUri = await stagePdfForQueue(localUri, pdfName);
    await enqueueOutboxOp({
      kind: 'pdf_upload',
      groupId: incidentId,
      bucket: STORAGE_BUCKETS.pdfs,
      path: pdfPath,
      localUri: stagedUri,
      dbPatch: { entity: 'incident', recordId: incidentId, patch },
      displayTitle: DISPLAY_TITLE,
    });
    return 'queued';
  }
  try {
    await storageApi.uploadFromUri(STORAGE_BUCKETS.pdfs, pdfPath, localUri, 'application/pdf');
    await incidentsApi.update(incidentId, patch);
    // Clean up the temp copy after successful upload
    FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
    return 'uploaded';
  } catch (e) {
    logError(e, 'incidentNew.backgroundUpload');
    const stagedUri = await stagePdfForQueue(localUri, pdfName);
    await queuePdfUpload({
      localUri: stagedUri,
      bucket: STORAGE_BUCKETS.pdfs,
      path: pdfPath,
      contentType: 'application/pdf',
      dbOp: {
        kind: 'incident_update',
        payload: { incidentId, pdf_url: pdfPath, pdf_hash: pdfHash },
      },
    });
    return 'queued';
  }
}
