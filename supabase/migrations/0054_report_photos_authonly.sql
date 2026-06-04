-- 0054_report_photos_authonly.sql
--
-- Fixes: report slide photos failing in the `report-photos` storage bucket — uploads
-- raised "new row violates row-level security policy", and reads/deletes were rejected too.
--
-- ── Root cause (path/folder mismatch) ───────────────────────────────────────
-- The DEPLOYED report-photos INSERT, SELECT and DELETE policies all required the REPORT
-- ID to be the FIRST folder in the object path (a path/`storage.foldername(name)[1]`
-- check). But the web app uploads to `${project_id}/${report_id}/file` — the first path
-- segment is the PROJECT id, never the report id — so the check never matched and EVERY
-- insert/read/delete was rejected.
--
-- (0019_reports.sql created auth-only policies in git, but 0020/0053 were applied
-- out-of-band via the Management API and replaced them with the path-scoped versions that
-- only lived in prod — classic migration drift.)
--
-- ── Fix ─────────────────────────────────────────────────────────────────────
-- All three report-photos policies are switched to AUTH-ONLY (gate on authentication, not
-- on the object path). INSERT must be auth-only regardless, because `owner` is NULL when
-- WITH CHECK runs. SELECT/DELETE are auth-only here because the path scheme is inconsistent
-- and this is a single-operator product (no account reads another's report photos).
--
-- The reports TABLE policies are intentionally NOT touched — 0044/0045/0046 already make
-- them owner-based (`user_id = auth.uid()`).
--
-- incident-photos is intentionally NOT touched — its INSERT was already auth-only (verified
-- 2026-06-04); it never had this bug.
--
-- ── Status ──────────────────────────────────────────────────────────────────
-- Applied to prod 2026-06-04 via the Supabase SQL editor and verified working (add a slide
-- with a photo → saves, photos display, delete works). This file is the canonical record.
-- Idempotent: safe to re-run.

drop policy if exists "report-photos insert" on storage.objects;
drop policy if exists "report-photos select" on storage.objects;
drop policy if exists "report-photos delete" on storage.objects;

create policy "report-photos insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'report-photos' and auth.uid() is not null);

create policy "report-photos select" on storage.objects
  for select to authenticated
  using (bucket_id = 'report-photos' and auth.uid() is not null);

create policy "report-photos delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'report-photos' and auth.uid() is not null);
