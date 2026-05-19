// Edge Function: fetch-regulation-dates
//
// Proxies matsne.gov.ge regulation pages and returns the last-amendment date
// for each URL. Exists because browsers cannot fetch matsne.gov.ge directly
// (no CORS headers on that site). The mobile app fetches natively via React
// Native; this bridges the gap for the web dashboard.
//
// Request body: { urls: string[] }  — must all be https://matsne.gov.ge/
// Response:     { dates: (string | null)[] }

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

function parseAmendmentDate(html: string): string | null {
  const marker = html.indexOf('ბოლო ცვლილება');
  if (marker !== -1) {
    const excerpt = html.slice(marker, marker + 400);
    const slash = excerpt.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (slash) return `${slash[1]}/${slash[2]}/${slash[3]}`;
  }
  const all = html.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/g);
  if (all && all.length) {
    const sorted = [...all].sort((a, b) => {
      const [da, ma, ya] = a.split('/').map(Number);
      const [db, mb, yb] = b.split('/').map(Number);
      return new Date(yb, mb - 1, db).getTime() - new Date(ya, ma - 1, da).getTime();
    });
    return sorted[0];
  }
  return null;
}

async function fetchOne(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    return parseAmendmentDate(await res.text());
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let urls: string[];
  try {
    const body = await req.json();
    if (!Array.isArray(body?.urls) || body.urls.length === 0) {
      return json({ error: 'urls must be a non-empty array' }, 400);
    }
    urls = body.urls;
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  // Allowlist: only proxy matsne.gov.ge to prevent open-proxy abuse.
  if (urls.some((u) => typeof u !== 'string' || !u.startsWith('https://matsne.gov.ge/'))) {
    return json({ error: 'Only https://matsne.gov.ge/ URLs are allowed' }, 400);
  }

  const dates = await Promise.all(urls.map(fetchOne));
  return json({ dates });
});
