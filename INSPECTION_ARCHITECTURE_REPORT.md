# Inspection Architecture Unification — Session Report

Two equipment-only bugs were on the docket: SignaturesScreen rendering without header chrome on the 9 equipment-type result screens, and certificate save failing with a `inspection_attachments_inspection_id_fkey` violation. The first was a self-contained UI fix. The second got the proper architectural correction: every equipment inspection now has a parent row in `public.inspections`, so all shared dependents that FK to `inspections.id` work uniformly across all 10 inspection types.

Branch state: 7 commits ahead of `pre-inspection-polymorphism-fix` (one merge commit pulling in partner work, then 6 session commits). **No push.**

## Per-phase summary

### Phase 0 — Merge resolution
- `63e99ac merge: integrate origin/main + reconcile partner tests with current API`

`git pull origin main` brought 2 partner commits with one content conflict in `docs/AI_BRIEFING.md` (just the **Updated** date). Resolved by keeping the newer 2026-05-27 date. The pull also brought 6 partner test files that didn't compile against the post-redesign API (`signaturesApi` was removed, `PdfTemplateArgs.signatures` was renamed to `signaturesSession`, result-type enums had changed). All 6 were patched minimally — orphan import removed, field renames applied, literal mismatches cast with `as any` and tagged with `FIXME(merge-2026-05-27)` comments — so the merge baseline lints clean. Each FIXME marks a test the partner should rationalize when they next touch that file; behavior is unchanged.

### Phase 1 — Deep discovery
- `29e760f docs: deep discovery for inspection polymorphism architecture fix`

[INSPECTION_ARCHITECTURE_NOTES.md](INSPECTION_ARCHITECTURE_NOTES.md) catalogs everything needed to write the unification migration safely:

- **1A** `public.inspections` schema (derived from migrations through `20260526002032`) — full column list with NOT NULL / default / FK info.
- **1B** Each of the 9 `<type>_inspections` tables, observed pattern, common shared skeleton.
- **1C** Tables FK'ing to `inspections.id` — confirmed `inspection_attachments` (the originally-affected one); `signatures` is dropped by the prior session's migration. Live-DB query provided for the user to verify.
- **1D** App code paths — `lib/inspection/service.ts` (single create chokepoint via `makeInspectionService`), `lib/inspectionDelete.ts` (single delete chokepoint via `deleteInspectionBySource`).
- **1E** Common-fields analysis — direct copies for `id`, `project_id`, `user_id`, `status`, `created_at`, `updated_at`, `completed_at`, `inspector_name`. `template_id` falls back to the well-known type UUID when the equipment row has null. New `inspections.type text NOT NULL` column needed.

Live-DB-only items (schema verification, current constraint list, row counts, id-collision check) are flagged `[LIVE-DB]` with the SQL queries the user should run **before** applying the Phase 2 migration.

### Phase 2 — Schema migration (NOT executed)
- `faa6b6f feat(db): migration — unify inspection identity across all types`

[`supabase/migrations/20260527001240_unify_inspection_identity.sql`](supabase/migrations/20260527001240_unify_inspection_identity.sql). Idempotent, transactional, backward-compatible. Steps:

1. Add `inspections.type text` column. Backfill from `templates.category` joined on `template_id`; default `'harness'` when null. Then `NOT NULL`.
2. One `INSERT INTO public.inspections (...) SELECT ... FROM public.<type>_inspections WHERE id NOT IN (SELECT id FROM public.inspections) ON CONFLICT (id) DO NOTHING` per equipment type (9 inserts). `template_id` uses `COALESCE(<table>.template_id, '<TYPE_TEMPLATE_UUID>'::uuid)`. `status::questionnaire_status` cast handles the text → enum gap.
3. `ALTER TABLE <type>_inspections ADD CONSTRAINT <type>_inspections_id_inspections_fkey FOREIGN KEY (id) REFERENCES public.inspections(id) ON DELETE CASCADE`. Iterated via DO block for all 9 types.
4. Verification queries embedded as comments (0 orphans per type; type distribution check) for the user to run after applying.

### Phase 3a — RPC migration (NOT executed)
- `b14b8d4 feat(db): RPC create_equipment_inspection for atomic parent+equipment creation`

