# features/records

## What this module does

Context-neutral building blocks for the **five global record types** —
Inspections (შემოწმების აქტი), Reports (რეპორტი), Brdzaneba/Orders
(ბრძანება), Incidents (ინციდენტი), Briefings (ინსტრუქტაჟი) — that are now
surfaced **cross-project** on three screens:

- **Home** (`features/home-records/`) — one `RecordWidget` per type, 4 items
  each, "view all" → History.
- **History** (`features/history/`) — a single active type at a time, chosen
  by a chip strip; completed records only.
- **Drafts** (`features/drafts/`) — every type's drafts grouped together.

The hard rule everywhere these are used: **completed records and drafts never
live in the same list**, and rows carry **no draft/completed status chrome** —
only a neutral per-type glyph for identity.

## Public API

- `recordTypes.ts` — the single source of truth. `RECORD_TYPES` (ordered:
  inspections → reports → orders → incidents → briefings, driving both the
  History chip order and the Home widget order), `RecordTypeKey`,
  `DEFAULT_RECORD_TYPE` (`'inspections'`), `isRecordTypeKey`, `recordTypeOf`,
  `historyHref(key)` (→ `/history?type=<key>`).
- `RecordWidget` — the Home "section card" chrome (icon + title + count +
  "view all" link, with loading / empty / rows states). Caller maps items to
  rows and passes them as `children`.
- `ReportRow`, `BriefingRow`, `OrderRow` — status-free rows. (Inspections reuse
  `components/InspectionRow`; incidents reuse `IncidentRow` from
  `components/projects/ProjectRowHelpers` — its colored badge is incident
  **type** identity, not status.) `ReportRow` is now used **only by Drafts** —
  completed reports render as cards (below).
- **Reports are cards, not rows** (everywhere except Drafts):
  - `ReportCard` — one media card: landscape cover-photo "sneak peek"
    (`useReportCoverUri` → `reportCoverPath`) + slide-count chip + title + date.
    `REPORT_CARD_WIDTH` is the rail default; pass `width` for the grid.
  - `ReportCardRail` — horizontal scroller for the **section** surfaces (Home
    reports widget, project-detail reports section). Bleeds `-16` to the
    enclosing `sectionCard` gutter; renders skeleton/empty/cards + an optional
    trailing "ყველას ნახვა" card (`onViewAll`). The host supplies the header.
  - `ReportCardGrid` — full-screen 2-column grid for **History reports tab** and
    a project's **all-reports** list. Carries the canonical three-state guard +
    pull-to-refresh; optional `ListHeaderComponent`.
  - `ReportThumb` — the small 16:9 avatar still used by the Drafts `ReportRow`.
- `getRecordStyles(theme)` — section-card + row styles.

## Internal files

- `styles.ts`, `recordTypes.ts`, `RecordWidget.tsx`, `ReportRow.tsx`,
  `ReportThumb.tsx`, `ReportCard.tsx`, `ReportCardRail.tsx`,
  `ReportCardGrid.tsx`, `useReportCover.ts`, `BriefingRow.tsx`,
  `BriefingTopicAvatar.tsx`, `OrderRow.tsx`, `topics.ts`, `index.ts`.

## Gotchas

- **Completed-only is the caller's job for data, the row's job for chrome.**
  Fetch with `useRecent*({ status: 'completed' })`; the rows render no status.
- **Orders have no detail/edit route** (`app/orders/` is only `new` +
  `[id]/success`). `OrderRow` is display-only unless an `onPress` is supplied —
  Home/History pass none.
- **`styles.ts` mirrors the section subset of
  `features/project-detail/styles.ts`** — identical values on purpose so Home
  matches the project screen. Keep them in sync.
- Inspections routing uses the **template category** (`routeForInspection(
  template.category, id, completed)`), looked up from `useTemplates()` — match
  the History/Home call sites, don't invent a new routing path.

## Canonical helpers consumed

- `useRecent{Inspections,Reports,Incidents,Briefings,Orders}` + the
  `RecentRecordsOpts` (`{ limit, status }`) contract from `lib/apiHooks.ts`.
- `components/InspectionRow`, `components/projects/ProjectRowHelpers`
  (`IncidentRow`, `ViewMoreRow`), `components/Skeleton` (`SkeletonRow`),
  `lib/formatDate` (`formatShortDateTime`), `lib/inspectionRouting`
  (`routeForInspection`).
