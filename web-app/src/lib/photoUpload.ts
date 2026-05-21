/**
 * photoUpload.ts — inspection photo helpers for the web dashboard.
 *
 * Photos are stored in the `answer-photos` Supabase Storage bucket under the
 * path: `{prefix}/{inspectionId}/{itemId}/{uuid}.{ext}`.
 *
 * The path is then persisted inside the `items` JSONB column of the respective
 * `*_inspections` table as part of `photo_paths[]`.
 *
 * Storage access goes through the canonical `lib/db/storage` primitive.
 */
import { STORAGE_BUCKETS, signedUrl, upload, removeObjects } from '@/lib/db/storage';

/**
 * Upload a single photo file to the `answer-photos` bucket.
 *
 * @param prefix   e.g. "bobcat", "excavator", "general-equipment"
 * @param inspectionId  UUID of the parent inspection row
 * @param itemId   numeric or string item identifier within the inspection
 * @param file     File from <input type="file">
 * @returns        The storage path (relative to the bucket root)
 */
export async function uploadInspectionPhoto(
  prefix: string,
  inspectionId: string,
  itemId: string | number,
  file: File,
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const uuid = crypto.randomUUID();
  const path = `${prefix}/${inspectionId}/${itemId}/${uuid}.${ext}`;
  return upload(STORAGE_BUCKETS.answerPhotos, path, file, {
    contentType: file.type || 'image/jpeg',
    upsert: false,
  });
}

/**
 * Create a short-lived signed URL (10 minutes) for viewing a photo.
 */
export function signedInspectionPhotoUrl(path: string): Promise<string> {
  return signedUrl(STORAGE_BUCKETS.answerPhotos, path);
}

/**
 * Remove a photo from storage. Best-effort — does not throw on 404.
 */
export async function deleteInspectionPhoto(path: string): Promise<void> {
  await removeObjects(STORAGE_BUCKETS.answerPhotos, [path]);
}
