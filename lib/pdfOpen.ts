import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { checkAndIncrementPdfCount } from './pdfGate';

export { PdfLimitReachedError } from './pdfGate';

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
 * If `userId` is provided the free-tier gate is enforced server-side before
 * the PDF is rendered. Throws `PdfLimitReachedError` if the cap is exceeded.
 *
 * Returns the local file URI on native so the caller can upload it;
 * returns null on web (no local file exists).
 */
export async function generateAndSharePdf(
  html: string,
  suggestedName?: string,
  keepCopy?: boolean,
  userId?: string,
): Promise<string | null> {
  if (Platform.OS === 'web') {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return null;
  }

  if (userId) {
    await checkAndIncrementPdfCount(userId);
  }

  const { uri } = await Print.printToFileAsync({ html });

  let shareUri = uri;
  let prettyUri: string | undefined;
  if (suggestedName) {
    const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    if (baseDir) {
      const safeName = suggestedName.replace(/\.pdf$/i, '') + '.pdf';
      prettyUri = `${baseDir}${safeName}`;
      try {
        // Delete any previous copy so copyAsync never clashes
        await FileSystem.deleteAsync(prettyUri, { idempotent: true });
      } catch { /* ignore */ }
      try {
        await FileSystem.copyAsync({ from: uri, to: prettyUri });
        shareUri = prettyUri;
      } catch {
        // fall back to raw temp URI if copy fails
        prettyUri = undefined;
      }
    }
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(shareUri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  }

  // Clean up the pretty copy if we made one (unless caller wants to keep it
  // for a deferred upload).
  if (prettyUri && shareUri === prettyUri && !keepCopy) {
    FileSystem.deleteAsync(prettyUri, { idempotent: true }).catch(() => {});
  }

  return prettyUri && keepCopy ? prettyUri : uri;
}
