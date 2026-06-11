# Refactor v2 — Polish Pass Summary

Follow-up to `REFACTOR_SUMMARY.md`. Five phases of structural polish,
plus one bonus extraction in Phase 4. Local-only. Every commit passed
`npm run lint` (`tsc --noEmit && check-primitives`).

## Commits

| Hash      | Phase | Summary                                                                |
| --------- | ----- | ---------------------------------------------------------------------- |
| `4247d48` | 1     | Remove dead `useMemo(getstyles)` in `MeasureInput.tsx`.                |
| `c0e273e` | 1*    | Tidy: gitignore `playwright-report/` + `test-results/` (accidentally tracked in the previous commit). |
| `940c7a8` | 2     | Extract `<style>` block from `lib/pdf/inspection/template.ts` into `template.css.ts` (`getInspectionPdfCss({ isPdf })`). |
| `584fb17` | 3     | Split `GridRowStep.tsx` into `HarnessRowStep.tsx` + `ScaffoldRowStep.tsx` to eliminate conditional hook calls; dispatch on `grid_rows[0] === 'N1'` moved up to `InspectionWizard.tsx`. |
| `fafa8f8` | 4a    | Extract `ProjectArchHeader.tsx` (`useArchAnimation` hook + `ProjectArchSvg` component). |
| `7bf5fef` | 4b    | Extract `useProjectDetailData.ts` consolidating 14 useStates + 17 queries + 12 syncs + the `loaded` aggregator. |
| `bc338a1` | 4c    | Extract `unifiedInspections.ts` (`UnifiedInspection` union, `buildUnifiedInspections` mapper, `deleteUnifiedInspection` swipe-delete dispatch). |
| `51c4fb2` | 4d    | Extract `sections/InspectionsSection.tsx`.                             |
| `e18ff8d` | 4e    | Extract `sections/IncidentsSection.tsx`.                               |
| `0d31433` | 4f    | Extract `sections/BriefingsSection.tsx`.                               |
| `3a6ba9f` | 4g    | Extract `sections/ReportsSection.tsx`.                                 |
| `8dd95cf` | 4h+4i | Extract `sections/FilesAndOrdersSection.tsx` (files + orders share one card on screen — combined into one component). |
| `4fb7fd9` | 4j    | Extract `sections/BreathalyzerSection.tsx`.                            |
| `0ab48ad` | 4j*   | Tidy: prune unused imports left behind by the section extractions.    |
| `92a4ea1` | 4k    | Bonus extraction: `LoadingSkeletonScreen.tsx` + `ProjectMapModal.tsx` (component + `useProjectMapModal` hook). |
| `b041ba1` | 4k*   | Update `features/project-detail/AGENTS.md` with the v2 internal files + gotchas. |
| `be7bf2e` | 5     | Extract `hooks/useWizardPersistence.ts` from `useWizardState.ts`; document why the rest stays merged. |

`*` rows are tidy/docs commits paired with the previous structural commit.

## File-size deltas

### Targets touched

| File                                              | Before (v2 start) | After (v2 end) | Delta  |
| ------------------------------------------------- | ----------------: | -------------: | -----: |
| `features/inspection-wizard/MeasureInput.tsx`     |              91   |             86 |    −5  |
| `lib/pdf/inspection/template.ts`                  |             832   |            281 |  −551  |
| `features/inspection-wizard/GridRowStep.tsx`      |             272   |       (deleted) |  −272  |
| `features/inspection-wizard/HarnessRowStep.tsx`   |   (new from split) |           169 |  +169  |
| `features/inspection-wizard/ScaffoldRowStep.tsx`  |   (new from split) |           146 |  +146  |
| `features/project-detail/ProjectDetail.tsx`       |           1,470   |            624 |  −846  |
| `features/inspection-wizard/useWizardState.ts`    |             593   |            558 |   −35  |

### New siblings created in v2

| File                                                                   | Lines |
| ---------------------------------------------------------------------- | ----: |
| `lib/pdf/inspection/template.css.ts`                                   |   560 |
| `features/project-detail/ProjectArchHeader.tsx`                        |   106 |
| `features/project-detail/useProjectDetailData.ts`                      |   169 |
| `features/project-detail/unifiedInspections.ts`                        |   171 |
| `features/project-detail/sections/InspectionsSection.tsx`              |   115 |
| `features/project-detail/sections/IncidentsSection.tsx`                |    67 |
| `features/project-detail/sections/BriefingsSection.tsx`                |    90 |
| `features/project-detail/sections/ReportsSection.tsx`                  |    97 |
| `features/project-detail/sections/FilesAndOrdersSection.tsx`           |   146 |
| `features/project-detail/sections/BreathalyzerSection.tsx`             |   115 |
| `features/project-detail/LoadingSkeletonScreen.tsx`                    |    40 |
| `features/project-detail/ProjectMapModal.tsx`                          |   206 |
| `features/inspection-wizard/hooks/useWizardPersistence.ts`             |    76 |

## Reverted / skipped

None. Every commit landed on the first attempt; lint stayed green
throughout. Two small chores were committed separately as
follow-ups when something had been overlooked in the preceding
structural commit (`c0e273e` for test artefacts, `0ab48ad` for
import pruning, `b041ba1` for AGENTS.md) — none were reverts.

