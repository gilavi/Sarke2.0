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
- `GeocodingAddressInput` — `FloatingLabelInput` plus a focused,
  debounced forward-geocode (via `lib/geocode.ts`). As the user types
  an address it drops the map pin through `onPin(loc)` and shows
  searching / not-found status in the input's `helper`. Use it for the
  address field on any form that also has a map pin; the in-map sync
  lives in `components/MapPicker.tsx`. See docs/primitives.md
  "Geocoding (address ↔ map pin)".

## Internal files
- `FloatingLabelInput.tsx`, `PlateInput.tsx`, `SerialKeypad.tsx`,
  `QuantitySelector.tsx`, `GeocodingAddressInput.tsx`.
- `PlateCell.tsx` — one plate cell, extracted from `PlateInput` so each
  cell owns its own animated border shared value.

## Gotchas / non-obvious things
- `FloatingLabelInput` accepts `inputAccessoryViewID` and is the
  default way wizard screens hook up the iOS "მზადაა" (Done)
  accessory bar above the keyboard.
- `PlateInput` exposes an imperative ref (`PlateInputHandle`) for
  callers that need to `.focus()` programmatically — equipment routes
  use this to jump from "model" to "plate" automatically.
- Animations: `SerialKeypad` keys + `QuantitySelector` preset chips use
  [`PressBounce`](../animations/PressBounce.tsx) (keys are punchy, `scaleTo 0.90`).
  `PlateInput`'s active cell fades its ink border in (`PlateCell`, `withTiming` on a
  `subtleSurface`→`ink` interpolation to dodge the `transparent`-tint issue) and the
  caret fades in once — **no press-bounce** (a cell tap is focus, not a discrete press).
  `FloatingLabelInput` tweens its focus border color via legacy `Animated` (the file has
  no reanimated). All honour reduce-motion.

## Canonical helpers used
- `lib/theme`, `lib/haptics`.
- `react-native-keyboard-controller`.
