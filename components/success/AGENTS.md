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
- `FlowSuccessScreen` — the **unified** post-completion success screen for
  the act / incident / report / instruction flows (the redesigned UI:
  black check disc, hero status pill, signature + certificate lists, coral
  Share-PDF pill, quiet "back to home" link). One presentational component
  parameterized by a `flow` prop; the flow config decides only title/subtitle,
  whether signatures show (`edit` for act+incident, `view` for instruction),
  and whether certificates show (act only). Each route passes the signing
  state, certificate items, hero, and the share/back handlers in. Reuses the
  DS primitives (`Button` primary = coral pill, `IconButton` outline = back,
  `Badge` = status pills) and the existing `SignaturesScreen` modal +
  `CertificatesManager` screen — it builds no new sheets. Exports
  `SuccessFlow`, `SuccessHero`, `SuccessParticipant`, `SuccessCertificateItem`.
- `SuccessCheckDisc` — the animated black disc + white tick (sibling of
  `components/animations/AnimatedSuccessIcon`, which is an accent ring). Plays
  once on mount; renders the static final state under reduce-motion.

## Internal files
- `SuccessScreen.tsx` — scaffold + `SuccessActionCard` + shared styles.
  Still used by **orders**; not removed.
- `InspectionDoneView.tsx` — inspection-specific done body + verdict
  tone→color map. Still used by the **equipment** done routes
  (bobcat/excavator/cargo-platform/general-equipment).
- `FlowSuccessScreen.tsx` — the unified act/incident/report/instruction
  success screen + per-flow config.
- `SuccessCheckDisc.tsx` — animated black check disc (reduce-motion aware).
- `SuccessSignatureSection.tsx` — the signatures list (edit opens the real
  `SignaturesScreen` modal; view-only for instruction). The inline list is a
  live mirror of `useSignaturesState`.
- `SuccessCertificateSection.tsx` — the certificates list (opens the existing
  `CertificatesManager` route; act only).
- `SuccessListRow.tsx` — the shared row + avatar/lead visuals.

## Gotchas / non-obvious things
- **`FlowSuccessScreen` is the act result screen.** For the generic
  harness/scaffold act, `app/inspections/[id].tsx` renders `FlowSuccessScreen`
  (the `[id]/done.tsx` route just `Redirect`s there). It owns
  `useSignaturesState` + the `downloadPdf`/`buildSignaturesSection` legal-PDF
  logic — that logic was preserved verbatim when the WebView-preview UI was
  swapped for `FlowSuccessScreen`. **Regulatory:** captured signatures stay in
  component state only and are never persisted (see
  `features/signatures/AGENTS.md`); don't add a persistence path here.
- **Certificates are act-only** in `FlowSuccessScreen` (the
  `inspection_attachments` system is inspection-scoped). Incident shows
  signatures but no certificates.
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
