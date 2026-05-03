import AsyncStorage from '@react-native-async-storage/async-storage';

export type PdfLanguage = 'ka' | 'en';

const KEY = 'pdf_language';
const DEFAULT: PdfLanguage = 'ka';

export async function loadPdfLanguage(): Promise<PdfLanguage> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v === 'en' || v === 'ka' ? v : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export async function savePdfLanguage(lang: PdfLanguage): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, lang);
  } catch {
    // ignore — preference is best-effort
  }
}
