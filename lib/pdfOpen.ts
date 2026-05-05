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
  keepCopy?: boolean,
): Promise<string | null> {
  if (Platform.OS === 'web') {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return null;
  }

  // Wrap expo-print in a hard timeout so a stuck WebView can't freeze
  // the UI forever. Observed hangs on iOS when the HTML contains complex
  // Paged Media CSS (e.g. @bottom-center with counter()).
  const printPromise = Print.printToFileAsync({ html });
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('PDF generation timed out')), 30_000),
  );
  const { uri } = await Promise.race([printPromise, timeoutPromise]);

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