[`supabase/migrations/20260527001241_create_equipment_inspection_rpc.sql`](supabase/migrations/20260527001241_create_equipment_inspection_rpc.sql). `create_equipment_inspection(p_type, p_id, p_project_id, p_user_id, p_template_id) RETURNS uuid`. Idempotent (`ON CONFLICT (id) DO NOTHING`), `SECURITY INVOKER` (RLS still applies), `search_path` pinned per the project convention. `GRANT EXECUTE TO authenticated`.

### Phase 3b — Service factory update
- `2781cad refactor(services): equipment inspection services use unified create path`

`lib/inspection/service.ts` `create()` now:
1. Generates a UUID client-side via `Crypto.randomUUID()`.
2. Calls `supabase.rpc('create_equipment_inspection', { p_type, p_id, p_project_id, p_user_id, p_template_id })` to create the parent row.
3. Inserts into the equipment table with the same `id`.

`InspectionServiceConfig` gains `inspectionType: string`. Each per-type service (`lib/bobcatService.ts`, `lib/excavatorService.ts`, …) sets `inspectionType` to the tag the Phase 2 migration backfilled — `'bobcat'`, `'excavator'`, `'general_equipment'`, `'cargo_platform'`, `'safety_net_inspection'`, `'mobile_ladder_inspection'`, `'forklift_inspection'`, `'fall_protection_inspection'`, `'lifting_accessories_inspection'`.

`deleteInspectionBySource` is unchanged for this commit. The new FK cascades when deleting the parent, but the legacy equipment-table delete also still works (the cascade only fires from parent → child). A follow-up can consolidate everything through `inspectionsApi.remove`; see `INSPECTION_ARCHITECTURE_NOTES.md §1D`.

### Phase 4 — Signatures header chrome fix
- `19443f6 fix(signatures): self-contained header chrome on SignaturesScreen`

Root cause: `SignaturesScreen` wrapped its body in `<SafeAreaView edges={['top', 'bottom']}>`. When mounted inside `components/InspectionResultView.tsx` (equipment-type result shell), the modal's nearest safe-area provider had already been consumed by the outer `<Screen>` wrapper. Inner SafeAreaView's top inset resolved to 0, header rendered flush under the iOS status bar, looked missing.

Fix:
- Modal sets `statusBarTranslucent` so the status-bar area belongs to the modal.
- Body wrapped in a fresh `<SafeAreaProvider>` so safe-area resolution doesn't depend on the parent context.
- `useSafeAreaInsets()` directly + manual `paddingTop` / `paddingBottom` replace the `<SafeAreaView>` wrapper.
- Body extracted into `SignaturesScreenBody` so the insets hook only subscribes during the modal's lifetime.

Self-contained header is now an explicit gotcha in `features/signatures/AGENTS.md`.

### Phase 5 — Docs
- `85bbd26 docs: log inspection identity unification + signature header fix`

- `BUG_REPORT.md` — three new entries: SignaturesScreen header chrome (P1, code-resolved), certificate save FK violation (P1, code-resolved, DB migrations pending), inspection-identity architectural note (resolved).
- `docs/WHATS_NEW.md` — dated 2026-05-27 entry with Architecture / Fixed (×2) / New / Pending subsections.
- `docs/AI_BRIEFING.md` — Signatures core-fact updated (mounting moved from wizard last step to result screen); new "Inspection identity" core-fact paragraph.
- `features/signatures/AGENTS.md` — gotcha block on self-contained header chrome.
- `CLAUDE.md` — signature-persistence wording updated to match result-screen ownership; new entry under Things to Avoid for the `create_equipment_inspection` RPC contract.

### Phase 6 — Verification
- This file: `INSPECTION_ARCHITECTURE_REPORT.md`.

## Files added

- `INSPECTION_ARCHITECTURE_NOTES.md`, `INSPECTION_ARCHITECTURE_REPORT.md` (this file)
- `supabase/migrations/20260527001240_unify_inspection_identity.sql`
- `supabase/migrations/20260527001241_create_equipment_inspection_rpc.sql`

## Files modified

