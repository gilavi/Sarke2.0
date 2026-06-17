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
  equipment route. Renders the **real `FlowHeader`** (same `card` bg, same
  back/close + progress strip as `InspectionShell`) over a form-shaped body
  skeleton + footer-button placeholder, so only the body morphs skeleton →
  content. Each route renders it from its `if (loading || !inspection)` gate,
  passing the same `title` it gives `InspectionShell` (+ `totalSteps`,
  `onClose={() => router.back()}`). Do NOT fall back to a native
  `<Stack.Screen headerShown>` + centered "იტვირთება…" text — that swaps the
  header chrome and background mid-load and reads as a generic loader.
- `ProjectPickerStep` — initial step where the user picks the
  project + project item the inspection is attached to.
- `ChecklistStep` — generic "list of checks" step. Renders a
  `ChecklistLegend` + the list; manages scroll state + section headers.
  Row rendering delegates to `ChecklistRow` → the shared
  `ChecklistItemRow`. No per-row comments/photos (flag the result only;
  detail lives on the conclusion step).
- `ConclusionStep` — final step with safety verdict + conclusion
  text + signatures. Renders the shared `VerdictSelector` for the
  verdict (only when `verdictOptions` is non-empty).
- `VerdictSelector` — the **canonical, dynamic** verdict picker for
  every inspection conclusion step (equipment routes, harness, and the
  scaffold wizard). One icon + label button per `VerdictOption`, in the
  scaffold's `გადაწყვეტილება` style. Icon resolves from an explicit
  `option.icon`, else a semantic `option.tone`
  (`success`/`caution`/`danger`), else by position (first = shield,
  last = warning, middle = eye). Generic over the verdict value type.
  This replaced the bespoke per-flow selectors (the old pill chips in
  `ConclusionStep` and the local one in `features/inspection-wizard`).

## Internal files
- `InspectionShell.tsx`, `InspectionShellSkeleton.tsx`, `ProjectPickerStep.tsx`
- `ChecklistStep.tsx` — legend + scroll container + section headers.
- `ChecklistRow.tsx` — thin adapter over `ChecklistItemRow`: three
  result chips (ვარგისია / ხარვეზი / გამოუსადეგარია), no comment/photo.
  Owns the exported item types (re-exported via ChecklistStep) +
  `CHECKLIST_LEGEND`.
- `ConclusionStep.tsx`
- `VerdictSelector.tsx` — owns the `VerdictOption` / `VerdictTone` types
  (re-exported via `ConclusionStep` for back-compat).

## Gotchas / non-obvious things
- `VerdictSelector` is the single canonical verdict picker — don't add a
  per-flow variant. Every consuming flow orders its options
  positive → negative, which is what the positional icon default keys
  off; if you ever need a different order, set `tone` (or `icon`)
  explicitly on the option rather than reordering.
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
