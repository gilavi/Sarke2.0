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
 * Normalize a drawn signature PNG: constrain to max 400px wide, PNG encode.
 * `base64` is the raw base64 string (no data: prefix) from SignatureCanvas.
 *
 * Returns `{ base64, body, contentType }` ready to upload. We hand back an
 * `ArrayBuffer` (decoded from base64 ourselves) rather than going through
 * `fetch(dataUrl).blob()` — that path is unreliable on Hermes and silently
 * produces 0-byte uploads, which breaks every signature thumbnail and PDF.
 */
export async function compressSignature(base64: string): Promise<{
  base64: string;
  body: Blob;
  contentType: string;
}> {
  const dataUrl = `data:image/png;base64,${base64}`;
  const out = await manipulateAsync(
    dataUrl,
    [{ resize: { width: 400 } }],
    { compress: 1, format: SaveFormat.PNG, base64: true },
  );
  // Read the resulting bytes from the manipulator's file URI — `fetch(file://)`
  // and `readAsStringAsync` are reliable in RN/Hermes, unlike `fetch(data:url)`
  // which silently produces 0-byte blobs and corrupts every signature upload.
  const finalBase64 = out.base64
    ?? (out.uri
      ? await FileSystem.readAsStringAsync(out.uri, { encoding: FileSystem.EncodingType.Base64 })
      : base64);
  if (!finalBase64) throw new Error('manipulator returned no base64');
  // Sanity: confirm decoded byte length is non-zero before handing off to Supabase.
  const ab = dataUrlToArrayBuffer(`data:image/png;base64,${finalBase64}`);
  if (ab.byteLength === 0) throw new Error('signature body empty after base64 decode');
  // Read the file URI as a Blob — supabase-js's RN path handles Blob most
  // reliably, especially via the file:// fetch which preserves byte length.
  let body: Blob;
  if (out.uri) {
    body = await (await fetch(out.uri)).blob();
    if (!body || (body as any).size === 0) {
      // Fall back to ArrayBuffer-derived Blob if the file fetch was empty.
      body = new Blob([ab], { type: 'image/png' });
    }
  } else {
    body = new Blob([ab], { type: 'image/png' });
  }
  return { base64: finalBase64, body, contentType: 'image/png' };
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
    const { body, contentType } = await compressSignature(base64);
    await storageApi.upload(STORAGE_BUCKETS.signatures, path, body, contentType);
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
      const { body, contentType } = await compressSignature(item.base64);
      await storageApi.upload(STORAGE_BUCKETS.signatures, item.path, body, contentType);
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
    throw new Error('ხელმოწერის ატვირთვა ვერ მოხერხდა — შეამოწმე ინტერნეტი და სცადე თავიდან');
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
