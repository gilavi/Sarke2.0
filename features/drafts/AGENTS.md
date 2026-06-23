# features/drafts

## What this module does

The Drafts screen (`app/drafts.tsx` delegates here), reached from a More-tab
tile. Shows **every in-progress record across all types and projects**, grouped
by type. This is the home for drafts now that the per-type widgets/lists
(Home, History, project screen) are completed-only. Tapping a draft resumes or
edits it.

## Public API

- `DraftsScreen` (default export of `DraftsScreen.tsx`).
- `useDraftsData()` — per-type draft buckets + union `total` + union `loading`.

## Gotchas

- **Drafts vs completed never mix.** Every query here is
  `useRecent*({ status: 'draft' })`. The only other draft surface in the app is
  Home's single resume card.
- **Resume routes per type:** inspections →
  `routeForInspection(tpl.category, id, false)` (wizard); reports →
  `/reports/{id}/edit`; incidents → `/incidents/{id}`; briefings →
  `/briefings/{id}`; orders → display-only (no order edit route exists, so
  `OrderRow` gets no `onPress`).
- **Three-state guard is unioned** across the five queries (skeleton while any
  is unsettled and the merged total is still 0).
- The More-tab tile shows `useInspectionCounts().drafts` (inspection drafts
  only) to avoid five extra queries on the More tab — the screen itself shows
  the true per-type breakdown. If an exact total is ever needed on the tile, add
  COUNT-only `draftCount()` head-requests rather than pulling the lists.

## Canonical helpers consumed

- `lib/apiHooks` (`useRecent*`, `useTemplates`), `features/records`
  (`getRecordStyles`, `ReportRow`/`OrderRow`/`BriefingRow`),
  `components/InspectionRow`, `components/projects/ProjectRowHelpers`
  (`IncidentRow`), `lib/inspectionRouting`, `lib/formatDate`.
