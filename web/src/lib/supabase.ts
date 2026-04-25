import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  // Throw at module load — easier to catch in build than to debug a 401 later.
  throw new Error(
    'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set at build time.',
  );
}

// Anon-only client. The web app never calls authenticated endpoints; all
// privileged work goes through SECURITY DEFINER RPCs that validate the token.
// We disable session persistence to avoid leaving auth state in a kiosk-style
// shared browser if the recipient is on someone else's device.
export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

export const REMOTE_SIGNATURES_BUCKET = 'remote-signatures';
