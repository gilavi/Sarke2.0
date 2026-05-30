# Unified Inspections — Implementation Record (web-app)

> Scope: `web-app/` only (Vite dashboard). Frontend-only, reuses existing Supabase tables, **no
> migrations / schema changes**. Captured inspection signatures are NEVER persisted (regulatory).
> Local only — nothing pushed to git.

## Status

**Phase 1 (shared engine) + Phase 2 (Bobcat re-expressed, Safety Net new) — DONE.**
- `npm run typecheck` → **green**
- `eslint` over all touched/new files → **clean (exit 0)**
- `npm test` → **737 passed / 0 failed / 1 skipped**

### Pre-existing issues (NOT introduced here, left as-is)
- `npm run lint` (the wrapper) crashes on **Windows** inside `scripts/check-no-shadows.mjs`
  (`import.meta.url` → doubled drive `C:\C:\…\src`). It passes on CI Linux. On Windows lint the
  changed files directly: `npx eslint <paths>`.
- `eslint .` reports ~20 errors in files unrelated to inspections (strict `react-hooks` plugin:
  `set-state-in-effect`, `no-explicit-any` in `components/ui/*`, `Scene3D`, `auth.tsx`,
  `InspectionPrint.tsx`, etc.). Pre-existing; none are in files this work created or modified.

## Architecture

One descriptor-driven flow whose look / step rhythm / conclusion / signature / PDF match the
harness flow, while keeping each act's full structure (specs, category-grouped checklists, 3-state
results, approve/limited/reject verdict).

```
web-app/src/lib/inspection/            # PDF engine — hand-mirror of Expo lib/inspection (@root banned)
  schema.ts        # InspectionSchema / PdfBlock DSL (+ AnyInspectionSchema escape hatch)
  pdf.ts           # buildInspectionPdf(schema, {inspection, projectName, signaturesSession}, photos)
  pdfStyles.ts     # BASE_PDF_CSS (byte-faithful to mobile)
  escape.ts        # escapeHtml / fmtDate
  renderSignaturesSection.ts  # in-memory, no-persist captured-signature block
  registry.ts      # getInspectionSchema(category) / INSPECTION_SCHEMAS
  schemas/{bobcat,safetyNet}.ts
  AGENTS.md

web-app/src/lib/types/<type>.ts        # catalogs + shapes (mirror Expo types/<type>.ts)
web-app/src/lib/data/<type>.ts         # thin repo; equipment types set parentInspection (RPC round-trip)

web-app/src/features/inspections/structured/
  types.ts                       # WizardDescriptor DSL (specs|checklist|verdict|custom steps)
  useStructuredInspection.ts     # lifecycle hook (create-vs-edit, queries, mutations, signature state)
  StructuredInspectionWizard.tsx # the engine (WizardFrame + step bodies + SuccessModal)
  StructuredActPage.tsx          # route entry: category -> wizard
  steps/{SpecStep,ChecklistStep,VerdictStep,StepBody}.tsx  # StepBody = edit-mode step dispatcher
  acts/{bobcat.ts,safetyNet.tsx,SafetyNetLoadTest.tsx,index.ts}  # per-act descriptors + registry
  AGENTS.md

web-app/src/pages/print/StructuredInspectionPrint.tsx   # ONE descriptor-driven print route
```

### Round-trip fix (important)
`lib/db/repository.ts` `makeRepository.create()` previously inserted ONLY into the type table — it
never created the parent `public.inspections` row, so web-created equipment rows did **not**
round-trip (the unified mobile list dispatches on `inspections.type`, and there is an FK
`<type>_inspections.id → inspections.id`). Added a `parentInspection: { type }` config option:
when set, `create()` generates the id client-side, calls the idempotent
`create_equipment_inspection` RPC to insert the parent row, then inserts the type row with the same
id — matching the Expo create path. Wired on `lib/data/bobcat.ts` (`bobcat`) and
`lib/data/safetyNet.ts` (`safety_net_inspection`).

### Create pattern
Harness-style: on `/<type>/new` the wizard shows only the specs step; "next" creates the row and
navigates to `/<type>/:id`, where the remaining steps unlock. No `/<type>/draft` dead-end (the
legacy equipment pages still use `usePendingCreate`; the structured engine does not).

## Category tags (match EXACTLY — 4 bare, 5 `_inspection`-suffixed)

