import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { storageApi } from './services';
import { STORAGE_BUCKETS } from './supabase';

/**
 * Download a generated PDF from the `pdfs` bucket into the app cache and
 * hand it to the system share sheet. Silently no-ops if sharing isn't
 * available on this platform.
 *
 * `storagePath` is the object path inside STORAGE_BUCKETS.pdfs
 * (i.e. what `Questionnaire.pdf_url` holds).
 */
export async function shareStoredPdf(storagePath: string): Promise<void> {
  const url = storageApi.publicUrl(STORAGE_BUCKETS.pdfs, storagePath);
  const name = storagePath.split('/').pop() ?? 'report.pdf';
  const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!baseDir) throw new Error('No filesystem directory available for PDF sharing');
  const localUri = baseDir + name;
  const { uri } = await FileSystem.downloadAsync(url, localUri);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
  }
}
