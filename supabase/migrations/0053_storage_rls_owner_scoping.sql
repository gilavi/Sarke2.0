-- 0053_storage_rls_owner_scoping.sql
-- Owner-scopes storage RLS on certificates / answer-photos / pdfs / signatures,
-- replacing the permissive dashboard-created sarke_* policies (bucket_id-only).
-- Companion to 0020 (incident-photos / report-photos). Closes the open P0 in BUG_REPORT.md.
--
-- Scoping model: OWNER-BASED. All uploads to these buckets are client-side with the
-- user's JWT, so storage.objects.owner is reliably auth.uid(). Path-based scoping is
-- avoided because path schemes are inconsistent across mobile (generic + specialized)
-- and web. INSERT stays gated on authentication only: owner is not populated when the
-- WITH CHECK predicate runs, so owner = auth.uid() would reject every insert (mirrors
-- 0020's incident-photos INSERT decision).
--
-- ASSUMPTION (confirmed single-operator): no account legitimately reads files uploaded
-- by a different account in these buckets. Remote-signer signatures live in the separate
-- remote-signatures bucket (already token-scoped in 0011) and are out of scope.
--
-- Applied via the Supabase Management API SQL endpoint (same channel as 0020); this file
-- is the canonical record.

-- ---------- drop the permissive dashboard policies ----------
-- 4 policies total (one per command), each spanning all four buckets via ANY(ARRAY[...]).
-- Dropping by exact name removes them regardless of the bucket span.
drop policy if exists "sarke_insert_authenticated" on storage.objects;
drop policy if exists "sarke_read_authenticated"   on storage.objects;
drop policy if exists "sarke_update_authenticated" on storage.objects;
drop policy if exists "sarke_delete_authenticated" on storage.objects;

-- ---------- make re-runs idempotent: drop our own policies first ----------
drop policy if exists "certificates owner read"    on storage.objects;
drop policy if exists "certificates owner update"  on storage.objects;
drop policy if exists "certificates owner delete"  on storage.objects;
drop policy if exists "certificates auth insert"   on storage.objects;
drop policy if exists "answer-photos owner read"   on storage.objects;
drop policy if exists "answer-photos owner update" on storage.objects;
drop policy if exists "answer-photos owner delete" on storage.objects;
drop policy if exists "answer-photos auth insert"  on storage.objects;
drop policy if exists "pdfs owner read"            on storage.objects;
drop policy if exists "pdfs owner update"          on storage.objects;
drop policy if exists "pdfs owner delete"          on storage.objects;
drop policy if exists "pdfs auth insert"           on storage.objects;
drop policy if exists "signatures owner read"      on storage.objects;
drop policy if exists "signatures owner update"    on storage.objects;
drop policy if exists "signatures owner delete"    on storage.objects;
drop policy if exists "signatures auth insert"     on storage.objects;

-- ---------- certificates ----------
create policy "certificates owner read" on storage.objects
  for select to authenticated
  using (bucket_id = 'certificates' and owner = auth.uid());

create policy "certificates owner update" on storage.objects
  for update to authenticated
  using      (bucket_id = 'certificates' and owner = auth.uid())
  with check (bucket_id = 'certificates' and owner = auth.uid());

create policy "certificates owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'certificates' and owner = auth.uid());

create policy "certificates auth insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'certificates' and auth.uid() is not null);

-- ---------- answer-photos ----------
create policy "answer-photos owner read" on storage.objects
  for select to authenticated
  using (bucket_id = 'answer-photos' and owner = auth.uid());

create policy "answer-photos owner update" on storage.objects
  for update to authenticated
  using      (bucket_id = 'answer-photos' and owner = auth.uid())
  with check (bucket_id = 'answer-photos' and owner = auth.uid());

create policy "answer-photos owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'answer-photos' and owner = auth.uid());

create policy "answer-photos auth insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'answer-photos' and auth.uid() is not null);

-- ---------- pdfs ----------
create policy "pdfs owner read" on storage.objects
  for select to authenticated
  using (bucket_id = 'pdfs' and owner = auth.uid());

create policy "pdfs owner update" on storage.objects
  for update to authenticated
  using      (bucket_id = 'pdfs' and owner = auth.uid())
  with check (bucket_id = 'pdfs' and owner = auth.uid());

create policy "pdfs owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'pdfs' and owner = auth.uid());

create policy "pdfs auth insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'pdfs' and auth.uid() is not null);

-- ---------- signatures ----------
-- NOTE: web-app/src/pages/IncidentDetail.tsx:375 reads this bucket via getPublicUrl,
-- which bypasses RLS and only resolves if the bucket is public. This migration does not
-- change the bucket's public flag, so it cannot break that read further.
create policy "signatures owner read" on storage.objects
  for select to authenticated
  using (bucket_id = 'signatures' and owner = auth.uid());

create policy "signatures owner update" on storage.objects
  for update to authenticated
  using      (bucket_id = 'signatures' and owner = auth.uid())
  with check (bucket_id = 'signatures' and owner = auth.uid());

create policy "signatures owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'signatures' and owner = auth.uid());

create policy "signatures auth insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'signatures' and auth.uid() is not null);
