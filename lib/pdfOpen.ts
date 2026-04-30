import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Generate a PDF from HTML and open/share it on the current platform.
 *
 * Web: opens the HTML in a new browser tab — the user can use the browser's
 *      print-to-PDF function. Storage upload is the caller's responsibility
 *      (impossible on web without a real PDF binary).
 *
 * iOS/Android: calls expo-print to convert HTML to a local PDF file, then
 *              opens the native share sheet via expo-sharing.
 *
 * Returns the local file URI on native so the caller can upload it;
 * returns null on web (no local file exists).
 */
export async function generateAndSharePdf(
  html: string,
  suggestedName?: string,
): Promise<string | null> {
  if (Platform.OS === 'web') {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return null;
  }
  const { uri } = await Print.printToFileAsync({ html });

  let shareUri = uri;
  if (suggestedName) {
    const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    if (baseDir) {
      const safeName = suggestedName.replace(/\.pdf$/i, '') + '.pdf';
      const prettyUri = `${baseDir}${safeName}`;
      try {
        // Delete any previous copy so copyAsync never clashes
        await FileSystem.deleteAsync(prettyUri, { idempotent: true });
      } catch { /* ignore */ }
      try {
        await FileSystem.copyAsync({ from: uri, to: prettyUri });
        shareUri = prettyUri;
      } catch {
        // fall back to raw temp URI if copy fails
      }
    }
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(shareUri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  }

  // Clean up the pretty copy if we made one
  if (shareUri !== uri) {
    FileSystem.deleteAsync(shareUri, { idempotent: true }).catch(() => {});
  }

  return uri;
}
