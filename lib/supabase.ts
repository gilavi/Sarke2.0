import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};
const SUPABASE_URL = extra.supabaseUrl as string;
const SUPABASE_ANON_KEY = extra.supabaseAnonKey as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Supabase credentials missing from app.json "extra".');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const STORAGE_BUCKETS = {
  certificates: 'certificates',
  answerPhotos: 'answer-photos',
  pdfs: 'pdfs',
  signatures: 'signatures',
  remoteSignatures: 'remote-signatures',
} as const;
