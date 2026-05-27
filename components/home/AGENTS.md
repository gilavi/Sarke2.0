# home

## What this module does
Pieces specific to the home tab — primarily the project picker
bottom sheet that lets the user start an inspection without first
navigating into a project detail screen.

## Public API
- `ProjectCard` — small project row used in the home list / picker.
- `ProjectPickerSheet` — bottom sheet that lists projects and emits
  the chosen one.

## Internal files
- `ProjectCard.tsx`, `ProjectPickerSheet.tsx`.

## Gotchas / non-obvious things
- `ProjectPickerSheet` is the entry point for "start inspection from
  home". It calls into the inspection registry via the parent
  callback, so adding a new equipment type doesn't require touching
  this folder — only `lib/inspection/registry.ts`.
- The home tab's projects + recent-activity sections (in
  `app/(tabs)/home.tsx`) use the
  `(q.isFetching || !q.isFetched) && data.length === 0` skeleton
  guard rather than `q.isLoading`. Don't revert — `isLoading` flips
  false the moment the very first fetch settles (even with `[]` from
  a racy pre-JWT call) and the empty-state card flashes in place of
  the skeleton until pull-to-refresh. See CLAUDE.md "Loading states"
  and BUG_REPORT.md "Home shows empty projects after first login".

## Canonical helpers used
- `lib/theme`, `lib/services`.
- `components/BottomSheet`, `components/primitives/A11yText`,
  `components/ProjectAvatar`.
