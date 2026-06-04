-- 0054_report_photos_insert_authonly.sql
--
-- Fixes: "new row violates row-level security policy" when adding a slide WITH a
-- photo to a draft report (web-app/src/lib/data/reports.ts → addReportSlide()).
--
-- ── Root cause (migration drift) ────────────────────────────────────────────
-- Adding a slide does two writes:
--   1. storage INSERT into the `report-photos` bucket (only when a photo is attached)
--   2. UPDATE reports SET slides = … (the JSONB column)
-- The failure reproduces ONLY when a photo is attached, which isolates it to the
-- storage INSERT, not the reports table UPDATE.
--
-- In git, 0019_reports.sql created the CORRECT `report-photos` INSERT policy:
--     with check (bucket_id = 'report-photos' and auth.uid() is not null)   -- auth-only
-- but 0020_storage_rls_and_timestamps.sql is a one-line stub ("applied via the
-- Management API") and 0053 documents that 0020 owner-scoped the incident-photos /
-- report-photos buckets out-of-band. The deployed `report-photos` INSERT policy is
-- therefore almost certainly an OWNER- or PATH-based one that git never recorded:
--   • owner-based:  with check (... and owner = auth.uid())
--   • path-based:   with check ((storage.foldername(name))[1] = auth.uid()::text)
-- Both reject EVERY insert, because on a storage INSERT the `owner` column is NULL
-- when WITH CHECK runs (see 0053's header), and our upload path is
-- `${project_id}/${report_id}/…` — it starts with the project id, never the uid, so a
-- path-based `[1] = auth.uid()::text` check also fails.
--
-- ── Fix ─────────────────────────────────────────────────────────────────────
-- Re-assert the `report-photos` INSERT policy as AUTH-ONLY (the 0019 intent). INSERT
-- MUST stay auth-only — never owner/path-scoped — because `owner` is unpopulated at
-- WITH CHECK time. SELECT/DELETE on the bucket are deliberately NOT touched here:
-- `owner` IS populated for existing rows, so an owner-scoped SELECT/DELETE (if 0020
-- created one) is correct and surgical-minimal change is safest.
--
-- Also re-assert the reports table UPDATE policy as owner-based (user_id = auth.uid()),
-- matching 0045_fix_reports_update_rls.sql. This is belt-and-suspenders: if 0045 did
-- not reach prod (it is a numeric migration in a repo with known 0044/45/46 dup-number
-- drift), the JSONB UPDATE in step 2 would also fail with the same RLS error.
--
-- ── Apply ───────────────────────────────────────────────────────────────────
-- DO NOT auto-apply. Run the diagnostic SQL in web-app/AUDIT_FIXES_REPORT.md first.
-- If the diagnostic shows the deployed INSERT policy under a DIFFERENT name than the
-- ones dropped below, add `drop policy if exists "<that exact name>" on storage.objects;`
-- before the create. This file is idempotent and safe to re-run.

-- ── storage: report-photos INSERT → auth-only ───────────────────────────────
-- Drop every name this policy has plausibly been created under (0019 git name plus
-- the owner/auth naming 0020/0053 used for the other buckets), then recreate auth-only.
drop policy if exists "report-photos insert"       on storage.objects;
drop policy if exists "report-photos auth insert"  on storage.objects;
drop policy if exists "report-photos owner insert" on storage.objects;

create policy "report-photos insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'report-photos' and auth.uid() is not null);

-- ── reports table: UPDATE → owner-based (re-assert 0045) ─────────────────────
drop policy if exists "reports owner update" on reports;

create policy "reports owner update" on reports
  for update to authenticated
  using      (user_id = auth.uid())
  with check (user_id = auth.uid());
