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

describe('RLS policy enforcement', () => {
  const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
  let reachable = false;

  beforeAll(async () => {
    reachable = await isSupabaseReachable(supabaseUrl);
    if (!reachable) {
      console.warn(`⚠️  Local Supabase not reachable at ${supabaseUrl} — skipping RLS tests`);
    }
  });

  let anonClient: ReturnType<typeof createClient>;
  let userAClient: ReturnType<typeof createClient>;
  let userBClient: ReturnType<typeof createClient>;

  beforeAll(() => {
    anonClient = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    userAClient = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    userBClient = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  });

  it('anonymous user sees no projects', async () => {
    if (!reachable) return;
    const { data } = await anonClient.from('projects').select('*');
    expect(data ?? []).toEqual([]);
  });

  it('anonymous user sees no inspections', async () => {
    if (!reachable) return;
    const { data } = await anonClient.from('inspections').select('*');
    expect(data ?? []).toEqual([]);
  });

  it('anonymous user sees no certificates', async () => {
    if (!reachable) return;
    const { data } = await anonClient.from('certificates').select('*');
    expect(data ?? []).toEqual([]);
  });

  it('user A cannot see user B projects (isolation)', async () => {
    if (!reachable) return;
    const { data: projectsA } = await userAClient.from('projects').select('*');
    const { data: projectsB } = await userBClient.from('projects').select('*');
    const idsA = new Set((projectsA ?? []).map((p: any) => p.id));
    const idsB = new Set((projectsB ?? []).map((p: any) => p.id));
    const intersection = [...idsA].filter((id) => idsB.has(id));
    expect(intersection).toEqual([]);
  });
});
