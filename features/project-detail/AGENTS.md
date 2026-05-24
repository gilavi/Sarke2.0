# project-detail

## What this module does
The full project-detail screen — header arch with logo + map preview,
crew/roles, files, then per-record-type sections (inspections in
~10 sub-categories, briefings, incidents, reports, orders, breathalyzer
logs). Backs the `app/projects/[id].tsx` route.

## Public API (from index.ts)
- `ProjectDetail` — default export; renders the entire screen.

## Internal files
- `ProjectDetail.tsx` (~1,470 lines) — the screen. Holds local state
  for project, all per-source inspection lists, files, templates, the
  tour, the swipe-to-delete refs, and the various "view more" overflow
  navigation. Renders the SVG arch header animation and every section
  inline.
- `styles.ts` — `getStyles(theme)` factory split out so the JSX file
  isn't dominated by ~270 lines of StyleSheet.

## Gotchas / non-obvious things
- This file is still well over the component size target. A proper
  follow-up would carve out:
  - the arch-animation header (SCREEN_W / SVG_H / SVG_EDGE_Y /
    AnimatedPath + scroll handler) into `ProjectArchHeader.tsx`;
  - each section card (`InspectionsSection`, `BriefingsSection`,
    `IncidentsSection`, `FilesSection`, `ReportsSection`,
    `OrdersSection`, `BreathalyzerSection`) into its own file;
  - the cluster of ~10 React Query state-sync `useEffect`s into a
    `useProjectDetailData` hook.
- The component pulls from ~10 React Query hooks
  (`useInspectionsByProject`, `useBobcatInspectionsByProject`, etc.)
  and then mirrors each into local state so older mutation paths
  continue to work. Don't try to "simplify" by dropping the local
  state — the optimistic-removal swipe handlers, file upload, and
  crew-edit flows all mutate the local copies before/instead of the
  query cache.
- The `UnifiedInspection` discriminated union (`source: 'generic' |
  'bobcat' | 'excavator' | ...`) is the entry point for the swipe
  delete handler (`deleteInspectionBySource`). When adding a new
  equipment inspection type, all three of: the per-source useState,
  the `useEffect` syncing it from the query, and the `allInspections`
  builder need a new branch.
- The hero is anchored to an SVG arch path: `SCREEN_W / SVG_H /
  SVG_EDGE_Y` and the `logoContainer` `marginTop: -86` are tuned to
  the bezier peak — change either and the avatar will float off the
  arch.

## Canonical helpers used (from lib/)
- `lib/services` — `projectsApi`, `projectFilesApi`, `questionnairesApi`.
- `lib/apiHooks` — every per-source `use*InspectionsByProject` hook.
- `lib/inspection/registry` — `inspectionRegistry` for category →
  create() routing.
- `lib/inspectionRouting` — `routeForInspection`.
- `lib/inspectionDelete` — `deleteInspectionBySource`.
- `lib/briefingsApi`, `lib/ordersApi`.
- `lib/projectLogo` — `pickProjectLogo`.
- `lib/theme`, `lib/toast`, `lib/session`, `lib/errorMap`,
  `lib/formatDate`, `lib/logError`, `lib/accessibility`.
- `hooks/usePhotoWithLocation`.
