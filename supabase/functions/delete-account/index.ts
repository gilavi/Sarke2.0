// Edge Function: delete-account
//
// Deletes the calling user's auth.users row (and cascades to any FK-linked
// rows configured with ON DELETE CASCADE).
//
// Server-side because `supabase.auth.admin.deleteUser()` requires the service
// role key - calling it from the client would mean shipping the service key
// in the bundle, which would let any user delete any other user. The Edge
// Function reads the caller's JWT (passed automatically by
// `supabase.functions.invoke` from a signed-in client) and only deletes the
// user identified by that JWT.
//
// Apple requires an in-app account deletion path for App Store submission
// (App Store Review Guideline 5.1.1(v)); this is the backing endpoint for
// the "ანგარიშის წაშლა" row on the in-app Profile screen.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Server misconfigured' }, 500);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing auth token' }, 401);

  // 1. Resolve caller from their JWT (anon client + caller's bearer token).
  const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await callerClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json({ error: 'Invalid session' }, 401);
  }
  const userId = userData.user.id;

  // 2. Service-role client to perform the privileged delete.
  const admin = createClient(supabaseUrl, serviceKey);
  const { error: deleteErr } = await admin.auth.admin.deleteUser(userId);
  if (deleteErr) {
    return json({ error: deleteErr.message }, 500);
  }

  return json({ ok: true });
});
