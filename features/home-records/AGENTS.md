# features/home-records

## What this module does

Owns the bottom half of the Home tab (`app/(tabs)/home.tsx`), extracted to keep
the route file orchestration-only. Two pieces:

- `ResumeDraftCard` — the single most-recent inspection **draft**, pinned as the
  orange resume card. This is the ONLY draft surface on Home; every other draft
  lives in the Drafts screen (More tab).
- `HomeRecordsSection` — the per-type **completed**-record widgets (one
  `RecordWidget` each: Inspections, Brdzaneba, Incidents, Briefings),
  4 items each, "view all" → `/history?type=<key>`. **Reports are the
  exception**: that widget renders a **full-bleed** horizontal `ReportCardRail`
  of cover-photo cards (from [`features/records/`](../../features/records/)) —
  no `sectionCard` wrapper, so cards scroll edge-to-edge to the screen; just a
  gutter-aligned header + the rail (`bleed=20`, `gutter=20`, so cards rest flush
  at the 20px page gutter) with a trailing "ყველას ნახვა" card → History.

## Public API

- `ResumeDraftCard` — renders nothing when there are no drafts.
- `HomeRecordsSection` — the widgets block.

Home renders `<ResumeDraftCard />` then `<HomeRecordsSection />` where the old
"Recent activity" list used to be.

## Gotchas

- **Drafts vs completed never mix.** `ResumeDraftCard` queries
  `{ status: 'draft', limit: 1 }`; the widgets query `{ status: 'completed' }`.
- **Shared cache with History.** Widgets use `RECENT_COMPLETED_LIMIT` (50) — the
  same key as the History tabs, so Home pre-warms History.
- The Inspections widget is always shown (primary, has an empty state); the
  other four render only when they have records (scannability).
- `ResumeDraftCard` ports the wizard `stepKeyFor`/`STEP_TOTALS` AsyncStorage
  step logic + the `AppState` foreground refresh + swipe-delete verbatim from
  the old Home block — keep that behavior if you touch it. Delete routes through
  `deleteInspectionBySource` so equipment drafts are removed correctly.

## Canonical helpers consumed

- `features/records` (`RecordWidget`, `ReportRow`/`OrderRow`/`BriefingRow`,
  `RECENT_COMPLETED_LIMIT`, `historyHref`),
  `components/InspectionRow`, `components/projects/ProjectRowHelpers`
  (`IncidentRow`), `lib/apiHooks` (`useRecent*`, `useTemplates`),
  `lib/inspectionRouting`, `lib/inspectionDelete`, `lib/homeUtils`
  (`relativeTime`).
