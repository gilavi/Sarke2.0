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
- `PressableScale` — `<Pressable>` that scales down 0.96 on press.
- `useScrollHeader(threshold)` — hook returning a `scrollY`
  `SharedValue` for collapsible headers.

## Internal files
- `AnimatedSuccessIcon.tsx`, `CelebrationBurst.tsx`, `NumberPop.tsx`,
  `PressableScale.tsx`, `useScrollHeader.ts` — one per export.
- `index.ts` — barrel.

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
