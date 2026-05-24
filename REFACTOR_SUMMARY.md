# Refactor Summary

A multi-phase, structural-only refactor of the Sarke 2.0 mobile app.
Goal: convert the god-files in a mixed flat/folder layout into a
feature-sliced architecture with co-located `AGENTS.md` per module.
Constraints honoured: local-only commits, no behavior changes,
`npm run typecheck` + `npm run check:primitives` pass after every
phase, `git mv` used wherever it preserves blame.

## Commits

| Hash      | Phase | Summary                                                                |
| --------- | ----- | ---------------------------------------------------------------------- |
| `49e1325` | 1     | Junk cleanup + dedupe (`__strings.txt`, unused `src/`, `components/ui.tsx` → `components/ui/`, rename `inspection*` folders). |
| `bd55845` | 2     | Split `app/inspections/[id]/wizard.tsx` (2,582 → 8 lines) into `features/inspection-wizard/`. |
| `0254343` | 3     | Split `lib/services.{real,mock}.ts` into `lib/services/{real,mock}/<domain>.ts` per-domain files. |
| `c794f9f` | 4.1   | Split `app/orders/new.tsx` (1,749 → 1 line) into `features/order-new/`.|
| `1064ede` | 4.2   | Move `app/projects/[id].tsx` (1,742 → 1 line) into `features/project-detail/`. |
| `5f467d5` | 4.3   | Split `lib/orderPdf.ts` (1,588 lines) into `lib/pdf/order/` (one file per doctype). |
| `6c1be1c` | 4.4   | Split `lib/inspectionPdfTemplate.ts` (1,112 lines) into `lib/pdf/inspection/`. |
| `da5690f` | 4.5   | Split `components/PhotoAnnotator.tsx` (754 lines) into `components/photo-annotator/`. |
| `a5afc95` | 4.6   | Split `components/wizard/kamari/KamariFlow.tsx` (713 lines) into per-step files. |
| `af4de5a` | 4.7   | Split `components/HarnessListFlow.tsx` (665 lines) into `components/harness-list/`. |
| `0802de7` | 5     | Backfill `AGENTS.md` across the remaining `components/` subfolders + update `CLAUDE.md`. |

## God-file outcomes (before → after)

| Original god-file                          | Before   | After (route/main file) | New feature/module           |
| ------------------------------------------ | -------- | ----------------------- | ---------------------------- |
| `app/inspections/[id]/wizard.tsx`          | 2,582    | **8**                   | `features/inspection-wizard/` (18 files) |
| `app/orders/new.tsx`                       | 1,749    | **1**                   | `features/order-new/` (16 files)         |
| `app/projects/[id].tsx`                    | 1,742    | **1**                   | `features/project-detail/` (3 files; ProjectDetail.tsx itself still ~1,470 — see "Next steps") |
| `lib/orderPdf.ts`                          | 1,588    | **5** (re-export barrel)| `lib/pdf/order/` (8 files: `_shared`, 6 builders, `index`) |
| `lib/inspectionPdfTemplate.ts`             | 1,112    | **6** (re-export barrel)| `lib/pdf/inspection/` (7 files: `_shared`, `template`, 4 renderers, `index`) |
| `lib/services.real.ts` + `lib/services.mock.ts` | 1,298 + 1,011 | folder-resolved `lib/services/index.ts` | `lib/services/real/*.ts` + `lib/services/mock/*.ts` (one file per domain) |
| `components/PhotoAnnotator.tsx`            | 754      | **500** (`PhotoAnnotator.tsx`) + 2 helper files | `components/photo-annotator/` |
| `components/wizard/kamari/KamariFlow.tsx`  | 713      | 5 (re-export barrel)    | `components/wizard/kamari/` (4 step files + `_shared` + `styles`) |
| `components/HarnessListFlow.tsx`           | 665      | **6** (re-export barrel)| `components/harness-list/` (3 components + `_shared` + `styles`) |

Top-level repo also gained a `features/` directory housing the three
new feature slices.

## Phases reverted or skipped

None. Every phase landed cleanly on the first attempt; `typecheck`
and `check:primitives` were green after each commit. No `git reset
--hard HEAD~1` was required at any point.

A handful of small follow-ups were chosen over forcing the splits:

- **Phase 4.2** (`features/project-detail/`): the orchestrator
  function is still ~1,470 lines. It's one tightly-coupled god-
  function with ~10 React Query state mirrors and ~700 lines of
  inline section JSX. Surgical sub-component extraction (arch
  header / each section card / `useProjectDetailData`) is left as
  the documented next step (see `features/project-detail/AGENTS.md`).
