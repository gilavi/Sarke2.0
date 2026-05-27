# Inspection Identity Unification — Discovery Notes (2026-05-27)

Pre-work for the architectural fix that gives every equipment inspection a parent row in `public.inspections`, so shared tables (`inspection_attachments` and any future cross-cutting concern) FK to one place and work uniformly across all 10 inspection types.

Some of the items the original prompt asked for can only be answered by querying the live DB. Those are flagged **[LIVE-DB]** with the SQL the user should run before applying the Phase 2 migration. Everything else is derived from the migration files in `supabase/migrations/`.

---

## 1A. `public.inspections` schema (derived from migration history)

Originated as `questionnaires` in [`0001_init.sql`](supabase/migrations/0001_init.sql); renamed to `inspections` in [`0006_inspections_certificates.sql`](supabase/migrations/0006_inspections_certificates.sql). Columns + nullability after all migrations through `20260526002032_remove_persisted_inspection_signatures.sql`:

| Column | Type | NOT NULL | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | yes | `uuid_generate_v4()` | PK |
| `project_id` | `uuid` | yes | — | FK → `projects(id)` ON DELETE CASCADE |
| `template_id` | `uuid` | yes | — | FK → `templates(id)` |
| `user_id` | `uuid` | yes | — | FK → `users(id)` ON DELETE CASCADE; later also CASCADE-FKed to `auth.users(id)` by `20260525183000_cascade_user_deletion.sql` |
| `status` | `questionnaire_status` enum | yes | `'draft'` | values: `'draft' \| 'completed'` |
| `harness_name` | `text` | no | — | harness-template specific |
| `conclusion_text` | `text` | no | — | |
| `is_safe_for_use` | `boolean` | no | — | |
| `created_at` | `timestamptz` | yes | `now()` | |
| `completed_at` | `timestamptz` | no | — | |
| `notes` | `text` | no | — | added in `0009_notes_column.sql` |
| `updated_at` | `timestamptz` | yes | `now()` | added in `0020_storage_rls_and_timestamps.sql` plus shared `set_updated_at()` trigger |
| `inspector_name` | `text` | no | — | added in `0033_inspections_add_inspector_name.sql` |
| `department` | `text` | no | — | added in `0036_inspections_add_department.sql` |
| `conclusion_photo_paths` | `text[]` | no | `'{}'` | added in `0052_inspection_conclusion_photos.sql` |

Columns intentionally **absent** (dropped by `20260526002032_remove_persisted_inspection_signatures.sql`, pending manual apply):
- `inspector_signature` (text) — dropped per the signatures redesign.
- `signatories` (jsonb) — dropped per the signatures redesign.

**[LIVE-DB] Verify the live shape and constraint set:**
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'inspections'
ORDER BY ordinal_position;

SELECT con.conname, pg_get_constraintdef(con.oid)
FROM pg_constraint con
JOIN pg_class c ON con.conrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' AND c.relname = 'inspections';

SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public' AND event_object_table = 'inspections';

