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

## Canonical helpers used
- `lib/theme`, `lib/services`.
- `components/BottomSheet`, `components/primitives/A11yText`,
  `components/ProjectAvatar`.
