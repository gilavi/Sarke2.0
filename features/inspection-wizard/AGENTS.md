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
- `useWizardState.ts` — single hook owning all wizard state, load,
  persistence, answer/photo mutations and finish flow. Larger than the
  150-line "hook" target on purpose — see "Gotchas".
- `wizardSchema.ts` — pure helpers: `FlatStep` type, `buildSteps`,
  `hasAnswer`, `isAnswerShapeValidForType`, `parseMeasure`, `measureError`,
  `scaffoldColStyle`, AsyncStorage key helpers, bounded photo-URL cache.
- `styles.ts` — `getstyles(theme)` factory, `staticStyles`, `uploadPillStyles`.
- `QuestionStep.tsx` — generic question step (yesno/measure/freetext +
  photos + notes).
- `GridRowStep.tsx` — `component_grid` row step. Handles both harness
  rows (✓/✗ chips per col) and scaffold rows (status options + comment).
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

## Gotchas / non-obvious things
- `useWizardState.ts` is intentionally one large hook (~500 lines) rather
  than 4–5 slices. The load/patch/upload/finish flows touch the same
  state shapes (answers, photos, questionnaire, offline) — splitting
  them introduces prop-drilling between the slices and double work for
  the React Query cache. Keep it cohesive; only split if a *clean*
  boundary appears.
- `photoUrlCache` is a *module-level* Map in `wizardSchema.ts` shared
  between `PhotoThumb` and `PhotoPreviewModal`. Bounded to 100 entries
  via `setPhotoUrlCache`. Don't replace with `useState` — the cache must
  survive component unmounts within the same wizard session.
- Step transition direction (`'next' | 'prev'`) is derived in the
  orchestrator from the previous `stepIndex` (a ref) — the direction
  drives the slide animation in `WizardStepTransition`.
- `GridRowStep` calls `useState`/`useRef` *conditionally* inside the
  `!isHarness` branch. This is a pre-existing rules-of-hooks violation
  that the original god-file also had. **Do not "fix" it as a side
  effect of moving the file** — `isHarness` is stable for the life of a
  step (mounted/unmounted by `WizardStepTransition`), so the bug is
  latent. Logged in `REFACTOR_NOTES.md`.
- `removeInspection` / `deleteConfirmVisible` are wired up but the modal
  has no visible trigger from inside the wizard. The trigger lives on
  the inspection detail screen; the modal stays here so a flag flip is
  enough to surface it without prop drilling.

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
