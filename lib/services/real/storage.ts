import * as FileSystem from 'expo-file-system/legacy';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../../supabase';
import { compressPhoto } from '../../photoCompression';
import type { CompressionProfile, CompressOptions } from '../../photoCompression';
import { logError } from '../../logError';

export const storageApi = {
  upload: async (bucket: string, path: string, body: Blob | ArrayBuffer, contentType: string) => {
    const { error } = await supabase.storage.from(bucket).upload(path, body, {
      contentType,
      upsert: true,
    });
    if (error) throw error;
    return path;
  },
  /**
   * Upload a local file (file:// URI) directly to Supabase storage via the
   * REST endpoint, using `FileSystem.uploadAsync` so the bytes never pass
   * through the JS Blob/ArrayBuffer layer.
   *
   * Why this exists: on Hermes / Expo SDK 54, supabase-js's `.upload(blob)`
   * and `.upload(arrayBuffer)` both silently ship 0-byte objects to storage
   * (the Blob serialization for fetch's body is broken). Native upload
   * streams the file straight from disk and is the only path that
   * reliably stores the actual bytes.
   */
  uploadFromUri: async (
    bucket: string,
    path: string,
    fileUri: string,
    contentType: string,
    compression?: CompressionProfile | CompressOptions,
  ): Promise<string> => {
    // If it's an image and compression is requested, compress before upload
    let uploadUri = fileUri;
    if (compression && contentType.startsWith('image/')) {
      try {
        const opts = typeof compression === 'string' ? { profile: compression } : compression;
        const result = await compressPhoto(fileUri, opts);
        uploadUri = result.uri;
      } catch (e) {
        console.warn('[storageApi.uploadFromUri] compression failed, using original', e);
        uploadUri = fileUri;
      }
    }

    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'x-upsert': 'true',
      apikey: SUPABASE_ANON_KEY,
    };
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
    const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;

    // Native upload with one retry. `FileSystem.uploadAsync` can REJECT (not
    // return a status) when the connection drops mid-flight — on iOS this
    // surfaces as `NSURLErrorDomain Code=-1`, common on weak/unstable links.
    // The upload is an idempotent upsert (x-upsert: true), so a single retry on
    // a native rejection is safe and materially improves success on flaky
    // networks. Both the rejection and a non-2xx status are logged (previously
    // native rejections threw unlogged, so they never reached Sentry).
    const doUpload = () =>
      FileSystem.uploadAsync(url, uploadUri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers,
      });

    let result: FileSystem.FileSystemUploadResult;
    try {
      result = await doUpload();
    } catch (e) {
      logError(e, `storage.uploadFromUri native-reject (retrying) bucket=${bucket} path=${path}`);
      try {
        result = await doUpload();
      } catch (e2) {
        logError(e2, `storage.uploadFromUri native-reject (failed) bucket=${bucket} path=${path}`);
        // Clean up the compressed temp file before bailing.
        if (uploadUri !== fileUri) {
          FileSystem.deleteAsync(uploadUri, { idempotent: true }).catch(() => {});
        }
        throw e2;
      }
    }

    // Clean up compressed temp file if different from original
    if (uploadUri !== fileUri) {
      FileSystem.deleteAsync(uploadUri, { idempotent: true }).catch(() => {});
    }
    if (result.status < 200 || result.status >= 300) {
      const err = new Error(`storage upload failed (${result.status}): ${result.body}`);
      logError(err, `storage.uploadFromUri bucket=${bucket} path=${path} status=${result.status}`);
      throw err;
    }
    return path;
  },
  download: async (bucket: string, path: string) => {
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error) throw error;
    return data;
  },
  signedUrl: async (bucket: string, path: string, expiresIn = 3600): Promise<string> => {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
    if (error) throw error;
    return data.signedUrl;
  },
  publicUrl: (bucket: string, path: string) =>
    supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl,
  /** Best-effort blob delete. Logs failures (file may already be gone) but never throws. */
  remove: async (bucket: string, path: string): Promise<void> => {
    await supabase.storage
      .from(bucket)
      .remove([path])
      .catch((e) => logError(e, `storage.remove.${bucket}`));
  },
};
