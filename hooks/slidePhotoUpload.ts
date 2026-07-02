// Sibling of useSlidePhotoEditing.ts — the storage-upload step, extracted so
// the hook stays under its size target. NOT a hook.

import * as Crypto from 'expo-crypto';
import { onlineManager } from '@tanstack/react-query';
import { storageApi } from '../lib/services';
import { STORAGE_BUCKETS } from '../lib/supabase';
import { enqueueOutboxOp } from '../lib/outbox';
import { stageCompressedPhotoForOffline } from '../lib/photoCompression';

/**
 * Upload one slide photo to the `report-photos` bucket under a pre-computed
 * path. Online: direct upload (unchanged behavior). Offline: stages a
 * compressed copy on disk and queues a `file_upload` outbox op (grouped under
 * the report id, so it syncs alongside the report's queued record saves), and
 * returns the staged file:// URI so the editor can render a local preview.
 *
 * Returns the storage path to persist in the slide (never a local URI — the
 * slides JSON must only ever reference storage paths) plus `localPreviewUri`
 * (non-null only for a queued offline upload). Throws on failure.
 */
export async function uploadSlidePhoto(params: {
  reportId: string;
  slideId: string;
  localUri: string;
}): Promise<{ path: string; localPreviewUri: string | null }> {
  const { reportId, slideId, localUri } = params;
  const ext = (localUri.split('.').pop() || 'jpg').split('?')[0];
  const path = `${reportId}/${slideId}/annotated-${Crypto.randomUUID()}.${ext}`;

  if (!onlineManager.isOnline()) {
    const stagedUri = await stageCompressedPhotoForOffline(localUri, 'report');
    await enqueueOutboxOp({
      kind: 'file_upload',
      groupId: reportId,
      bucket: STORAGE_BUCKETS.reportPhotos,
      path,
      localUri: stagedUri,
      contentType: 'image/jpeg',
      displayTitle: 'ანგარიში',
    });
    return { path, localPreviewUri: stagedUri };
  }

  await storageApi.uploadFromUri(STORAGE_BUCKETS.reportPhotos, path, localUri, 'image/jpeg', 'report');
  return { path, localPreviewUri: null };
}
