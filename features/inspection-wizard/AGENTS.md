# inspection-wizard

## What this module does
Multi-step questionnaire flow that drives the generic inspection route
(`app/inspections/[id]/wizard.tsx`). Loads an inspection + its template,
walks the user through one question per step, persists progress as it
goes, and finishes by enqueuing a `completed` patch through the offline
queue.

## Public API (from index.ts)
- `InspectionWizard` — `({ inspectionId: string })` orchestrator component;
  the route file is a thin shell over this.

## Internal files
- `InspectionWizard.tsx` — orchestrator. Renders header/footer + the
  current step. Owns local UI state (tour, swipe gesture, entrance anim).
- `useWizardState.ts` — single hook owning wizard state, load,
  answer/photo mutations and finish flow. Larger than the 150-line
  "hook" target on purpose — see "Gotchas".
- `hooks/useWizardPersistence.ts` — write-only side-effect hook
  consumed by `useWizardState`. Mirrors `stepIndex`, `harnessRowCount`,
  `conclusion`, `isSafe`, `harnessName` into AsyncStorage as the user
  edits them. Add new persisted fields here by adding an entry to its
  args + one useEffect, then clearing it on finish in
  `saveConclusionAndGo`.
- `wizardSchema.ts` — pure helpers: `FlatStep` type, `buildSteps`,
  `hasAnswer`, `isAnswerShapeValidForType`, `parseMeasure`, `measureError`,
  `scaffoldColStyle`, AsyncStorage key helpers, bounded photo-URL cache.
- `styles.ts` — `getstyles(theme)` factory, `staticStyles`, `uploadPillStyles`.
- `QuestionStep.tsx` — generic question step (yesno/measure/freetext +
  photos + notes).
- `HarnessRowStep.tsx` — harness (N1-N15) `component_grid` row step:
  ✓/✗ chips per col + row-count picker on the first row.
- `ScaffoldRowStep.tsx` — non-harness `component_grid` row step:
  big status buttons rendered by `ScaffoldFooterButtons` in the
  global footer + an optional comment field.
- `ConclusionStep.tsx` — final step with safety verdict, harness name,
  general photos, and conclusion textarea.
- `MeasureInput.tsx`, `DebouncedFreetext.tsx`, `DebouncedNotes.tsx` —
  debounced text/number inputs that commit through `patchAnswer`.
- `ScaffoldFooterButtons.tsx` — the action bar rendered in the global
  wizard footer when a scaffold grid row is the current step.
- `WizardHeader.tsx` — wraps `FlowHeader` with wizard-specific defaults.
- `PhotoThumb.tsx`, `PhotoPreviewModal.tsx` — image rendering with the
  shared `photoUrlCache` (defined in `wizardSchema.ts`).
- `CompletedRedirect.tsx` — fires a one-shot router.replace when the
  wizard route is hit for an already-completed inspection.
- `NavigationRecovery.tsx` — fallback UI shown if load hangs > 5 s.

## Signatures are NOT owned here
The wizard does not own or display any signature UI. Signatures are
captured on the **inspection result screen** post-completion (via
`InspectionResultView`'s embedded `useSignaturesState` + the
`features/signatures/SignaturesScreen` modal). The wizard's
`ConclusionStep` returned to its decision/notes/photos shape after the
2026-05-26 relocation — do not add a signatures section back to it.

## Gotchas / non-obvious things
- `useWizardState.ts` is intentionally one large hook (~560 lines)
  rather than load/answers/persistence slices. **The
  load/answers/finish boundary was evaluated in v2 Phase 5 and left
  merged**: `load()` writes every state field, and `patchAnswer` +
  `doUpload` write to the same `answers` / `photos` / `project`
  states load wrote. Separating them would require either (a)
  drilling setters between slices via props (effectively re-creating
  the orchestrator) or (b) a useReducer / context overhaul, which
  exceeds the structural-only constraint. The persistence layer DID
  separate cleanly because it's write-only — see
  `hooks/useWizardPersistence.ts`. Apply the same test to any future
  attempt: split only when the proposed slice has no shared
  writable state with another slice.
- `photoUrlCache` is a *module-level* Map in `wizardSchema.ts` shared
  between `PhotoThumb` and `PhotoPreviewModal`. Bounded to 100 entries
  via `setPhotoUrlCache`. Don't replace with `useState` — the cache must
  survive component unmounts within the same wizard session.
- Step transition direction (`'next' | 'prev'`) is derived in the
  orchestrator from the previous `stepIndex` (a ref) — the direction
  drives the slide animation in `WizardStepTransition`.
- Grid rows are split by domain (`HarnessRowStep` vs `ScaffoldRowStep`)
  to avoid the conditional-hook bug the pre-v2 `GridRowStep` had.
  The orchestrator (`InspectionWizard.tsx`) dispatches on
  `step.question.grid_rows?.[0] === 'N1'` before mounting either
  component, so each one's hooks are called unconditionally.
  **Future grid types must follow this pattern — add a sibling
  `<Type>RowStep` + a dispatch branch in the wizard, do not
  consolidate back into one file with internal branching.**
- `removeInspection` / `deleteConfirmVisible` are wired up but the modal
  has no visible trigger from inside the wizard. The trigger lives on
  the inspection detail screen; the modal stays here so a flag flip is
  enough to surface it without prop drilling.
- **Loads once per inspection id — no focus refetch.** A previous
  `useFocusEffect` re-ran `load()` (→ `loading=true`) on every screen
  re-focus (e.g. returning from the photo picker), which tore the step
  UI down, refetched, and overwrote in-flight state — surfacing as a
  mid-flow "reload" (and bouncing `HarnessListFlow` back to its count
  picker). The focus refetch was removed; the single `[id]` effect
  loads once, like the equipment screens. Resume-after-kill is covered
  by the offline answer cache. Don't re-add a focus reload.
- The footer is wrapped in `KeyboardStickyView` (react-native-keyboard-
  controller) so the primary action button rides above the keyboard.
  Each step owns its own `KeyboardAwareScrollView` — do NOT also wrap
  the tree in `KeyboardAvoidingView` (that double-counts the keyboard
  height and pushes the focused field off-screen).

## Canonical helpers used (from lib/)
- `lib/services` — `answersApi`, `inspectionsApi`, `projectsApi`,
  `storageApi`, `templatesApi`.
- `lib/imageUrl` — `imageForDisplay`, `pdfPhotoEmbed`.
- `lib/offline` — `useOffline`, `stripServerFields`.
- `lib/supabase` — `STORAGE_BUCKETS.answerPhotos`.
- `lib/haptics`, `lib/toast`, `lib/theme`, `lib/accessibility`, `lib/logError`.
- `lib/navigationGuard` — `isOscillating`, `recordRedirect`.
- `lib/calendarSchedule` — `recordCompletion`.
- `lib/apiHooks` — `qk` (cache key roots).
- `lib/photoLocationAlert` — `showPhotoLocationAlert`.
- `hooks/usePhotoWithLocation` — `pickPhotoWithAnnotation`.
