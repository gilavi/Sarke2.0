# icons

## What this module does
Custom SVG icons used in the action sheets and quick-action grid.
Distinct from `@expo/vector-icons` (Ionicons) — these are tailored
illustrations that don't have a good Ionicons equivalent.

## Public API
- Named exports from `ActionIcons.tsx` (see file for the current set).

## Internal files
- `ActionIcons.tsx` — every action icon lives in this one file as a
  small `<Svg>` component.

## Gotchas / non-obvious things
- Each icon takes `size` and `color` props so callers can tint them
  to match the surrounding `theme.colors.*`. Don't hard-code colors.

## Canonical helpers used
- `react-native-svg`.
