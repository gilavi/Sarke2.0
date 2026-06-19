# inspection-steps

## What this module does
The reusable shell + step components used by every equipment-specific
inspection route (bobcat, excavator, cargo platform, etc.) and by
the harness inspection. Previously `components/inspections/`;
renamed in Phase 1 to clarify its role vs `inspection-parts/`.

## Public API (from index.ts)
- `InspectionShell` — full-screen wrapper (FlowHeader + progress,
  WizardStepTransition, saving hint, optional `banner` slot, and the
  footer next/skip/finish button). EVERY equipment route wraps its
  step content in this. Key props: `step` (0-based — the shell adds
  +1 for the header counter), `isLastStep`, `finishLabel` (custom
  finish-button text), `blockNext` (disable the non-last button while
  `canGoNext` is false — no skip), `showPdfIcon`/`generatingPdf`/`onPdf`
  (PDF icon shown beside the close ✕), `banner` (e.g. PdfLockedBanner).
- `InspectionShellSkeleton` — the **canonical loading state** for every
  inspection flow (equipment routes, the generic scaffold wizard, and
  harness). Renders the **real `FlowHeader`** (same `card` bg, same
  back/close **and the live progress bar** as `InspectionShell`) over a
  per-step body skeleton + footer-button placeholder, so the header +
  progress strip **never wait on loading** — only the body morphs
  skeleton → content. Each route renders it from its
  `if (loading || !inspection)` gate, passing the same `title`,
  `projectName`, 0-based `step`, `totalSteps` and `stepLabels` it gives
  `InspectionShell` (so the progress bar lands without a jump), plus
  `variant` (see `StepBodySkeleton`) mapped from the current step, and
  `onClose={() => router.back()}`. Forwards `fields`/`verdicts`/`photos`
  through to `StepBodySkeleton` for the `form`/`conclusion` variants. Omit
  `totalSteps` to hide the progress
  bar (the generic wizard does this — its step count isn't known at load).
  Do NOT fall back to a native `<Stack.Screen headerShown>` + centered
  "იტვირთება…" text, and do NOT show one generic body for every step.
- `StepBodySkeleton` (from `StepSkeletons.tsx`) — the body-only step
  skeletons, one per `StepSkeletonVariant`, each shaped like the real step
  so the loading body never looks like the generic dashboard skeleton:
  - `form` — stacked **label-stub + input-bar** field groups (`fields`
    count); identification / single-field steps.
  - `keypad` — plate field + bottom key grid.
  - `checklist` — legend strip + result rows (description + 3 chips).
  - `conclusion` — illustration + verdict buttons + notes + photo strip.
    Params: `verdicts` (button count, default 3; pass `0` for verdict-less
    flows like general-equipment) and `photos` (default `true`; pass
    `false` when the conclusion step has no photo strip).
  - `table` — DynamicTable-style **numbered row-cards** (badge + stacked
    input cells) + add button (NOT a thin spreadsheet).
  - `tablePhotos` — `table` + a trailing photo strip (e.g. the
    lifting-accessories "removed devices" step).
  - `radioList` — caption + stacked single-select radio rows
    (e.g. general-equipment "inspection type").
  - `identForm` — sectioned identification form: section labels + a
    selector row + grouped fields + a marking chip row + a date field
    (the slings/lifting-accessories identification step).
  - `docsPhotos` — a large photo-capture card + a horizontal photo-tile
    strip (QualDoc + PhotoSection documents step).
  - `question` — illustration + centered title + two answer buttons +
    photo grid + notes (generic wizard).

  All built from the shared `Skeleton` atom so shimmer colour + animation
  stay identical everywhere — only the *layout* changes step to step. Each
  route maps its current (restored) `step` → the matching variant in its
  `if (loading) return <InspectionShellSkeleton variant={…} />` gate, so a
  resume lands on the right shape. Add a new variant here (composed from the
  inline shape helpers — `FieldGroup`, `SectionLabel`, `PhotoStripBlock`, …)
  — not a per-route skeleton — when a step shape isn't covered; reuse the
  closest variant (or its `verdicts`/`photos` params) otherwise.
- `ProjectPickerStep` — initial step where the user picks the
  project + project item the inspection is attached to.
- `ChecklistStep` — generic "list of checks" step. Renders a
  `ChecklistLegend` + the list; manages scroll state + section headers.
  Row rendering delegates to `ChecklistRow` → the shared
  `ChecklistItemRow`. No per-row comments/photos (flag the result only;
  detail lives on the conclusion step).
- `ConclusionStep` — the **single, shared "last step"** for every
  inspection flow (equipment routes, harness, the scaffold wizard via a
  thin delegating wrapper, and — verdict only — fall-protection per
  device). Renders, in order: a conclusion illustration (`showAvatar`,
  default true), an optional `summarySection` slot, an optional
  harness-name field, a `VerdictSuggestionBanner` (`suggestion` prop),
  the shared `VerdictSelector` (only when `verdictOptions` is non-empty),
  a `კომენტარი` notes box (`notesLabel`/`notesRequired`/`notesError`),
  optional suggestion pills, and a photo strip (`photoPaths`/`onAddPhoto`/
  `onDeletePhoto` → shared `PhotoSection`, or a `photoSection` ReactNode
  slot for the scaffold's `AttachmentBars`). Generic over the verdict
  value type; pass `scroll={false}` when the host owns the scroll view.
- `VerdictSelector` — the **canonical, dynamic** verdict picker for
  every inspection conclusion step (equipment routes, harness, and the
  scaffold wizard). One icon + label button per `VerdictOption`, in the
  scaffold's `გადაწყვეტილება` style. Icon resolves from an explicit
  `option.icon`, else a semantic `option.tone`
  (`success`/`caution`/`danger`), else by position (first = shield,
  last = warning, middle = eye). Generic over the verdict value type.
  This replaced the bespoke per-flow selectors (the old pill chips in
  `ConclusionStep`, the local one in `features/inspection-wizard`, and
  the plain-pill `components/inspection-parts/VerdictSelector` — now
  deleted).
- `VerdictSuggestionBanner` — shared `შემოთავაზება` hint (Lightbulb +
  text) for the auto-computed verdict suggestion; pass `text` + optional
  `onApply` (tappable to adopt). Consolidated the six inline copies that
  lived in the equipment + fall-protection routes.

## Internal files
- `InspectionShell.tsx`, `InspectionShellSkeleton.tsx`, `ProjectPickerStep.tsx`
- `StepSkeletons.tsx` — `StepBodySkeleton` + the per-variant body
  skeletons consumed by `InspectionShellSkeleton`. Pure presentational,
  built only from the shared `Skeleton` atom.
- `ChecklistStep.tsx` — legend + scroll container + section headers.
- `ChecklistRow.tsx` — thin adapter over `ChecklistItemRow`: three
  result chips (ვარგისია / ხარვეზი / გამოუსადეგარია), no comment/photo.
  Owns the exported item types (re-exported via ChecklistStep) +
  `CHECKLIST_LEGEND`.
- `ConclusionStep.tsx` (+ `ConclusionStep.styles.ts` sibling)
- `VerdictSelector.tsx` — owns the `VerdictOption` / `VerdictTone` types
  (re-exported via `ConclusionStep` for back-compat).
- `VerdictSuggestionBanner.tsx` — shared `შემოთავაზება` verdict hint.

## Gotchas / non-obvious things
- `VerdictSelector` is the single canonical verdict picker — don't add a
  per-flow variant. Every consuming flow orders its options
  positive → negative, which is what the positional icon default keys
  off; if you ever need a different order, set `tone` (or `icon`)
  explicitly on the option rather than reordering. Its cards carry the
  canonical press squish via [`PressBounce`](../animations/PressBounce.tsx)
  (`scaleTo 0.96`); selected styling stays prop-driven.
- This is the equipment-route shell, NOT the generic harness wizard.
  The generic wizard lives at `features/inspection-wizard/`.
  Equipment routes (bobcat, excavator, ...) own their own step
  arrays + state and use these step components as reusable
  building blocks.
- `ChecklistStep` re-exports `ChecklistItem` / `ChecklistItemState` /
  `ChecklistResult` from `ChecklistRow` for backward compatibility.
  Changing these types is a breaking change for every equipment route.
- Verdict chips are now monochrome **icons** via `ChecklistItemRow`
  (✓ good / ⚠ deficient / ✗ unusable), explained by the `ChecklistLegend`
  at the top. The result *values* are still `good`/`deficient`/`unusable`
  — the PDF renderer + `bobcatSchema` read those unchanged.
- Per-row notes/photos were removed (decided 2026-06-18). The
  `comment`/`photo_paths` state fields and the `onPhotoPress`/
  `showCommentButton` props remain on the types (PDF reads them, render
  empty) but are no longer captured in the UI.

## Canonical helpers used
- `components/inspection-parts` — the smaller atoms.
- `lib/theme`, `lib/haptics`, `lib/services`.
