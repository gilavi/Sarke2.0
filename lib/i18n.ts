import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ka from '../locales/ka.json';
import en from '../locales/en.json';

const STORAGE_KEY = 'app_language';

const resources = {
  ka: { translation: ka },
  en: { translation: en },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ka',
    fallbackLng: 'ka',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export async function loadStoredLanguage() {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'ka') {
      await i18n.changeLanguage(stored);
    }
  } catch {
    // ignore
  }
}

export async function saveLanguage(lang: 'ka' | 'en') {
  await AsyncStorage.setItem(STORAGE_KEY, lang);
  await i18n.changeLanguage(lang);
}

export async function loadStoredPdfLanguage(): Promise<'ka' | 'en'> {
  try {
    const stored = await AsyncStorage.getItem('pdf_language');
    if (stored === 'en' || stored === 'ka') return stored;
  } catch {
    // ignore
  }
  return (i18n.language as 'ka' | 'en') ?? 'ka';
}

export async function savePdfLanguage(lang: 'ka' | 'en') {
  await AsyncStorage.setItem('pdf_language', lang);
}

export default i18n;