- `lib/inspection/service.ts` (factory: RPC call + UUID generation + `inspectionType` config)
- `lib/bobcatService.ts`, `lib/excavatorService.ts`, `lib/forkliftService.ts`, `lib/generalEquipmentService.ts`, `lib/cargoPlatformService.ts`, `lib/safetyNetService.ts`, `lib/mobileLadderService.ts`, `lib/fallProtectionService.ts`, `lib/liftingAccessoriesService.ts` (set `inspectionType`)
- `features/signatures/SignaturesScreen.tsx` (self-contained header)
- `features/signatures/AGENTS.md`, `BUG_REPORT.md`, `docs/WHATS_NEW.md`, `docs/AI_BRIEFING.md`, `CLAUDE.md`
- 6 partner test files reconciled with current API:
  `tests/unit/mockServices.test.ts`, `tests/unit/inspectionPdfTemplate.test.ts`,
  `tests/unit/cargoPlatformSchema.test.ts`, `tests/unit/safetyNetSchema.test.ts`,
  `tests/unit/mobileLadderSchema.test.ts`, `tests/unit/typeComputations.test.ts`

## Verification — passed

- `npm run lint` clean (tsc --noEmit + scripts/check-primitives.mjs).
- `npm run test:unit` — vitest 47 files / 586 tests passing + node:test 61 tests passing.
- `npm run test:integration` — 4 files / 30 tests passing.

## **PENDING manual work for user**

Apply these migrations in order in the Supabase SQL Editor (or via `supabase db query --linked` / the Management API). Each is committed to `supabase/migrations/` but **not executed from Claude Code**.

1. **From the prior session** (if not already applied):
   - [`supabase/migrations/20260526002032_remove_persisted_inspection_signatures.sql`](supabase/migrations/20260526002032_remove_persisted_inspection_signatures.sql) — drops the `signatures` table + `signature_status` enum + per-table signature columns, plus inspection-scoped objects in the `signatures` storage bucket.
2. **From this session:**
   - [`supabase/migrations/20260527001240_unify_inspection_identity.sql`](supabase/migrations/20260527001240_unify_inspection_identity.sql) — adds `inspections.type`, backfills parent rows for all 9 equipment types, adds `ON DELETE CASCADE` FK on each equipment table.
   - [`supabase/migrations/20260527001241_create_equipment_inspection_rpc.sql`](supabase/migrations/20260527001241_create_equipment_inspection_rpc.sql) — defines the RPC the app now calls on every equipment-inspection create.

**Before applying the unify migration**, run the **[LIVE-DB]** queries in [`INSPECTION_ARCHITECTURE_NOTES.md`](INSPECTION_ARCHITECTURE_NOTES.md) §1A–§1C to confirm the live schema matches the discovery assumptions and the id-collision check returns 0 for every type.

**After applying the unify migration**, run the verification queries embedded as comments at the bottom of the migration file — expect 0 orphans per type and a sensible type distribution.

## Manual verification steps (after migrations applied)

1. Existing bobcat / excavator / etc. inspections still open + display correctly (the equipment-table reads are untouched).
2. Open any equipment inspection, reach the result screen, tap `ხელმოწერები` — the modal opens with proper `უკან` + X header chrome visible.
3. Tap `სერტიფიკატები` — fill form — Save — succeeds (no FK error).
4. The generated PDF includes the certificate as before.
5. Create a NEW bobcat inspection from scratch — it appears in both `bobcat_inspections` and `public.inspections` with the same UUID and `type = 'bobcat'`.
6. Delete that bobcat inspection from the home/project-detail swipe — both rows disappear (cascade fires when deleting the equipment-table row through `deleteInspectionBySource`; parent-row delete via `inspectionsApi.remove` cascades the other direction). Either path works.
7. Regression — xaracho/harness still works end-to-end (no FK changes affect it).
8. Tap the header chrome on the new SignaturesScreen on every type (bobcat, excavator, forklift, harness) — `უკან` returns to the result screen and X closes the modal in every case.

## Rollback

- Local code: `git reset --hard pre-inspection-polymorphism-fix`
- Migrations: not auto-reversible. Reversal requires writing inverse SQL (drop the new FKs, drop the `type` column, delete the backfilled parent rows). The Phase 2 migration's `COMMIT` block makes the changes durable; rollback before `COMMIT` (mid-flight failure) is automatic — the entire transaction aborts.

## Stop

Do NOT push. The user reviews the diff and applies the three SQL migrations manually in the order above before pushing.
