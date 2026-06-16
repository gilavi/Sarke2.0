# inputs

## What this module does
Canonical text/number input primitives. `FloatingLabelInput` is the
project's default input control — when adding a new form, use it
rather than a bare `<TextInput>`.

## Public API
- `FloatingLabelInput` — Material-style floating-label input with
  multi-line / required-marker / error / accessory-id support.
- `PlateInput` — license-plate input that auto-uppercases and emits
  via a `PlateInputHandle` ref.
- `SerialKeypad` — modal numeric keypad for entering equipment
  serial numbers when the user can't easily type the standard keyboard
  layout (gloves on a worksite, etc.).
- `QuantitySelector` — one-tap count picker: a wrap-grid of preset
  chips + a custom numeric field, clamped to `[min, max]`. The
  reusable replacement for inline +/- steppers on "how many?" prompts
  (e.g. the harness count step). Caller supplies `presets`/`min`/`max`.

## Internal files
- `FloatingLabelInput.tsx`, `PlateInput.tsx`, `SerialKeypad.tsx`,
  `QuantitySelector.tsx`.

## Gotchas / non-obvious things
- `FloatingLabelInput` accepts `inputAccessoryViewID` and is the
  default way wizard screens hook up the iOS "მზადაა" (Done)
  accessory bar above the keyboard.
- `PlateInput` exposes an imperative ref (`PlateInputHandle`) for
  callers that need to `.focus()` programmatically — equipment routes
  use this to jump from "model" to "plate" automatically.

## Canonical helpers used
- `lib/theme`, `lib/haptics`.
- `react-native-keyboard-controller`.
