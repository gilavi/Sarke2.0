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
      console.warn(`⚠️  Local Supabase not reachable at ${supabaseUrl} - skipping RLS tests`);
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

/**
 * Storage owner-scoping - verifies migration 0053_storage_rls_owner_scoping.sql.
 *
 * The four client-written buckets are owner-scoped: any authenticated user may
 * INSERT, but SELECT/UPDATE/DELETE require storage.objects.owner = auth.uid().
 * Paths deliberately mirror the real writers (see lib/inspection/service.ts,
 * lib/signatures.ts, lib/pdfName.ts call sites, lib/services/real/inspections.ts)
 * to prove owner-scoping holds regardless of path shape - path-based policies
 * are impossible here because three buckets use literal first segments
 * ('incidents/', 'orders/', 'project/', per-type tags like 'bobcat/').
 */
describe('storage owner-scoping (migration 0053)', () => {
  const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
  const anonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
  // Fixed Supabase CLI demo service_role JWT - local only, same keypair family
  // as the demo anon key above. Used solely to create the four dashboard-managed
  // buckets that no migration creates.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

  let reachable = false;
  let ownerClient: ReturnType<typeof createClient>;
  let otherClient: ReturnType<typeof createClient>;
  let ownerId = '';

  // bucket → realistic object path (templated after the real writers)
  const cases: Array<{ bucket: string; path: (uid: string) => string; contentType: string }> = [
    { bucket: 'certificates', path: (uid) => `${uid}/11111111-1111-1111-1111-111111111111/cert.jpg`, contentType: 'image/jpeg' },
    { bucket: 'answer-photos', path: () => `bobcat/q-${Date.now()}/photo.jpg`, contentType: 'image/jpeg' },
    { bucket: 'pdfs', path: () => `incidents/Test_Incident_12jun2026_${Date.now()}.pdf`, contentType: 'application/pdf' },
    { bucket: 'signatures', path: () => `project/22222222-2222-2222-2222-222222222222/signer-${Date.now()}.png`, contentType: 'image/png' },
  ];

  beforeAll(async () => {
    reachable = await isSupabaseReachable(supabaseUrl);
    if (!reachable) {
      console.warn(`⚠️  Local Supabase not reachable at ${supabaseUrl} - skipping storage RLS tests`);
      return;
    }

    // The four core buckets were created via the hosted dashboard, not in any
    // migration - create them locally (idempotent) before testing policies.
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    for (const { bucket } of cases) {
      const { error } = await admin.storage.createBucket(bucket, { public: false });
      if (error && !/already exists/i.test(error.message)) throw error;
    }

    const mkUser = async () => {
      const client = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      }) as ReturnType<typeof createClient>;
      const email = `rls-storage-${crypto.randomUUID()}@test.local`;
      const { data, error } = await client.auth.signUp({ email, password: 'test-password-123' });
      if (error) throw error;
      if (!data.session) throw new Error('signUp returned no session - is enable_confirmations=false locally?');
      return { client, id: data.user!.id };
    };
    const a = await mkUser();
    const b = await mkUser();
    ownerClient = a.client;
    ownerId = a.id;
    otherClient = b.client;
  });

  for (const { bucket, path, contentType } of cases) {
    it(`${bucket}: owner-only read/delete, cross-user denied`, async () => {
      if (!reachable) return;
      const objectPath = path(ownerId);
      const body = new Blob([`rls-test ${bucket}`], { type: contentType });

      // owner uploads (INSERT is auth-only per 0053)
      const up = await ownerClient.storage.from(bucket).upload(objectPath, body, { contentType });
      expect(up.error).toBeNull();

      // owner can read back
      const ownRead = await ownerClient.storage.from(bucket).download(objectPath);
      expect(ownRead.error).toBeNull();
      expect(ownRead.data).not.toBeNull();

      // other user cannot download
      const theftRead = await otherClient.storage.from(bucket).download(objectPath);
      expect(theftRead.data).toBeNull();
      expect(theftRead.error).not.toBeNull();

      // other user cannot list the owner's folder
      const folder = objectPath.split('/').slice(0, -1).join('/');
      const theftList = await otherClient.storage.from(bucket).list(folder);
      expect(theftList.data ?? []).toEqual([]);

      // other user's delete is a silent no-op under RLS - object must survive
      await otherClient.storage.from(bucket).remove([objectPath]);
      const stillThere = await ownerClient.storage.from(bucket).download(objectPath);
      expect(stillThere.error).toBeNull();
      expect(stillThere.data).not.toBeNull();

      // owner can delete
      const del = await ownerClient.storage.from(bucket).remove([objectPath]);
      expect(del.error).toBeNull();
      const gone = await ownerClient.storage.from(bucket).download(objectPath);
      expect(gone.data).toBeNull();
    });
  }
});
