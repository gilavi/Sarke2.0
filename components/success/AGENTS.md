# success

## What this module does
The shared post-save **success screens** — the big check-mark + summary
card + primary CTA + secondary action cards shown after a document is
saved. One scaffold owns the chrome so every per-domain success screen
(inspection acts, incidents, orders) is a thin data-loader, not a copy.

This replaced ~6 byte-identical copies of the same `Screen` +
`CelebrationBurst` + `AnimatedSuccessIcon` + `ActionCard` + `StyleSheet`
(one per `done.tsx` + incident + order success).

## Public API (from index.ts)
- `SuccessScreen` — the scaffold. Props: `title`, `subtitle?`,
  `children` (summary card area), `primary?` (big CTA), `actions?`
  (secondary cards). Owns the edge-to-edge `Screen`, the celebration
  burst, the animated check-mark, and fires the completion haptic once
  on mount — consumers must NOT fire `haptic.inspectionComplete()` too.
- `SuccessActionCard` — a single secondary action card (icon bubble +
  title/subtitle + chevron). Rendered for you by `SuccessScreen`'s
  `actions`; exported for one-off use.
- `InspectionDoneView` — the inspection "act saved" body, built on
  `SuccessScreen`. Bakes in the corrected wording: title
  "შემოწმების აქტი შენახულია!", primary "PDF-ის ნახვა", home action
  "მთავარ გვერდზე დაბრუნება". Takes `loading`/`loaded` + the summary
  fields (`typeLabel`, `projectName`, `dateText`, `verdict`,
  `conclusion`) + `onViewPdf`.

## Internal files
- `SuccessScreen.tsx` — scaffold + `SuccessActionCard` + shared styles.
- `InspectionDoneView.tsx` — inspection-specific done body + verdict
  tone→color map.

## Gotchas / non-obvious things
- **Terminology:** the inspection document is a "შემოწმების აქტი", never
  "ინსპექცია" (wrong term). Keep "ინსპექცია" out of every user-facing
  string in this folder and in the consuming routes.
- The inspection `done.tsx` routes each compute their own
  `verdict.text` + `tone` (the enum labels/colors differ per type:
  bobcat uses `limited`, excavator uses `conditional`, generic uses a
  safe/unsafe boolean) and pass a resolved `{ text, tone }`. Don't push
  per-type enum logic into the view.
- `typeLabel` for the generic harness/scaffold route is the **full**
  formal `template.name` (e.g. "დამცავი ქამრების შემოწმების აქტი"), not
  the shortened `inspectionDisplayName`, so the summary reads as a full
  act name on the confirmation screen.
- `onViewPdf` differs per route: the generic route `replace`s to
  `/inspections/[id]`; equipment routes `router.back()` to their result
  (WebView PDF) screen. Both surface the saved PDF.

## Canonical helpers used
- `components/primitives` (`A11yText`, `Button`, `Card`, `Screen`),
  `components/animations` (`AnimatedSuccessIcon`, `CelebrationBurst`),
  `components/Skeleton`, `lib/theme`, `lib/haptics`.
