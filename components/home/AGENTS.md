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
- `ProjectCard.tsx`, `ProjectCardMap.tsx` (the card's monochrome map
  backdrop — snapshot/live-map switch + radial mask + pulsing dot),
  `ProjectPickerSheet.tsx`.

## Gotchas / non-obvious things
- `ProjectCard`'s map background is a **cached raster snapshot** on iOS,
  not a live map: `useMapCardSnapshot` (hooks/) resolves a PNG from disk;
  only on a cache miss does the live `MapView` mount, capture one
  snapshot via `onMapReady` → `takeSnapshot`, and unmount once the image
  has drawn. Don't "simplify" it back to an always-mounted `MapView` —
  on iOS `liteMode` is a no-op and Home used to hold up to 8 live
  MKMapViews (~15–30 MB each). Android keeps the cheap `liteMode` map
  (the hook is inert there). The monochrome look (desaturation layer +
  radial SVG mask + pulsing location dot) is a brand element — keep it
  on top of whichever layer renders. The dot's breathing pulse is
  cancelled on unmount and stilled under reduce-motion.
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
  and docs/reports/BUG_REPORT.md "Home shows empty projects after first login".
- `ProjectPickerSheet`'s new-project form keeps the address text and
  the map pin in sync: the address field is `GeocodingAddressInput`
  (type → pin) and the map overlay's `MapPicker` reverse-geocodes a
  tapped pin → address. Don't reach for `expo-location` (removed
  2026-06) — geocoding is the Nominatim HTTP path in `lib/geocode.ts`.
  The header back/✕ are the shared `HeaderBackButton` /
  `HeaderCloseButton`, not raw icons.

## Canonical helpers used
- `lib/theme`, `lib/services`, `lib/geocode`, `lib/accessibility`
  (`useAccessibilitySettings` for the reduce-motion gate).
- `hooks/useMapCardSnapshot` — cached map raster for `ProjectCard`
  (see docs/primitives.md → "Decorative map card → cached snapshot").
- `components/BottomSheet`, `components/primitives/A11yText`,
  `components/ProjectAvatar`, `components/HeaderBackButton`,
  `components/HeaderCloseButton`, `components/inputs/GeocodingAddressInput`.
