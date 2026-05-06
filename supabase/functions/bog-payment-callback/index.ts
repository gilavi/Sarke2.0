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

const isSandbox = Deno.env.get('BOG_ENV') !== 'production';
const BOG_OAUTH_URL = isSandbox
  ? 'https://oauth2-sandbox.bog.ge/auth/realms/bog/protocol/openid-connect/token'
  : 'https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token';
const BOG_API_BASE = isSandbox
  ? 'https://api-sandbox.bog.ge'
  : 'https://api.bog.ge';

async function getBogToken(): Promise<string> {
  const clientId = Deno.env.get('BOG_CLIENT_ID')!;
  const clientSecret = Deno.env.get('BOG_CLIENT_SECRET')!;
  const credentials = btoa(`${clientId}:${clientSecret}`);

  const res = await fetch(
    BOG_OAUTH_URL,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`BOG token error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

// Maps BOG order_status keys to our payment_records.status enum.
function mapBogStatus(bogStatus: string): 'pending' | 'success' | 'failed' | 'refunded' {
  switch (bogStatus) {
    case 'completed':
      return 'success';
    case 'refunded':
    case 'refunded_partially':
      return 'refunded';
    case 'rejected':
    case 'declined':
    case 'expired':
      return 'failed';
    default:
      return 'pending';
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // BOG sends the webhook as { event, zoned_request_time, body: { order_id, ... } }
    // Older/newer variants put the id at the top level — accept all three.
    const body = await req.json();
    console.log('BOG webhook body:', JSON.stringify(body));
    const orderId: string =
      body.body?.order_id ??
      body.body?.id ??
      body.order_id ??
      body.id;
    if (!orderId) return json({ error: 'missing order_id' }, 400);

    // Re-verify payment status server-side — never trust the redirect alone
    const token = await getBogToken();
    const verifyRes = await fetch(
      `${BOG_API_BASE}/payments/v1/receipt/${orderId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!verifyRes.ok) {
      const text = await verifyRes.text();
      throw new Error(`BOG verify error ${verifyRes.status}: ${text}`);
    }

    const order = await verifyRes.json();
    console.log('BOG order verify response:', JSON.stringify(order));

    // external_order_id was set to the user's Supabase userId when the order was created
    const userId: string = order.external_order_id;
    if (!userId) return json({ error: 'missing external_order_id in order' }, 400);

    // BOG returns order_status as { key, value } where key is e.g. "completed".
    const paymentStatus: string =
      order.order_status?.key ??
      order.order_status ??
      order.payment_status ??
      order.status ??
      'unknown';

    const recordStatus = mapBogStatus(paymentStatus);

    // Record every callback (success + failure + intermediate). Unique index on
    // (bog_order_id, status) prevents duplicate rows when BOG retries the webhook.
    const amount = Number(order.purchase_units?.transfer_amount ?? order.amount ?? 0) || null;
    const currency =
      order.purchase_units?.currency_code ??
      order.currency ??
      'GEL';

    const { error: insertError } = await supabase
      .from('payment_records')
      .upsert(
        {
          user_id: userId,
          bog_order_id: orderId,
          amount,
          currency,
          status: recordStatus,
          raw_callback: order,
        },
        { onConflict: 'bog_order_id,status', ignoreDuplicates: true },
      );

    if (insertError) {
      // Log but don't fail the callback — recording history is best-effort.
      console.error('Failed to insert payment_record:', insertError);
    }

    if (paymentStatus !== 'completed') {
      // Not yet paid — BOG may call this webhook multiple times
      return json({ ok: true, status: paymentStatus });
    }

    // Activate subscription for 30 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Extract card token if BOG returned one (for future auto-renewal)
    const cardToken: string | null =
      order.payment_detail?.card_token ??
      order.card_token ??
      null;

    // Renewal clears subscription_cancelled_at — user is opting back in.
    const { error: updateError } = await supabase
      .from('users')
      .update({
        subscription_status: 'active',
        subscription_expires_at: expiresAt.toISOString(),
        subscription_cancelled_at: null,
        ...(cardToken ? { bog_card_token: cardToken } : {}),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Failed to activate subscription:', updateError);
      return json({ error: 'db update failed' }, 500);
    }

    console.log(`Subscription activated for user ${userId}, expires ${expiresAt.toISOString()}`);
    return json({ ok: true });
  } catch (e) {
    console.error('bog-payment-callback error:', e);
    return json({ error: String(e) }, 500);
  }
});
