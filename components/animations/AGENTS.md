# animations

## What this module does
Small, opinionated wrappers around `react-native-reanimated` and
`Animated.Value` that handle the project's recurring micro-animations
(button press scale, success-icon morph, "celebration" particle burst,
number pop, sticky-header collapse).

## Public API (from index.ts)
- `AnimatedSuccessIcon` — ✓ icon that morphs in with a spring scale.
- `CelebrationBurst` — quick particle burst used on order/inspection
  success screens.
- `NumberPop` — `<Text>` whose value pulses on change.
- `PressBounce` — `<Pressable>` wrapper carrying the canonical press
  feel: composes `usePressBounce` onto an `AnimatedPressable` so a
  bordered chip/row scales **as one unit**. Use for any tap target that
  isn't already a Button/IconButton/FabButton/StatusChip. Props:
  `scaleTo` (~0.90 keys → ~0.98 rows), `hapticOnPress`, `style`, `onPress`.
- `useScrollHeader(threshold)` — hook returning a `scrollY`
  `SharedValue` for collapsible headers.

### Imported directly (NOT in the barrel — like the hooks they pair with)
- `usePressBounce(scaleTo=0.94)` (`usePressBounce.ts`) — THE single
  source of the press squish→bouncy-spring. `PressBounce` and the button
  primitives both compose it, so the feel can't drift.
- `useSelectionPop(active)` (`useSelectionPop.ts`) — the selection sibling
  of `usePressBounce`: returns `popStyle` that springs an indicator scale
  0→1 (bouncy) when `active` turns true, snaps out (stiff) on deselect.
  Reduce-motion aware. Used by `Selector`, `StatusChip`, `ChipNavStrip`.

## Internal files
- `AnimatedSuccessIcon.tsx`, `CelebrationBurst.tsx`, `NumberPop.tsx`,
  `PressBounce.tsx`, `useScrollHeader.ts` — one per barrel export.
- `usePressBounce.ts`, `useSelectionPop.ts` — the press/selection hooks
  (directly imported, not barrelled).
- `index.ts` — barrel.

> The old `PressableScale` was removed (it held a hold-feel + `gentle`
> spring, scaled an inner view so borders didn't move, and ignored
> reduce-motion). Use `PressBounce`.

## Gotchas / non-obvious things
- `useScrollHeader` returns a Reanimated `SharedValue` — pair it with
  `useAnimatedScrollHandler` on the `ScrollView`, not the built-in
  `Animated.Value` API.
- All animations honour `useAccessibilitySettings().reduceMotion` —
  when true, props like `entering={reduceMotion ? undefined : FadeIn}`
  should be applied at the call site (these wrappers don't disable
  themselves automatically).

## Canonical helpers used (from lib/)
- `lib/accessibility` — `useAccessibilitySettings`.
- `react-native-reanimated`.