SELECT count(*) FROM public.inspections;
```

---

## 1B. Equipment-table schemas (derived from migration files)

Each of the 9 equipment-type tables follows the same skeleton — only the type-specific payload columns differ. Verified against the `create table` blocks in:

- [0024_bobcat_inspections.sql](supabase/migrations/0024_bobcat_inspections.sql)
- [0026_excavator_template.sql](supabase/migrations/0026_excavator_template.sql)
- [0027_general_equipment_inspection.sql](supabase/migrations/0027_general_equipment_inspection.sql)
- [0040_cargo_platform_inspection.sql](supabase/migrations/0040_cargo_platform_inspection.sql)
- [0044_safety_net_inspection.sql](supabase/migrations/0044_safety_net_inspection.sql)
- [0045_mobile_ladder_inspection.sql](supabase/migrations/0045_mobile_ladder_inspection.sql)
- [0046_fall_protection_inspection.sql](supabase/migrations/0046_fall_protection_inspection.sql)
- [0047_forklift_inspection.sql](supabase/migrations/0047_forklift_inspection.sql)
- [0049_lifting_accessories_inspection.sql](supabase/migrations/0049_lifting_accessories_inspection.sql)

Shared skeleton:

| Column | Type | NOT NULL | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | yes | `gen_random_uuid()` | PK — note: different default function from `inspections` |
| `project_id` | `uuid` | yes | — | FK → `projects(id)` ON DELETE CASCADE |
| `template_id` | `uuid` | **no** | — | FK → `templates(id)` ON DELETE SET NULL — note: nullable here, NOT NULL on `inspections` |
| `user_id` | `uuid` | yes | — | FK → **`auth.users(id)`** ON DELETE CASCADE — note: FKs to auth.users directly, not the `public.users` mirror that `inspections.user_id` uses (same UUIDs, both populated) |
| `status` | `text` | yes | `'draft'` | CHECK in `('draft', 'completed')` — `inspections.status` is an enum |
| `inspector_name` | `text` | no | — | most types; fall_protection lacks it (per the service factory's notes) |
| `inspection_date` | `date` | yes | `current_date` | most types; not all |
| `created_at` | `timestamptz` | yes | `now()` | |
| `updated_at` | `timestamptz` | yes | `now()` | each table has its own `set_<type>_updated_at` trigger |
| `completed_at` | `timestamptz` | no | — | |
| (per-type payload) | various | varies | varies | items JSONB, summary photos, verdict, etc. |

**[LIVE-DB] Verify the live shape, row counts, and id collisions before applying the migration:**

```sql
-- Schema per table
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'bobcat_inspections','excavator_inspections','general_equipment_inspections',
    'cargo_platform_inspections','safety_net_inspections','mobile_ladder_inspections',
    'forklift_inspections','fall_protection_inspections','lifting_accessories_inspections'
  )
ORDER BY table_name, ordinal_position;

-- Row counts per type
SELECT 'bobcat' AS type, count(*) FROM public.bobcat_inspections
UNION ALL SELECT 'excavator', count(*) FROM public.excavator_inspections
UNION ALL SELECT 'general_equipment', count(*) FROM public.general_equipment_inspections
UNION ALL SELECT 'cargo_platform', count(*) FROM public.cargo_platform_inspections
UNION ALL SELECT 'safety_net', count(*) FROM public.safety_net_inspections
UNION ALL SELECT 'mobile_ladder', count(*) FROM public.mobile_ladder_inspections
UNION ALL SELECT 'forklift', count(*) FROM public.forklift_inspections
UNION ALL SELECT 'fall_protection', count(*) FROM public.fall_protection_inspections
UNION ALL SELECT 'lifting_accessories', count(*) FROM public.lifting_accessories_inspections;

-- Collision check: any equipment row whose id ALREADY exists in inspections?
-- (should return 0 for every type)
SELECT 'bobcat' AS type, count(*) FROM public.bobcat_inspections WHERE id IN (SELECT id FROM public.inspections)
UNION ALL SELECT 'excavator', count(*) FROM public.excavator_inspections WHERE id IN (SELECT id FROM public.inspections)
UNION ALL SELECT 'general_equipment', count(*) FROM public.general_equipment_inspections WHERE id IN (SELECT id FROM public.inspections)
UNION ALL SELECT 'cargo_platform', count(*) FROM public.cargo_platform_inspections WHERE id IN (SELECT id FROM public.inspections)
UNION ALL SELECT 'safety_net', count(*) FROM public.safety_net_inspections WHERE id IN (SELECT id FROM public.inspections)
UNION ALL SELECT 'mobile_ladder', count(*) FROM public.mobile_ladder_inspections WHERE id IN (SELECT id FROM public.inspections)
UNION ALL SELECT 'forklift', count(*) FROM public.forklift_inspections WHERE id IN (SELECT id FROM public.inspections)
UNION ALL SELECT 'fall_protection', count(*) FROM public.fall_protection_inspections WHERE id IN (SELECT id FROM public.inspections)
UNION ALL SELECT 'lifting_accessories', count(*) FROM public.lifting_accessories_inspections WHERE id IN (SELECT id FROM public.inspections);
```

---

## 1C. Tables FK'ing to `public.inspections.id` (the affected surface)

Confirmed from migration files: at least one.

- `inspection_attachments.inspection_id` → `inspections(id)` ON DELETE CASCADE  
  Constraint name (auto): `inspection_attachments_inspection_id_fkey`  
  Source: [`0021_inspection_attachments.sql`](supabase/migrations/0021_inspection_attachments.sql)  
  **This is the FK that fires the violation for equipment-type certificate inserts.** Once Phase 2 backfills parent rows, this FK silently starts succeeding for equipment types.

Historically also referenced (now removed by the signatures redesign):
- `signatures.inspection_id` — table dropped by `20260526002032_remove_persisted_inspection_signatures.sql`.
- `answers.inspection_id` — still present, but `answers` is only written by the generic questionnaire/harness flow, not by equipment screens (per `lib/inspection/service.ts` which never writes `answers`).

Tables that have `inspection_id` columns but do NOT FK to `public.inspections` (per the equipment-table convention):
- The 9 `<type>_inspections` tables have their own primary keys.
- `inspection_attachments` is the only known shared dependent.

**[LIVE-DB] Verify the full FK list:**
```sql
SELECT c.relname AS source_table, con.conname, pg_get_constraintdef(con.oid)
FROM pg_constraint con
JOIN pg_class c ON con.conrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_class rc ON con.confrelid = rc.oid
JOIN pg_namespace rn ON rc.relnamespace = rn.oid
WHERE n.nspname = 'public'
  AND con.contype = 'f'
  AND rn.nspname = 'public'
  AND rc.relname = 'inspections';
