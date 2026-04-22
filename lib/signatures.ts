import AsyncStorage from '@react-native-async-storage/async-storage';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { supabase, STORAGE_BUCKETS } from './supabase';
import { storageApi } from './services';

const PENDING_KEY = 'pending-signatures';

interface PendingSignature {
  path: string;
  base64: string;
  contentType: string;
}

/**
 * Normalize a drawn signature PNG: constrain to max 400x150, PNG encode.
 * `base64` is the raw base64 string (no data: prefix) from SignatureCanvas.
 *
 * Returns a tuple of `{ base64, blob, contentType }` ready to upload.
 */
export async function compressSignature(base64: string): Promise<{
  base64: string;
  blob: Blob;
  contentType: string;
}> {
  const dataUrl = `data:image/png;base64,${base64}`;
  const out = await manipulateAsync(
    dataUrl,
    [{ resize: { width: 400 } }],
    { compress: 1, format: SaveFormat.PNG, base64: true },
  );
  const finalBase64 = out.base64 ?? base64;
  const res = await fetch(`data:image/png;base64,${finalBase64}`);
  const blob = await res.blob();
  return { base64: finalBase64, blob, contentType: 'image/png' };
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
    const { blob, contentType } = await compressSignature(base64);
    await storageApi.upload(STORAGE_BUCKETS.signatures, path, blob, contentType);
    return { path, pending: false };
  } catch {
    // queue for retry
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
      const { blob, contentType } = await compressSignature(item.base64);
      await storageApi.upload(STORAGE_BUCKETS.signatures, item.path, blob, contentType);
    } catch {
      still.push(item);
    }
  }
  await writePending(still);
}

/**
 * Write `users.saved_signature_url` for the current user after uploading
 * their expert signature. Returns the storage path.
 */
export async function saveExpertSignature(base64: string): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('არ ხართ შესული');
  const path = `expert/${userId}.png`;
  await uploadSignature(path, base64);
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
