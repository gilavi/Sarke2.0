# projects

## What this module does
Pieces specific to the project detail screen
(`features/project-detail/`). Anything reusable across other screens
lives in `components/` root; project-detail-only views live here.

## Public API
- `EditProjectSheet` — bottom sheet that edits the project's name,
  company, address, map location, and logo.
- `UpcomingSection` — the "Upcoming inspections" preview card that
  groups schedules by `next_due_at`.
- `EmptyState`, `FileThumbnail`, `IncidentRow`, `ViewMoreRow` — small
  helpers exported from `ProjectRowHelpers.tsx` and used inline by
  the project-detail screen sections.

## Internal files
- `EditProjectSheet.tsx`, `UpcomingSection.tsx`, `ProjectRowHelpers.tsx`.

## Gotchas / non-obvious things
- The "lots of small exports from `ProjectRowHelpers.tsx`" pattern is
  load-bearing for the project-detail screen — splitting them into
  per-file modules would just churn the import list. If you need to
  add a new project-detail-only row component, put it in
  `ProjectRowHelpers.tsx` next to its peers.
- `EditProjectSheet` calls `pickProjectLogo` from `lib/projectLogo`
  (the canonical project logo pipeline) — don't reach for
  `expo-image-picker` directly.

## Canonical helpers used
- `lib/services` — `projectsApi`.
- `lib/projectLogo` — `pickProjectLogo`.
- `lib/theme`, `lib/toast`, `lib/errorMap`, `lib/accessibility`.
- `components/BottomSheet`, `components/MapPicker`,
  `components/primitives/A11yText`.
