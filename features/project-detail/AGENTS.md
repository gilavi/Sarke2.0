# project-detail

## What this module does
The full project-detail screen — header arch with logo + map preview,
files, then per-record-type sections (inspections, briefings,
incidents, reports, orders, breathalyzer logs).
Backs the `app/projects/[id].tsx` route.

The crew/participants surface (quick-action button, the
`/projects/[id]/participants` page, and the bottom roles section that
used `RoleSlotList`/`RoleSlotSheet`) was removed in 2026-06 — it was a
leftover signer-collection flow no longer in use. The `crew` column on
`projects` is left untouched; it's simply no longer edited from here.

## Public API (from index.ts)
- `ProjectDetail` — default export; renders the entire screen.

## Internal files
- `ProjectDetail.tsx` (~625 lines) — the orchestrator. Owns the
  edit/template/file/inspection mutation handlers, the project
  screen tour, the map hero JSX (small inline `<MapView>` preview),
  the hero logo + info JSX, the quick actions row, and composes
  every section card. Renders the arch + scroll header.
- `ProjectArchHeader.tsx` — `useArchAnimation(loaded)` hook (mount +
  scroll-driven SVG bezier morph + logo fade-in) and
  `ProjectArchSvg({ archProps, fill })`. Owns the
  `SCREEN_W / SVG_H / SVG_EDGE_Y` constants.
- `LoadingSkeletonScreen.tsx` — rendered before the project +
  queries are hydrated (`!loaded && !project`).
- `ProjectMapModal.tsx` — full-screen "projects on the map" modal +
  `useProjectMapModal(currentProject)` hook owning its
  visibility/selected/cardAnim/allProjects state. The orchestrator
  passes the returned state object to the component.
- `useProjectDetailData.ts` — single hook owning 3 useState
  declarations (project / templates / files mirrors for mutation
  paths), 8 React Query hooks, 3 useEffect state-syncs, and the
  `loaded` + `pending` exposure. `loaded` flips true as soon as
  `projectQ` resolves (hero + arch animate immediately). `pending`
  is a per-section flag object (`project`, `inspections`,
  `incidents`, `briefings`, `reports`, `files`, `orders`,
  `breathalyzer`) consumed by each section so they render their own
  `SkeletonRow`s while their own query is in flight. The inspection
  list now comes from a single RPC
  (`useUnifiedInspectionsByProject`) rather than 10 parallel per-type
  queries — see the `unifiedInspections.ts` note below.
- `unifiedInspections.ts` — re-exports the `UnifiedInspection` type
  alias and owns `deleteUnifiedInspection` (swipe-delete dispatch).
  `buildUnifiedInspections` was removed — the unified list now comes
  pre-merged from `get_project_inspections_unified()` (one RPC vs.
  10 per-type queries), keyed off `inspections.type` from the
  identity-unification migration. `deleteUnifiedInspection` takes a
  `removeFromCache(id)` callback so the project-detail screen can
  optimistically mutate the unified-query cache via
  `queryClient.setQueryData`.
- `styles.ts` — `getStyles(theme)` factory.
- `sections/InspectionsSection.tsx` — header + 3-item preview +
  view-more + swipe-delete for the unified inspection list.
- `sections/IncidentsSection.tsx` — incidents card.
- `sections/BriefingsSection.tsx` — briefings card.
- `sections/ReportsSection.tsx` — reports card.
- `sections/FilesAndOrdersSection.tsx` — combined card showing
  generated orders (read-only) + uploaded files (swipe-to-delete,
  tap-to-open) under one section card on the screen.
- `sections/BreathalyzerSection.tsx` — breathalyzer log card.

## Gotchas / non-obvious things
- `ProjectDetail.tsx` is still over the 300-line target. The
  remaining bulk is the map hero JSX + logo/info hero JSX + several
  file/upload action handlers + the EditProjectSheet / CustomDropdown
  modals. A follow-up could pull those into a `ProjectHero.tsx` and
  a `useProjectFileActions` hook — out of scope for v2.
- The data layer (`useProjectDetailData`) mirrors React Query results
  into local state so older mutation paths (file upload/delete,
  swipe-delete in inspection sections) keep working via setters.
  Switching to pure query-cache mutations is a separate change.
- Adding a new equipment inspection type now only requires the
  parent `inspections.type` tag to be in sync (set by
  `create_equipment_inspection` RPC and the unify-identity migration)
  — the per-source useState / merge-builder / per-source delete
  switch are all gone. `routeForInspection` still needs a new branch
  per type, and `lib/inspection/registry.ts` still needs the create
  entry.
- The hero is anchored to an SVG arch path. `SCREEN_W / SVG_H /
  SVG_EDGE_Y` and the `logoContainer` `marginTop: -86` are tuned to
  the bezier peak — change either and the avatar will float off the
  arch.
- The map modal's `useProjectMapModal` lazy-loads `allProjects` on
  first `open()` so the hero render path doesn't pay for it.

## Canonical helpers used (from lib/)
- `lib/services` — `projectsApi`, `projectFilesApi`, `questionnairesApi`.
- `lib/apiHooks` — every per-source `use*InspectionsByProject` hook
  (consumed inside `useProjectDetailData`).
- `lib/inspection/registry` — `inspectionRegistry` for category →
  create() routing.
- `lib/inspectionRouting` — `routeForInspection`.
- `lib/inspectionDelete` — `deleteInspectionBySource` (via
  `unifiedInspections.ts`).
- `lib/briefingsApi`, `lib/ordersApi`.
- `lib/projectLogo` — `pickProjectLogo`.
- `lib/theme`, `lib/toast`, `lib/errorMap`,
  `lib/formatDate`, `lib/logError`, `lib/accessibility`.
- `hooks/usePhotoPicker`.
