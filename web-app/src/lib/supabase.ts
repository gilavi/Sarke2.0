import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Validate the build-time env once, with a clear message instead of a vague
// runtime crash deep in a query.
//
// NOTE: schema types are generated to src/types/database.ts (`npm run gen:types`)
// but the client is intentionally NOT yet parameterized as
// `createClient<Database>` — doing so surfaces ~24 type errors across the data
// layer (generic-repo inserts, `as` casts, Json columns) that must be fixed in
// one pass alongside replacing the hand-written interfaces with Database-derived
// types. Deferred until the in-flight page migration is committed.
const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url('VITE_SUPABASE_URL must be a valid URL'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'VITE_SUPABASE_ANON_KEY is required'),
});

const parsed = envSchema.safeParse(import.meta.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid Supabase environment. Copy .env.example to .env.\n${issues}`);
}

export const supabase = createClient(
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
