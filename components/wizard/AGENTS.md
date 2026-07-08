# wizard

## What this module does
Generic wizard chrome — the pieces the inspection wizard
(`features/inspection-wizard/`) composes into a multi-step flow.
The Kamari (harness) flow lives in the nested `kamari/` subfolder
which has its own AGENTS.md.

## Public API (from index.ts)
- `StatusChip` — monochrome single-select answer control (icon +
  label). The shared building block for every inspection answer
  surface (yes/no, 3-state good/deficient/unusable, verdict pills);
  `AnswerButtons` and the equipment checklist chips use it or its
  ink+neutral token treatment. No semantic colors — `✓/⚠/✗` icons
  carry severity.
- `AnswerButtons` — binary yes/no rendered in the wizard's global
  footer for `yesno` question steps; two `StatusChip` pills.
- `QuestionCard` — generic step container with title + body.
- `ChecklistItemStep` — single yes/no row used inside step bodies.
- `ExitModal` — confirmation modal when the user backs out with
  unsaved progress. Takes optional `title`/`body` so each flow shows
  copy that is TRUE for it; the default body is the destructive
  `wizard.exitBodyDiscard` ("პროგრესი დაიკარგება…") — flows that really
  persist on exit (autosave/draft) must opt in to "saved" copy.
  `FlowHeader` is the only mounter (via `confirmExit`/`backIsExit`/
  `exitCopy`, incl. Android hardware back).
- `PhotoThumbs` — horizontal photo strip + add-photo tile.
- `StepSectionLabel` — small caps section label inside a step.
- `WizardNav` — back/next nav footer (separate from the wizard's
  custom footer that hosts AnswerButtons).
- `WizardStepTransition` — animated slide+fade transition between
  steps. Takes a `stepKey` and a `direction: 'next' | 'prev'`.

## Internal files
One file per export above, plus `kamari/` (see its own AGENTS.md).

## Gotchas / non-obvious things
- `WizardStepTransition` unmounts the previous step when transitioning
  — keep step components stateless w.r.t. anything that shouldn't be
  reset on transition (use refs/context if needed).
- `ExitModal`'s copy goes through `t()` (`wizard.exit*` keys in
  `locales/ka.json` + `en.json`). Never hardcode a "progress will be
  saved" body here — that promise was false for every discarding flow
  (the 2026-07 ux-flows audit's worst data-loss trap); per-flow truth
  lives in the `title`/`body` props.

## Canonical helpers used
- `lib/theme`, `lib/haptics`, `lib/accessibility`.
- `components/primitives` — `A11yText`, `Button`.
- `react-native-reanimated` for the transition animation.
