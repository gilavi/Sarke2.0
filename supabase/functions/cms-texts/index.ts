// Edge Function: cms-texts
//
// Backend for the password-gated text CMS (cms/, hosted at hubble.ge/cms/) that
// lets co-workers correct the mobile app's Georgian/English UI strings. This
// function is the REAL security boundary: the client holds only a shared password
// (the owner's stated "only protection"), which is verified here per request. The
// service-role key — the thing that can actually write — never leaves the server.
//
// Public endpoint (verify_jwt = false in supabase/config.toml): the CMS has no
// Supabase user session, only the password.
//
// Required secrets (set via `supabase secrets set`):
//   CMS_PASSWORD                - the shared CMS password
// Auto-injected by the platform:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Request (POST JSON):
//   { action: 'load', password }
//     → { rows: { key, en, ka, updated_at }[] }
//   { action: 'save', password, editor?, changes: { key, en, ka }[] }
//     → { saved: number }   (only keys that ALREADY exist are written; no create/delete)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CMS is served from hubble.ge/cms/; allow that origin + localhost for dev.
const ALLOWED_ORIGINS = new Set([
  'https://hubble.ge',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
]);

function corsHeaders(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://hubble.ge';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function json(data: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });
}

// Constant-time string compare so a wrong password can't be timing-probed.
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

type Change = { key: string; en: string | null; ka: string | null };

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, origin);

  const password = Deno.env.get('CMS_PASSWORD');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const url = Deno.env.get('SUPABASE_URL');
  if (!password || !serviceKey || !url) return json({ error: 'not_configured' }, 500, origin);

  let body: { action?: string; password?: string; editor?: string; changes?: Change[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400, origin);
  }

  if (typeof body.password !== 'string' || !safeEqual(body.password, password)) {
    return json({ error: 'unauthorized' }, 401, origin);
  }

  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  if (body.action === 'load') {
    const { data, error } = await db
      .from('ui_strings')
      .select('key, en, ka, updated_at')
      .order('key', { ascending: true });
    if (error) return json({ error: 'load_failed', detail: error.message }, 500, origin);
    return json({ rows: data ?? [] }, 200, origin);
  }

  if (body.action === 'save') {
    const changes = Array.isArray(body.changes) ? body.changes : [];
    if (changes.length === 0) return json({ saved: 0 }, 200, origin);

    // Edit-only: reject any key that doesn't already exist, so the CMS can never
    // create or delete keys (which would diverge from the bundled JSON / break t()).
    const keys = changes.map((c) => c.key);
    const { data: existing, error: exErr } = await db
      .from('ui_strings')
      .select('key')
      .in('key', keys);
    if (exErr) return json({ error: 'save_failed', detail: exErr.message }, 500, origin);
    const known = new Set((existing ?? []).map((r: { key: string }) => r.key));
    const unknown = keys.filter((k) => !known.has(k));
    if (unknown.length > 0) {
      return json({ error: 'unknown_keys', keys: unknown }, 400, origin);
    }

    const editor = typeof body.editor === 'string' ? body.editor.slice(0, 80) : null;
    const rows = changes.map((c) => ({
      key: c.key,
      en: c.en ?? null,
      ka: c.ka ?? null,
      updated_at: new Date().toISOString(),
      updated_by: editor,
    }));
    const { error } = await db.from('ui_strings').upsert(rows, { onConflict: 'key' });
    if (error) return json({ error: 'save_failed', detail: error.message }, 500, origin);
    return json({ saved: rows.length }, 200, origin);
  }

  return json({ error: 'unknown_action' }, 400, origin);
});
