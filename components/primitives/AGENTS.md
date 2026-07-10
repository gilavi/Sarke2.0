# primitives

## What this module does
Foundation UI components everything else builds on top of. These
are theme-aware wrappers around React Native primitives — when you
need a button / card / pill / text, reach here first.

## Public API (from index.ts)
- `Button` — variants: `primary`, `secondary`, `link`, `danger`;
  sizes: `sm`, `md`, `lg`; supports left/right icons + loading state.
- `Card` — themed container with shadow / border radius / padding
  presets.
- `Input` — bare text input (most callers should use
  `components/inputs/FloatingLabelInput` instead).
- `Badge` — small pill for counts and status.
- `Screen` — themed `<Screen>` wrapper handling edge-to-edge layout
  + safe-area edges + status-bar tinting.
- `A11yText` — the **single owner of on-screen text**. `<Text>` with
  built-in size/weight/color tokens, a `theme.colors.ink` default,
  and a `maxFontSizeMultiplier={1.5}` Dynamic Type cap. Screens import
  it aliased as `Text` (`import { A11yText as Text } from ...`), so
  existing `<Text style={…}>` JSX is unchanged. Raw `Text` from
  `react-native` is **banned** across `app/`/`features/`/`components/`
  (`check-primitives` → `raw-rn-text`, whole-file); A11yText's own impl
  is the one allow-listed raw consumer. `Button`, `Input`, `Badge`, and
  every input/tour/annotator/`ui` text component route through it.
  See [docs/primitives.md](../../docs/primitives.md#accessible-text-a11ytext).
- `FabButton` — floating action button.
- `ActionSheetItem` — single row in an action sheet.
- `RefreshControl` — themed pull-to-refresh. Pass as the
  `refreshControl` prop of a `ScrollView`/`FlatList`:
  `<RefreshControl queries={[projectsQ, statsQ]} />`. Owns its own
  `refreshing` state, fires a medium haptic, refetches every query
  (anything with `.refetch()`), tints with `theme.colors.accent`.
  Non-query screens use `onRefresh={fn}` (both compose).
  `progressViewOffset`/`tintColor` pass through. **Never** import
  `RefreshControl` from `react-native` directly — see
  [docs/primitives.md](../../docs/primitives.md#pull-to-refresh).

## Internal files
One file per export above plus `index.ts`.

## Gotchas / non-obvious things
- Both `components/ui/` and `components/primitives/` are public —
  `components/ui` is the older barrel that re-exports the
  primitives + a few legacy helpers (Label/Field/Chip/SectionHeader/
  ErrorText) for backwards compatibility. **New code should import
  directly from `components/primitives`.**
- The `A11yText` size/weight/color props feed into theme-aware
  text styles; pass them rather than building inline style objects
  so dark mode + the dynamic-type setting keep working.
- `Button`, `IconButton`, `FabButton` call [`usePressBounce`](../animations/usePressBounce.ts)
  directly for the press squish; `ActionSheetItem` uses the [`PressBounce`](../animations/PressBounce.tsx)
  wrapper (`scaleTo 0.98`) — its old `pressed` bg flash was dropped (the scale carries the feedback).

## Canonical helpers used
- `lib/theme`, `lib/accessibility`.
- `react-native-safe-area-context` (for Screen).
