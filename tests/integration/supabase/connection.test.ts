import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

async function isSupabaseReachable(url: string, timeoutMs = 1500): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${url}/rest/v1/`, { signal: controller.signal });
    clearTimeout(timer);
    return res.status === 401 || res.status === 200;
  } catch {
    return false;
  }
}

describe('Supabase local integration', () => {
  const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
  let reachable = false;

  beforeAll(async () => {
    reachable = await isSupabaseReachable(supabaseUrl);
    if (!reachable) {
      console.warn(`⚠️  Local Supabase not reachable at ${supabaseUrl} — skipping integration tests`);
    }
  });

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  it('can connect to local Supabase', async () => {
    if (!reachable) return;
    const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    expect(error).toBeNull();
  });

  it('anonymous user cannot read users table (RLS)', async () => {
    if (!reachable) return;
    const { data } = await supabase.from('users').select('*').limit(1);
    expect(data).toEqual([]);
  });

  it('health endpoint responds', async () => {
    if (!reachable) return;
    const res = await fetch(`${supabaseUrl}/rest/v1/`);
    expect(res.status).toBeOneOf([200, 401]);
  });
});
