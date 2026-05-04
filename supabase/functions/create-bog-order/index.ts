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

async function getBogToken(): Promise<string> {
  const clientId = Deno.env.get('BOG_CLIENT_ID')!;
  const clientSecret = Deno.env.get('BOG_CLIENT_SECRET')!;
  const credentials = btoa(`${clientId}:${clientSecret}`);

  const res = await fetch(
    'https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token',
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!jwt) return json({ error: 'unauthorized' }, 401);

    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) return json({ error: 'unauthorized' }, 401);

    const token = await getBogToken();
    const callbackUrl = Deno.env.get('BOG_CALLBACK_URL')!;

    const orderRes = await fetch('https://api.bog.ge/payments/v1/ecommerce/orders', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        callback_url: callbackUrl,
        external_order_id: user.id,
        purchase_units: {
          currency: 'GEL',
          total_amount: 19,
          basket: [
            {
              quantity: 1,
              unit_price: 19,
              product_id: 'sarke_pro_monthly',
              description: 'Sarke Pro — ყოველთვიური გამოწერა',
            },
          ],
        },
        redirect_urls: {
          success: 'sarke://payment/success',
          fail: 'sarke://payment/fail',
        },
        // TODO: enable card saving for auto-renewal when BOG approves recurring payments
        // save_payment_method: true,
      }),
    });

    if (!orderRes.ok) {
      const text = await orderRes.text();
      throw new Error(`BOG order error ${orderRes.status}: ${text}`);
    }

    const order = await orderRes.json();

    return json({
      order_id: order.id,
      redirect_url: order.redirect_url ?? order._links?.redirect?.href,
    });
  } catch (e) {
    console.error('create-bog-order error:', e);
    return json({ error: String(e) }, 500);
  }
});
