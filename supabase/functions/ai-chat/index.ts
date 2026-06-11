// Edge Function: ai-chat
//
// Public AI support assistant for the HUBBLE marketing site. Proxies a short
// chat to the Anthropic Messages API so the API key never reaches the browser.
// Invoked by the unauthenticated /contact page widget, so this function runs
// with `verify_jwt = false` (see supabase/config.toml).
//
// Required Supabase secret (set via `supabase secrets set`):
//   ANTHROPIC_API_KEY — key from console.anthropic.com
//
// Request body: { messages: { role: 'user' | 'assistant'; content: string }[] }
// Response:     { reply: string } | { error: string }
//
// Abuse/cost guards (public endpoint): cheap model + small max_tokens, an
// input length/turn cap, and a best-effort in-memory per-IP throttle (resets on
// cold start — fine for v1; move to a DB/Upstash counter for hard limits).

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

const MODEL = 'claude-haiku-4-5';
const MAX_TOKENS = 512;
const MAX_TURNS = 12;        // total messages accepted per request
const MAX_TOTAL_CHARS = 4000; // summed across all message contents

// Best-effort per-IP rate limit: max N requests per rolling window.
const RATE_MAX = 10;
const RATE_WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_MAX;
}

const SYSTEM_PROMPT = `შენ ხარ HUBBLE-ის (ხაბლი) მხარდაჭერის ასისტენტი. HUBBLE არის ქართული შრომის უსაფრთხოების ციფრული პლათფორმა: ციფრული შემოწმების აქტები, GPS ფოტოები, დაშიფრული PDF (SHA256), ციფრული ხელმოწერები, კალენდარი/შეხსენებები და ქართული კანონმდებლობის (№477 დადგენილება) მონიტორინგი. iOS-ზე ხელმისაწვდომია App Store-ში; Android მუშავდება. ფასი: უფასო ტარიფი (3 PDF/თვეში) და PRO (₾1/თვეში, შეუზღუდავი, BOG-ით გადახდა).

წესები:
- უპასუხე მოკლედ, თბილად და ქართულად.
- ისაუბრე მხოლოდ HUBBLE-სა და შრომის უსაფრთხოებაზე. სხვა თემაზე თავაზიანად თქვი, რომ ვერ დაეხმარები.
- არ მისცე ავტორიტეტული იურიდიული რჩევა — კონკრეტული სამართლებრივი საკითხებისთვის მიუთითე matsne.gov.ge ან hello@hubble.ge.
- თუ არ იცი პასუხი ან საჭიროა ადამიანი, მიმართე hello@hubble.ge-ზე.`;

type Msg = { role: 'user' | 'assistant'; content: string };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json({ error: 'not_configured' }, 500);

  const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  if (rateLimited(ip)) return json({ error: 'rate_limited' }, 429);

  let messages: Msg[];
  try {
    const body = await req.json();
    messages = Array.isArray(body?.messages) ? body.messages : [];
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  // Validate + clamp.
  messages = messages
    .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_TOTAL_CHARS) }))
    .slice(-MAX_TURNS);

  if (messages.length === 0) return json({ error: 'empty' }, 400);
  const totalChars = messages.reduce((n, m) => n + m.content.length, 0);
  if (totalChars > MAX_TOTAL_CHARS) return json({ error: 'too_long' }, 413);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('anthropic_error', res.status, detail);
      return json({ error: 'upstream_error' }, 502);
    }

    const data = await res.json();
    const reply = (data?.content ?? [])
      .filter((b: { type?: string }) => b?.type === 'text')
      .map((b: { text?: string }) => b.text ?? '')
      .join('')
      .trim();

    return json({ reply: reply || 'ბოდიში, ვერ მოვახერხე პასუხის გენერაცია. სცადე თავიდან.' });
  } catch (e) {
    console.error('ai_chat_exception', e);
    return json({ error: 'internal_error' }, 500);
  }
});
