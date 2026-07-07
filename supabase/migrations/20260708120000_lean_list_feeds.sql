-- Network-lean list feeds — strip signature payloads out of the list/recent
-- queries and count certificates server-side.
--
-- Problem (perf audit, dimension perf-network):
--   * briefings list feeds used select('*'): every row carries each
--     participant's base64 signature PNG inside the `participants` JSONB plus
--     the `inspector_signature` base64 column. A 10-participant briefing row is
--     hundreds of KB; the 50-row Home/History feed re-downloads them at every
--     login warm-up and re-persists them into the AsyncStorage query cache.
--     List surfaces only render topics / participant count / date.
--   * orders list feeds shipped the full `form_data` JSONB, which embeds base64
--     director/appointed/operator signatures for several order types. List rows
--     render only document_type + created_at.
--   * certificate count badges fetched one `inspection_id` row per certificate
--     (capped at 10k) and counted client-side.
--
-- Fix: two SECURITY INVOKER views (RLS of the base tables applies to the
-- caller) that null out the signature payloads, plus a grouped-count RPC.
-- Detail/PDF paths keep reading the base tables via getById and stay complete.
-- Clients fall back to the legacy queries when these objects aren't deployed
-- yet (lib/briefingsApi.ts, lib/ordersApi.ts, lib/services/real/qualifications.ts).

-- ── briefings_list_lean ───────────────────────────────────────────────────────
-- Same columns the app's DbRow mapper reads, but each participants[] element
-- has `signature` forced to null (names/skipped flags survive so
-- `participants.length` and the roster stay correct) and inspector_signature
-- is null. `briefings` has no updated_at column; toModel falls back to
-- created_at exactly as it does for the base table.

create or replace view public.briefings_list_lean
with (security_invoker = true) as
select
  b.id,
  b.project_id,
  b.user_id,
  b.date_time,
  b.topics,
  case
    when b.participants is null or jsonb_typeof(b.participants) <> 'array'
      then '[]'::jsonb
    else coalesce(
      (
        select jsonb_agg(
                 case
                   when jsonb_typeof(e.elem) = 'object'
                     then jsonb_set(e.elem, '{signature}', 'null'::jsonb)
                   else e.elem
                 end
                 order by e.ord)
          from jsonb_array_elements(b.participants) with ordinality as e(elem, ord)
      ),
      '[]'::jsonb)
  end as participants,
  null::text as inspector_signature,
  b.inspector_name,
  b.status,
  b.created_at
from public.briefings b;

grant select on public.briefings_list_lean to authenticated;

-- ── orders_list_lean ──────────────────────────────────────────────────────────
-- Full row minus the base64 signature keys inside form_data. Every other
-- form_data field (order numbers, names, dates) survives, so any list consumer
-- reading text fields keeps working; only the image blobs are list-stripped.

create or replace view public.orders_list_lean
with (security_invoker = true) as
select
  o.id,
  o.project_id,
  o.user_id,
  o.document_type,
  (o.form_data - array['directorSignature', 'appointedSignature', 'operatorSignature'])
    as form_data,
  o.status,
  o.pdf_url,
  o.pdf_hash,
  o.created_at,
  o.updated_at
from public.orders o;

grant select on public.orders_list_lean to authenticated;

-- ── get_certificate_counts(uuid[]) ────────────────────────────────────────────
-- Grouped per-inspection certificate counts for the History badge: ≤ one row
-- per inspection instead of one row per certificate. RLS on `certificates`
-- (owner = auth.uid()) scopes the counts, so SECURITY INVOKER is sufficient.
-- search_path pinned per CLAUDE.md.

create or replace function public.get_certificate_counts(p_inspection_ids uuid[])
returns table (
  inspection_id uuid,
  cert_count    bigint
)
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
  select c.inspection_id, count(*)::bigint as cert_count
    from certificates c
   where c.inspection_id = any(p_inspection_ids)
   group by c.inspection_id;
$$;

grant execute on function public.get_certificate_counts(uuid[]) to authenticated;
