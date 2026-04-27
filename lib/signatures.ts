import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { supabase, STORAGE_BUCKETS } from './supabase';
import { storageApi } from './services';
import { dataUrlToArrayBuffer } from './blob';
import { logError } from './logError';

const PENDING_KEY = 'pending-signatures';

interface PendingSignature {
  path: string;
  base64: string;
  contentType: string;
}

/**
 * Normalize a drawn signature PNG: constrain to max 400px wide, PNG encode,
 * and write to a temp file. `base64` is the raw base64 string (no data:
 * prefix) from SignatureCanvas.
 *
 * Returns `{ base64, fileUri, contentType }`. Callers upload via
 * `storageApi.uploadFromUri(fileUri)` so the bytes stream natively — every
 * other upload path (`Blob` body, `ArrayBuffer` body) silently produces
 * 0-byte storage objects on Hermes/SDK 54.
 */
export async function compressSignature(base64: string): Promise<{
  base64: string;
  fileUri: string;
  contentType: string;
}> {
  const dataUrl = `data:image/png;base64,${base64}`;
  const out = await manipulateAsync(
    dataUrl,
    [{ resize: { width: 400 } }],
    { compress: 1, format: SaveFormat.PNG, base64: true },
  );
  const finalBase64 = out.base64
    ?? (out.uri
      ? await FileSystem.readAsStringAsync(out.uri, { encoding: FileSystem.EncodingType.Base64 })
      : base64);
  if (!finalBase64) throw new Error('manipulator returned no base64');
  // Sanity: confirm decoded byte length is non-zero before handing off to Supabase.
  const ab = dataUrlToArrayBuffer(`data:image/png;base64,${finalBase64}`);
  if (ab.byteLength === 0) throw new Error('signature body empty after base64 decode');

  // Prefer the manipulator's own file URI; otherwise write the bytes to a
  // fresh temp file so the native uploader has something to stream.
  let fileUri = out.uri;
  if (!fileUri) {
    const cacheBase = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    if (!cacheBase) throw new Error('no cache directory available');
    fileUri = `${cacheBase}sig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
    await FileSystem.writeAsStringAsync(fileUri, finalBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }
  return { base64: finalBase64, fileUri, contentType: 'image/png' };
}

/**
 * Upload a compressed signature to Supabase storage.
 * On failure, queue the upload in AsyncStorage under `pending-signatures/`
 * so a future attempt can retry — never block the user flow.
 */
export async function uploadSignature(
  path: string,
  base64: string,
): Promise<{ path: string; pending: boolean }> {
  try {
    const { fileUri, contentType } = await compressSignature(base64);
    await storageApi.uploadFromUri(STORAGE_BUCKETS.signatures, path, fileUri, contentType);
    return { path, pending: false };
  } catch (e) {
    // Log the real failure so we can debug in Metro/Sentry instead of
    // silently queuing forever — this used to mask 0-byte upload bugs.
    logError(e, 'uploadSignature');
    const list = await readPending();
    list.push({ path, base64, contentType: 'image/png' });
    await writePending(list);
    return { path, pending: true };
  }
}

/**
 * Retry all queued uploads. Call on app open, before PDF generation, etc.
 * Idempotent.
 */
export async function flushPendingSignatures(): Promise<void> {
  const list = await readPending();
  if (list.length === 0) return;
  const still: PendingSignature[] = [];
  for (const item of list) {
    try {
      const { fileUri, contentType } = await compressSignature(item.base64);
      await storageApi.uploadFromUri(STORAGE_BUCKETS.signatures, item.path, fileUri, contentType);
    } catch {
      still.push(item);
    }
  }
  await writePending(still);
}

/**
 * Write `users.saved_signature_url` for the current user after uploading
 * their expert signature. Returns the storage path.
 *
 * If the upload had to be queued (offline / network error), we throw rather
 * than persist a DB pointer to a storage object that doesn't exist yet —
 * otherwise thumbnails 404 and PDFs render an empty signature block.
 */
export async function saveExpertSignature(base64: string): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('არ ხართ შესული');
  const path = `expert/${userId}.png`;
  const { pending } = await uploadSignature(path, base64);
  if (pending) {
    throw new Error('ხელმოწერის ატვირთვა ვერ მოხერხდა — შეამოწმეთ ინტერნეტი და სცადეთ თავიდან');
  }
  const { error } = await supabase
    .from('users')
    .update({ saved_signature_url: path })
    .eq('id', userId);
  if (error) throw error;
  return path;
}

async function readPending(): Promise<PendingSignature[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingSignature[]) : [];
  } catch {
    return [];
  }
}

async function writePending(list: PendingSignature[]): Promise<void> {
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(list));
}
