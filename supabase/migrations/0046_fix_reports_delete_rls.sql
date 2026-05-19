-- Fix reports DELETE RLS policy — same sub-query fragility as INSERT (0044)
-- and UPDATE (0045). Simplify to user_id = auth.uid().

drop policy if exists "reports owner delete" on reports;

create policy "reports owner delete" on reports
  for delete to authenticated
  using (user_id = auth.uid());
