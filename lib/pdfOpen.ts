import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

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
export async function generateAndSharePdf(html: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return null;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  }
  return uri;
}