The Phase 4 letter-of-the-instruction target was
`ProjectDetail.tsx < 300 lines`. The achieved value is **624 lines**.
The remaining bulk is:

- The map hero JSX (the small inline `<MapView>` preview that lives
  inside the arch — different from the full-screen map *modal*
  which was extracted as 4k).
- The hero logo + project name + address + phone JSX.
- File/upload action handlers (`uploadFile`, `pickPhotoWithPicker`,
  `pickDocuments`, `openFile`, `deleteFile`, `quickActions` memo,
  `onEditLogo`, `persistCrew`).
- The `EditProjectSheet` + `CustomDropdown` template-picker modals.
- The participants section (one inline `<RoleSlotList />`).

Splitting those into a `ProjectHero.tsx` and a `useProjectFileActions`
hook is the obvious next move but was deferred — it would have meant
threading the project mutation setters + `pickPhotoWithAnnotation`
ref through props, which felt borderline for "structural-only."
Logged in the AGENTS.md "Gotchas" + the "Suggested next steps"
below.

## Phase 5 outcome

**Partial split.** Pulled the persistence layer
(`hooks/useWizardPersistence.ts`) but left load + answers + finish
merged. Full rationale:

After mapping every state ↔ function relationship in
`useWizardState.ts`:

- **`load()`** writes every state field
  (`questionnaire` / `project` / `template` / `questions` / `answers`
  / `photos` / `conclusion` / `isSafe` / `harnessName` / `stepIndex` /
  `harnessRowCount` / `loading`).
- **`patchAnswer`** writes `answers`. **`doUpload`** writes `photos`,
  `answers` (sometimes), `photoUploadCount`, `project` (via
  `showPhotoLocationAlert`).
- **`saveConclusionAndGo`** reads `questionnaire` / `isSafe` /
  `conclusion` / `template` / `harnessName` and writes `finishing`.
- **The 5 persistence `useEffect`s** read `id` / `loading` and the
  one field each persists. They **write nothing back to React state.**

The persistence effects had a clean read-only seam — extract them
into a sibling hook that takes the relevant values as args and
returns `void`. That's `hooks/useWizardPersistence.ts`.

Load + answers + finish all write to the same state shapes
(`answers`, `photos`, `project`). Splitting them would force one
of:

1. Drill the setters between slices via props — effectively
   re-creating the orchestrator above three thin wrappers, with
   the same number of cross-references.
2. Switch the whole state to `useReducer` + context — a real
   architectural change, not structural.

Neither was a good trade for the v2 polish constraint. Documented
the verdict in `features/inspection-wizard/AGENTS.md` along with a
test for future split attempts: **"split only when the proposed
slice has no shared writable state with another slice — the
persistence test that worked here."**

Result: `useWizardState.ts` 593 → 558 (−35 lines). Modest
size reduction, but the side-effect surface for mid-flow
AsyncStorage writes is now in one auditable place.

## New bugs spotted

None during v2. The conditional-hook bug from v1's
`REFACTOR_NOTES.md` is now fixed (Phase 3); the dead `useMemo` is
gone (Phase 1). `REFACTOR_NOTES.md` is now down to just the dropped
`StepSign*` dead components note from v1.

## Lint status

`npm run lint` clean after every commit. No outstanding TS errors.
No new primitive violations.

## Suggested next steps

1. **Continue slimming `ProjectDetail.tsx`** — the hero block
   (map preview + logo + project info) and the file/upload action
   handlers are the remaining big residues. A `ProjectHero.tsx` +
   `useProjectFileActions.ts` pair would likely land it under the
   300-line target. Not done because it would have meant threading
   the project mutation setters + the `pickPhotoWithAnnotation`
   ref through additional props.

2. **Inline `MeasureInput.tsx`'s `useMemo(...)` removal** is done,
   but the file still calls `useTheme()` even though `theme` is
   only used for `theme.colors.inkSoft` / `theme.colors.danger` in
   three inline styles. Could be moved into `styles.ts` if a future
   pass adds more measure styling.

3. **The inspection-wizard step transition** (`WizardStepTransition`)
   currently unmounts every step on transition — that's what makes
   the v1 conditional-hook bug latent. If a future change moves to
   reusing mounted step components, the v2 dispatch-up-front fix
   is what makes that safe. Don't reintroduce a `GridRowStep` with
   internal branching when adding a new grid type.

4. **`template.css.ts` is 560 lines** but is one giant template
   literal of CSS — not much to split. If a follow-up adds new
   dynamic CSS values, prefer inline styles in the structure file
   over adding more args to `getInspectionPdfCss`.

5. **`useWizardState.ts` (558 lines) is the largest remaining
   over-target hook.** A future React 19 + `use`/Suspense rewrite
   could move `load()` into a `react-query` `queryFn` and let the
   component subscribe directly — at which point the split into
   `useWizardAnswers` + `useWizardFinish` becomes natural. Not
   reachable from a structural pass.

## Branch state

Local-only. 17 commits on `main` (v2), atop the 12 from v1, all
authored locally. Remote not touched. Review with
`git log d63498e..HEAD --oneline` and
`git diff d63498e..HEAD --stat` before pushing.
