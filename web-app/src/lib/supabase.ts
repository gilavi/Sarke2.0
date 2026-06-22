import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Database } from '@/types/database';

// Validate the build-time env once, with a clear message instead of a vague
// runtime crash deep in a query. The client is parameterized on the generated
// schema types (src/types/database.ts, `npm run gen:types`) so every
// `.from('table')` is type-checked end-to-end.
const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url('VITE_SUPABASE_URL must be a valid URL'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'VITE_SUPABASE_ANON_KEY is required'),
});

const parsed = envSchema.safeParse(import.meta.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid Supabase environment. Copy .env.example to .env.\n${issues}`);
}

export const supabase = createClient<Database>(
  parsed.data.VITE_SUPABASE_URL,
  parsed.data.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  },
);

// Web-side equivalent of the password-reset deep link target the mobile app uses.
// Hash-prefixed because we're on HashRouter (see App.tsx for why).
export function passwordResetRedirect(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}#/reset`;
}

// Where Supabase sends the browser back after an OAuth (Google/Apple) sign-in.
// Deliberately NO hash: the PKCE auto-exchange (`detectSessionInUrl`) reads the
// `?code=…` Supabase appends from `window.location.search`, which a `#/route`
// fragment would push the query into. Landing on the app root (`/app/`) hits the
// `/` route, where MarketingLayout bounces the now-authenticated session to /home.
export function oauthRedirect(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}`;
}