- **Phase 4.4** (`lib/pdf/inspection/template.ts`): the main
  `buildInspectionPdfTemplate` builder is still ~810 lines —
  dominated by inline CSS + page structure. Render helpers were
  extracted out into `_shared`, `renderQuestion`, `renderPhoto`,
  `renderSignatures`, `renderProjectBrand`. Splitting the CSS string
  further would be cosmetic.
- The original `lib/orderPdf.ts` and `lib/inspectionPdfTemplate.ts`
  paths are preserved as 4-line `export * from './pdf/...'` barrels
  so callers (including the separate `web-app/` codebase) keep
  working unchanged.
- `components/HarnessListFlow.tsx` and
  `components/wizard/kamari/KamariFlow.tsx` are likewise preserved
  as backwards-compat re-export barrels.

## Bugs spotted during the refactor

Copied verbatim from `REFACTOR_NOTES.md`:

### `features/inspection-wizard/GridRowStep.tsx` — conditional hook calls
The non-harness branch (`if (!isHarness) { ... }`) calls `useState` and
`useRef` after a conditional `return`. This violates the rules of hooks
and was present in the original god-file
(`app/inspections/[id]/wizard.tsx`, `GridRowStep`). Latent because the
parent (`WizardStepTransition`) unmounts/remounts on each step, so
`isHarness` is stable for the life of any one mount — but a future
refactor that keeps the same `GridRowStep` mounted across step
transitions would crash. Fix would be to split into `HarnessRowStep` +
`ScaffoldRowStep` components.

### `app/orders/new.tsx` — dead step components dropped
The original `NewOrderScreen` declared but never rendered
`StepSignDirector`, `StepSignAppointed`, and `StepSignCraneOperator`.
The fire-safety / crane flows render `StepSignaturesFireSafety` and
`StepSignaturesCrane` (the combined two-signature steps) instead.
Not carried over into `features/order-new/` since they had no callers.

### `features/inspection-wizard/MeasureInput.tsx` — unused styles factory
`useMemo(() => getstyles(theme), [theme])` is called and the result
discarded. Inherited from the original; left in for byte-for-byte
behavior parity but safe to delete.

## Typecheck / primitives status

- `npm run typecheck` — **clean** after every commit, including the
  final one.
- `npm run check:primitives` — **ok** after every commit. Phase 2
  added `features/` to `scripts/check-primitives.mjs`'s `SCAN_DIRS`
  so the same wrong-default guardrails apply inside the new feature
  folders.

No outstanding TS errors.

## Suggested next steps

1. **Further slim `features/project-detail/ProjectDetail.tsx`** —
   carve out:
   - `ProjectArchHeader.tsx` (SCREEN_W / SVG_H / SVG_EDGE_Y /
     AnimatedPath + scroll handler + arch SVG)
   - One file per section card (`InspectionsSection`,
     `BriefingsSection`, `IncidentsSection`, `FilesSection`,
     `ReportsSection`, `OrdersSection`, `BreathalyzerSection`)
   - `useProjectDetailData` hook gathering the ~10 React Query
     state-sync `useEffect`s
   - The `UnifiedInspection` builder/swipe-delete switch into its
     own `unifiedInspections.ts`.
2. **Fix the conditional-hook bug** in
   `features/inspection-wizard/GridRowStep.tsx` by splitting into
   `HarnessRowStep` + `ScaffoldRowStep`. Currently latent but a
   tripwire for any future refactor that changes `WizardStepTransition`'s
   unmount cadence.
3. **Delete the dead `useMemo(getstyles)` in
   `features/inspection-wizard/MeasureInput.tsx`** once the
   structural refactor settles — it's safe.
4. **Consider splitting `lib/pdf/inspection/template.ts`** further:
   pull the inline CSS string into `template.css.ts` so the JSX/HTML
   structure file drops below the component size target.
5. **Re-evaluate `web-app/src/components/inspections/`** — the web
   dashboard still has its own (similarly-shaped) god-file. Not in
   scope for this pass (mobile parity is not a goal per
   `CLAUDE.md`), but it could benefit from the same treatment.
6. **`useWizardState.ts`** in `features/inspection-wizard/` is
   ~590 lines (over the 150-line "hook" target). Splitting it into
   `useWizardLoad` + `useWizardAnswers` + `useWizardPersistence`
   would help — only worth doing if a clean seam appears; see
   `features/inspection-wizard/AGENTS.md` for the rationale.

## Branch state

Local-only. Eleven commits on `main`, all authored locally. Remote
not touched. Review with `git log c843074..HEAD --oneline` and
`git diff c843074..HEAD --stat` before pushing.
