-- Large Loader (დიდი ციცხვიანი დამტვირთველი) inspection template.
-- Reuses the bobcat_inspections table (migration 0024) — same schema,
-- same RLS, same PDF flow.  Only the checklist items differ (33 items
-- vs 30 for the bobcat; item IDs 1-32 + 40).
--
-- category = 'bobcat' routes this template to the same dedicated screen
-- (/inspections/bobcat/[id]); the screen detects the templateId to load
-- the correct catalog (LARGE_LOADER_ITEMS).

insert into templates (id, owner_id, name, category, is_system, required_qualifications, required_signer_roles)
values (
  '44444444-4444-4444-4444-444444444444',
  null,
  'დიდი ციცხვიანი დამტვირთველის შემოწმება',
  'bobcat',
  true,
  array[]::text[],
  array['expert']::signer_role[]
)
on conflict (id) do nothing;
