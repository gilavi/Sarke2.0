// Edge Function: send-signing-sms
//
// Sends a Twilio SMS to a remote signer and marks the request as 'sent'.
// Called by the mobile app after creating (or resending) a signing request.
//
// Required Supabase secrets (set via `supabase secrets set`):
//   TWILIO_ACCOUNT_SID   — Account SID from twilio.com/console
//   TWILIO_AUTH_TOKEN    — Auth Token from twilio.com/console
//   TWILIO_FROM_NUMBER   — Your Twilio phone number, e.g. +12015551234
//
// Request body: { requestId: string }
// Response:     { ok: true } | { error: string }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SIGN_WEB_URL = 'https://gilavi.github.io/Sarke2.0';

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

// Strict E.164: '+' followed by 8–15 digits, first digit 1–9.
function isE164(phone: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

// Tight delays so the function never hangs the caller. Network exceptions
// retry (likely the request never reached Twilio); 5xx is NOT retried
// because Twilio may have actually queued the SMS — duplicate-send risk
// outweighs transient-failure recovery. The client gets `retryable: true`
// in the response and can re-invoke if it wants.
const RETRY_DELAYS_MS = [200, 600];

async function postTwilioWithRetry(
  url: string,
  init: RequestInit,
): Promise<Response> {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await fetch(url, init);
    } catch (e) {
      if (attempt >= RETRY_DELAYS_MS.length) throw e;
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
    }
  }
  throw new Error('twilio_unreachable');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'unauthorized' }, 401);

    // Use service-role client so we can bypass RLS for the update, but verify
    // the caller's JWT ourselves so we know which expert is sending.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt);
    if (authErr || !user) return json({ error: 'unauthorized' }, 401);

    // ── Parse body ────────────────────────────────────────────────────────
    const { requestId } = await req.json() as { requestId?: string };
    if (!requestId) return json({ error: 'missing requestId' }, 400);

    // ── Fetch & validate the signing request ──────────────────────────────
    const { data: rsr, error: rsrErr } = await supabase
      .from('remote_signing_requests')
      .select('*')
      .eq('id', requestId)
      .eq('expert_user_id', user.id) // callers can only send their own requests
      .single();

    if (rsrErr || !rsr) return json({ error: 'not_found' }, 404);
    if (!['pending', 'sent'].includes(rsr.status as string)) {
      return json({ error: 'consumed', status: rsr.status }, 400);
    }
    if (new Date(rsr.expires_at as string) <= new Date()) {
      await supabase
        .from('remote_signing_requests')
        .update({ status: 'expired' })
        .eq('id', requestId);
      return json({ error: 'expired' }, 400);
    }

    // Validate the signer phone is E.164 BEFORE we hit Twilio. A malformed
    // number wastes a Twilio call and leaves the request stuck in 'pending'.
    const signerPhone = (rsr.signer_phone as string | null)?.trim() ?? '';
    if (!isE164(signerPhone)) {
      return json({ error: 'invalid_phone', phone: signerPhone }, 400);
    }

    // ── Build SMS body ────────────────────────────────────────────────────
    const signingUrl = `${SIGN_WEB_URL}/#/sign/${rsr.token}`;
    const smsBody =
      `${rsr.signer_name}, გთხოვთ ხელი მოაწეროთ სარკეს ინსპექციის რეპორტს:\n` +
      `${signingUrl}\n` +
      `(ლინკი 14 დღეში იწურება)`;

    // ── Send via Twilio ───────────────────────────────────────────────────
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken  = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
      return json({ error: 'twilio_not_configured' }, 500);
    }

    let twilioRes: Response;
    try {
      twilioRes = await postTwilioWithRetry(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: signerPhone,
            From: fromNumber,
            Body: smsBody,
          }).toString(),
        },
      );
    } catch (e) {
      console.error('Twilio unreachable after retries:', e);
      // Leave status as-is so the client can resend. Don't flip to 'sent'.
      return json({ error: 'twilio_unreachable', retryable: true }, 502);
    }

    if (!twilioRes.ok) {
      const errBody = await twilioRes.json().catch(() => ({})) as { message?: string; code?: number };
      console.error('Twilio error:', twilioRes.status, errBody);
      return json(
        {
          error: errBody.message ?? 'twilio_error',
          code: errBody.code,
          retryable: twilioRes.status >= 500,
        },
        502,
      );
    }

    // ── Mark sent ─────────────────────────────────────────────────────────
    await supabase
      .from('remote_signing_requests')
      .update({ status: 'sent', last_sent_at: new Date().toISOString() })
      .eq('id', requestId);

    return json({ ok: true });
  } catch (e) {
    console.error('send-signing-sms error:', e);
    return json({ error: String(e) }, 500);
  }
});