| category / `inspections.type` | table | status |
|---|---|---|
| `bobcat` | `bobcat_inspections` | **unified engine ✓** (data+schema+wizard+print+picker) |
| `excavator` | `excavator_inspections` | legacy equipment page (Phase 3) |
| `general_equipment` | `general_equipment_inspections` | legacy equipment page (Phase 3) |
| `cargo_platform` | `cargo_platform_inspections` | legacy equipment page (Phase 3) |
| `safety_net_inspection` | `safety_net_inspections` | **unified engine ✓** (new, full slice) |
| `mobile_ladder_inspection` | `mobile_ladder_inspections` | not built (Phase 3) |
| `fall_protection_inspection` | `fall_protection_inspections` | not built (Phase 3) |
| `forklift_inspection` | `forklift_inspections` | not built (Phase 3) |
| `lifting_accessories_inspection` | `lifting_accessories_inspections` | not built (Phase 3) |

## Files ADDED / MODIFIED this session

ADDED: `lib/inspection/*` (escape, pdf, pdfStyles, renderSignaturesSection, schema, registry,
`schemas/{bobcat,safetyNet}`, AGENTS.md), `lib/types/safetyNet.ts`, `lib/data/safetyNet.ts`,
`features/inspections/structured/*` (types, hook, wizard, ActPage, 3 steps, 4 act files, AGENTS.md),
`pages/print/StructuredInspectionPrint.tsx`, this doc.

MODIFIED: `lib/db/repository.ts` (parentInspection + RPC), `lib/data/bobcat.ts` (parentInspection),
`app/routes.ts` + `app/router.tsx` (safety-net routes; bobcat new/detail/print → structured),
`app/queryKeys.ts` (`safetyNetKeys`), `pages/Inspections.tsx` (safety-net list/picker/delete),
`__tests__/lib/data/equipment.test.ts` (rpc mock + assertion), `CLAUDE.md`,
`features/inspections/equipment/AGENTS.md` (migration note).

> Note: there is no `web-app/README.md`; the repo has a single root `README.md` (Expo-focused).
> Inspection-engine docs live in CLAUDE.md + the two module AGENTS.md + this file.

## How to test (Phase 2 slice)

**Bobcat (re-expressed):** Inspections → "ახალი შემოწმება" → "ციცხვიანი დამტვირთველის…" → pick
project → specs → "შექმნა" → step the checklist (ნორმაში / ხარვეზი / გამოუსად. per category) →
verdict (დაშვებულია / პირობით / არ დაიშვება) + notes → "დასრულება" → SuccessModal → sign on the
completed act → "PDF". Re-open from the list → values persist. Confirm the row has
`category='bobcat'` AND `inspection_type='bobcat'` (parent row), and open it on mobile to confirm
round-trip.

**Safety Net (new):** same entry → "უსაფრთხოების ბადის…" → specs (general + net id) → visual
checklist (კარგი / გამოსასწ. / N/A) → load-test weight table (auto-totals) → post-test (pass/fail)
→ verdict → sign → PDF. Confirm `category=inspection_type='safety_net_inspection'`, the №477 badge +
weight table render in the PDF, and that no signature is persisted (state-only; the PDF embeds the
rasterized image from the in-memory session).

## Remaining (Phase 3 — after review)
- Re-express Excavator / General / Cargo on the unified engine (their data layers need
  `parentInspection` added too); then delete the legacy `inspections/equipment/*Detail.tsx`,
  `pages/New*Inspection.tsx`, `pages/print/*Print.tsx` once parity is confirmed.
- Build Mobile Ladder / Fall Protection / Forklift / Lifting Accessories (schema + types + data +
  descriptor + routes + picker), porting from Expo `lib/inspection/schemas/<type>.ts` +
  `types/<type>.ts`.
- Rework `pages/NewInspection.tsx` picker + remove the `/inspections/draft` + `/<type>/draft`
  dead-ends; mirror the Expo `registry.ts` dispatch so EVERY act launches its correct flow.
- Standardize the remaining equipment pages on `SignatureCapture` + retire `SignatureCanvas` /
  `InspectionSignatures` for inspection capture.

## Repo rules honored
- No `@root/*` imports in web-app (mirror/port instead).
- File-size targets respected (engine split into hook + orchestrator + steps + acts).
- typecheck / scoped-eslint / test green; no new violations.
- Existing `Inspections.tsx` uses bare `isLoading` (pre-existing); not changed by this work.
