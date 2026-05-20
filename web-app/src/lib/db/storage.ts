/**
 * Canonical Supabase Storage primitive for the web dashboard.
 *
 * Before this file, every data module hard-coded bucket-name string literals
 * and re-implemented `createSignedUrl(path, 60 * 10)` under a different name
 * (signedPdfUrl, signedIncidentPdfUrl, signedReportPdfUrl, …). All bucket
 * access now goes through here: one bucket registry, one signed-URL helper,
 * one upload, one remove. Nothing outside `lib/db` and `lib/auth` should call
 * `supabase.storage` directly.
 */
import { supabase } from '@/lib/supabase';

/** The fixed set of storage buckets shared with the Sarke mobile app. */
export const STORAGE_BUCKETS = {
  certificates: 'certificates',
  answerPhotos: 'answer-photos',
  pdfs: 'pdfs',
  signatures: 'signatures',
  incidentPhotos: 'incident-photos',
  reportPhotos: 'report-photos',
  projectFiles: 'project-files',
  remoteSignatures: 'remote-signatures',
} as const;

export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

/** Default signed-URL lifetime: 10 minutes (matches the prior ad-hoc helpers). */
export const SIGNED_URL_TTL_SECONDS = 60 * 10;

/** Create a short-lived signed URL for a private object. */
export async function signedUrl(
  bucket: StorageBucket,
  path: string,
  ttlSeconds: number = SIGNED_URL_TTL_SECONDS,
): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, ttlSeconds);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

/** Resolve a stable public URL (only meaningful for public buckets). */
export function publicUrl(bucket: StorageBucket, path: string): string {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export interface UploadOptions {
  contentType?: string;
  upsert?: boolean;
}

/** Upload a file/blob to `bucket` at `path`. Returns the stored path. */
export async function upload(
  bucket: StorageBucket,
  path: string,
  body: File | Blob,
  opts: UploadOptions = {},
): Promise<string> {
  const contentType =
    opts.contentType ?? (body instanceof File ? body.type : undefined) ?? 'application/octet-stream';
  const { error } = await supabase.storage.from(bucket).upload(path, body, {
    contentType,
    upsert: opts.upsert ?? false,
  });
  if (error) throw new Error(error.message);
  return path;
}

/**
 * Remove objects from a bucket. Best-effort by default: storage 404s when an
 * object was already gone should not abort a parent delete. Pass
 * `{ throwOnError: true }` when the removal itself is the operation.
 */
export async function removeObjects(
  bucket: StorageBucket,
  paths: string[],
  opts: { throwOnError?: boolean } = {},
): Promise<void> {
  if (!paths.length) return;
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error && opts.throwOnError) throw new Error(error.message);
}
