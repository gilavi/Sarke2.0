// Hermes lacks crypto.getRandomValues, which Supabase's PKCE flow needs to
// generate the code verifier. This polyfill must load before @supabase/supabase-js.
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { AppState, type AppStateStatus } from 'react-native';

const extra = Constants.expoConfig?.extra ?? {};
export const SUPABASE_URL = extra.supabaseUrl as string;
export const SUPABASE_ANON_KEY = extra.supabaseAnonKey as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Supabase credentials missing from app.json "extra".');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

// Per Supabase RN docs: the auto-refresh interval keeps running while the app
// is backgrounded, then fires a burst of network calls on resume. Bind it to
// AppState so it pauses on background and resumes on active — cleaner foreground
// handover, no "mushy" stall right after the app comes back.
AppState.addEventListener('change', (next: AppStateStatus) => {
  if (next === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

export const STORAGE_BUCKETS = {
  certificates: 'certificates',
  answerPhotos: 'answer-photos',
  pdfs: 'pdfs',
  signatures: 'signatures',
  remoteSignatures: 'remote-signatures',
  projectFiles: 'project-files',
  incidentPhotos: 'incident-photos',
  reportPhotos: 'report-photos',
} as const;
