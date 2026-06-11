# Pre-flight Output — 2026-05-27

**Method:** Manual paste needed (Supabase CLI present at v2.98.2 but project is not linked to a remote ref — `supabase db query --linked` returned `Cannot find project ref. Have you run supabase link?`)
**Status:** Awaiting user paste

## How to fill this in

1. Open Supabase Studio for the production project → **SQL Editor**.
2. Open [`PRE_FLIGHT_QUERIES.sql`](PRE_FLIGHT_QUERIES.sql) at repo root.
3. Paste the file's contents into the editor. You can run each block individually (highlight + Run) or run the whole file at once.
4. For each block, copy the result table (or "Copy as CSV" / "Copy as JSON") and paste it into the matching section below, replacing the `[PASTE OUTPUT HERE]` placeholder.
5. Save this file and share it with the assistant before any migration is applied.

> **Read-only guarantee:** Every query in `PRE_FLIGHT_QUERIES.sql` is a `SELECT`. Nothing is altered.

---

## Query 0.1 — inspections schema

[PASTE OUTPUT HERE]

## Query 0.2 — equipment tables exist

[PASTE OUTPUT HERE]

## Query 0.3 — row counts per type

[PASTE OUTPUT HERE]

## Query 0.4 — collision check (CRITICAL)

[PASTE OUTPUT HERE]

**Pass criteria:** all rows = 0. Any non-zero value means a type-specific table row shares its id with an `inspections` row — the unify migration cannot run safely until that's resolved.

## Query 0.5 — FK surface

[PASTE OUTPUT HERE]

**Pass criteria:** at least `inspection_attachments_inspection_id_fkey` present. Note any additional FKs that target `inspections.id` — they will need to be considered in the migration plan.

---

## Next steps

After pasting all five sections, hand this file back to the assistant. No migrations will be applied until the assistant has reviewed the live results.