```
Anything beyond `inspection_attachments` returned here is an additional surface that silently benefits from Phase 2.

---

## 1D. App code paths

### Equipment inspection CREATE
Single chokepoint: [`lib/inspection/service.ts`](lib/inspection/service.ts) → `makeInspectionService` factory. Each equipment type (`lib/bobcatService.ts`, `lib/excavatorService.ts`, …) instantiates this factory with its table name + per-type columns. The factory's `create()` body at lines 71–92 does ONE `supabase.from(<table>).insert(...)` per call. Phase 3 wraps that with a parent-row `INSERT` (via the RPC) BEFORE the equipment insert.

### Equipment inspection DELETE
Single chokepoint: [`lib/inspectionDelete.ts`](lib/inspectionDelete.ts) → `deleteInspectionBySource`. Routes by `category` to the right table's `delete()`. Callers:
- [app/(tabs)/home.tsx:191](app/%28tabs%29/home.tsx#L191) — home swipe-delete
- [features/project-detail/unifiedInspections.ts:158](features/project-detail/unifiedInspections.ts#L158) — project-detail swipe-delete

After Phase 2, deleting from `public.inspections` cascades automatically to the equipment table via the new FK. So `deleteInspectionBySource` can be simplified to always delete from `inspections`, OR it can stay as-is (deleting from either side works — the cascade fires in only one direction so deleting from the equipment side won't touch the parent unless we add a reverse trigger; deleting the parent always cascades to the child). **Phase 3 recommendation:** keep `deleteInspectionBySource` deleting from the equipment table for now (no behavior change), then in a follow-up consolidate to always go through `inspections`. The latter would orphan no rows and is cleaner — but it's a separate refactor.

### Equipment inspection READ
Equipment screens read via `<type>Service.getById` → `supabase.from(<table>).select('*')...`. No code change needed in Phase 3 — equipment data still lives in the equipment table.

### Generic / harness CREATE
[`lib/services/real/inspections.ts`](lib/services/real/inspections.ts) and [`lib/services/mock/inspections.ts`](lib/services/mock/inspections.ts) own the `inspections` master table writes. These already insert into `public.inspections` directly; nothing changes for them.

### Template→type dispatch
[`lib/inspection/registry.ts`](lib/inspection/registry.ts) maps `template.category` → `{ schema, create }`. Used by:
- [`app/projects/[id].tsx`](app/projects/%5Bid%5D.tsx) — project-detail "new inspection" picker
- [`app/template/[id]/start.tsx`](app/template/%5Bid%5D/start.tsx) — template launch
- [`app/inspections/new.tsx`](app/inspections/new.tsx) — home "new inspection" full-screen entry

No change needed — registry's `create` signature stays the same after Phase 3.

---

## 1E. Common-fields analysis

Mapping for the parent-row backfill in Phase 2 (each equipment table → `public.inspections`):

| `inspections` column | Source from equipment table | Notes |
|---|---|---|
| `id` | `id` (same UUID) | The whole point of the unification — primary-key alignment |
| `project_id` | `project_id` | Direct copy |
| `template_id` | `template_id` (or fall back to the type's fixed UUID if null) | `inspections.template_id` is NOT NULL but equipment tables allow null. Backfill default: `BOBCAT_TEMPLATE_ID` etc. (the well-known UUIDs in `types/<type>.ts`). |
| `user_id` | `user_id` | Same UUID. `inspections.user_id` FKs to `users(id)` (public mirror); equipment FKs to `auth.users(id)`. The public mirror is populated for every signed-in user (it's required by the auth trigger), so the same UUID resolves on both sides. |
| `status` | `status` (cast text → questionnaire_status enum) | Both sides use `'draft'`/`'completed'` strings. |
| `created_at` | `created_at` | Direct copy |
| `updated_at` | `updated_at` | Direct copy |
| `completed_at` | `completed_at` | Direct copy |
| `inspector_name` | `inspector_name` (most types) / `null` (fall_protection — no column) | Nullable on `inspections` so `null` is fine. |
| `notes` | `null` | Equipment types track their own notes in payload-specific columns. |
| `harness_name` | `null` | Harness-template-specific column. |
| `conclusion_text` | `null` (equipment types have type-specific conclusion shape) | Nullable. |
| `is_safe_for_use` | `null` (equipment types use `verdict` enums) | Nullable. |
| `department` | `null` (equipment-type bobcat/general_equipment have their own `department` column from `0034`/`0035` — could be copied for those two, null for the rest) | Nullable. Copy where present; null where absent. Phase 2 SQL handles per-type. |
| `conclusion_photo_paths` | `'{}'` | Equipment types have type-specific photo arrays. |

### Type-column blocker
`public.inspections` does NOT currently have a `type` (or `kind` / `category`) column. The current routing uses `templates.category` joined via `template_id`. The Phase 2 migration **must add a `type` column** to `inspections` so the parent row tags its variant (`'harness' | 'bobcat' | 'excavator' | ...`).

Default for existing rows: `'harness'` is a reasonable backfill but is **not always correct** — generic xaracho/scaffolding flow uses `template.category = 'xaracho'`. Better backfill: `coalesce(t.category, 'harness')` joined on `templates`. The migration's Step 1 should do exactly that.

### No nullability conflicts
`inspections.template_id` NOT NULL vs equipment's nullable `template_id` is handled by the per-type backfill: if the equipment row's `template_id` is null, use the type's known template UUID. No `inspections` constraint needs relaxing.

---

## Phase 2 migration shape (preview)

Following from 1A–1E:

1. Add `inspections.type text` column. Backfill from `templates.category` for existing rows, default `'harness'` for nulls. Set `NOT NULL` once populated.
2. Per equipment type, `INSERT INTO public.inspections (id, type, project_id, template_id, user_id, status, ...) SELECT id, '<type>', project_id, COALESCE(template_id, '<TYPE_TEMPLATE_UUID>'), user_id, status::questionnaire_status, ... FROM public.<type>_inspections WHERE id NOT IN (SELECT id FROM public.inspections) ON CONFLICT (id) DO NOTHING;` — 9 inserts, one per type.
3. Add FK `<type>_inspections.id → inspections.id ON DELETE CASCADE` for each equipment type (a DO block iterates the 9 types).
4. Embedded verification queries (commented, for user to run after applying): 0 orphans per type; `SELECT type, count(*) FROM inspections GROUP BY type;`.

Phase 3:
- Add the `create_equipment_inspection(p_type, p_id, p_project_id, p_user_id, p_template_id)` RPC migration.
- Update `lib/inspection/service.ts` `create()` to call the RPC first, then insert into the equipment table with the same id.
- Leave `deleteInspectionBySource` unchanged (the new FK cascades when deleting from the parent; the legacy equipment-table delete also works since the parent has no auto-trigger to delete a child).

---

## Cross-cutting compatibility notes

- The `set_updated_at()` trigger that `0020` attached to `inspections` fires on any UPDATE. Backfill INSERTs in Step 2 won't fire it (it's BEFORE UPDATE only) — safe.
- RLS: each equipment table has its own `owner = auth.uid()` policy; `inspections` has `insp owner` policy. After Phase 2, both rows exist for the same user, so RLS continues to work uniformly.
- The `auth.users` cascade FK on `inspections.user_id` (added by `20260525183000`) covers the user-deletion path: deleting an auth user cascades to the parent inspection row, which then cascades to the equipment row via the new Phase 2 FK. Account deletion still works end-to-end.
- The `signatures` table FK was the only other inspection-id FK known at audit time; Phase 1's `20260526002032` migration drops it entirely, so by the time Phase 2 lands, only `inspection_attachments` remains as the cross-cutting dependent — exactly the table this fix is targeting.
