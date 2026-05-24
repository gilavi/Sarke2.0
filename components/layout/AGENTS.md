# layout

## What this module does
Layout primitives — currently just `KeyboardSafeArea`, the canonical
wrapper that combines `SafeAreaView` insets with the
`react-native-keyboard-controller` keyboard avoidance so wizard
screens scroll above the keyboard without jumping.

## Public API
- `KeyboardSafeArea` — wraps content with safe-area insets and
  keyboard offset. Takes `headerHeight` (so the keyboard offset
  accounts for a fixed header) and `contentStyle`.

## Internal files
- `KeyboardSafeArea.tsx`.

## Gotchas / non-obvious things
- This is the canonical keyboard wrapper. Don't reach for the bare
  `react-native` `KeyboardAvoidingView` — `scripts/check-primitives.mjs`
  enforces this. See `docs/primitives.md` → "Keyboard handling".
- Pair with `react-native-keyboard-controller`'s
  `KeyboardAwareScrollView` for the inner scroll surface — that's the
  combo the wizard and form screens use.

## Canonical helpers used
- `react-native-safe-area-context`.
- `react-native-keyboard-controller`.
