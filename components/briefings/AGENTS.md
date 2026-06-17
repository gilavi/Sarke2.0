# briefings

## What this module does
Presentation components for the briefing (ინსტრუქტაჟი) flow, extracted from the
route files (`app/briefings/new.tsx`, `app/briefings/[id]/sign.tsx`) to keep
them under the file-size targets and to share the signing canvas across the
worker/inspector phases. The flow is a 3-step wizard:

1. date/time + topics  →  2. participants  →  3. signing

All three steps share `components/FlowHeader` with `step` + `totalSteps={3}`
(the standard plain progress bar + `N/3` count — do NOT pass `stepLabels`; the
bespoke segmented/labelled stepper is not used anywhere else and read as odd
here), and they match the inspection (შემოწმება) / harness (ქამრები) flows:
`card` background, `leading="back" trailing="close"`, and the `გასვლა` exit
bottom-sheet via `confirmExit`.

## Public API
- `TopicSelector` (`{ selectedTopics, onToggle, customTopic, onChangeCustomTopic }`)
  — monochrome multi-select topic list (step 1). Owns `TOPIC_KEYS` /
  `TOPIC_ICONS` (exported). Selecting `other` reveals a free-text input.
- `ParticipantsStep` (`{ participants, onAdd, onRemove }`) — name+add row and a
  monochrome chip list (step 2). Owns its own text-input state.
- `SignatureStage` (`{ eyebrow, name, caption?, canvasKey, canvasRef, hasStroke,
  onBegin, onEnd, onOK }`) — signer header block + the `react-native-signature-canvas`
  surface with baseline + "sign here" hint (step 3). Stroke tracking and the
  read/clear lifecycle stay with the caller.
- `useBriefingSigning(id)` — the signing step's state machine + handlers (load,
  per-signer canvas reset, persist, phase derivation, chip roster, completion).
  Keeps `app/briefings/[id]/sign.tsx` to rendering only. Exceeds the 150-line
  hook target because it is one cohesive state machine (cf. the documented
  `features/inspection-wizard/useWizardState.ts` exception); don't grow it.

## Gotchas / non-obvious things
- **Monochrome, low-contrast selection.** Selected = `subtleSurface` (beige)
  fill + a strong `ink` border + `ink` content/check. Deliberately NOT the solid
  `inverse.background` fill `StatusChip` uses — that is too heavy for full-width
  rows. No green/orange selection accents.
- The signing roster is a `components/inspection-parts/ChipNavStrip` with
  `tone="neutral" dotMode="check"` (one chip per participant + a trailing
  inspector chip), NOT a bottom sheet. `dotMode="check"` is the monochrome
  marker mode added for this flow; the harness flow keeps the default
  `dotMode="color"`.
- **Briefing signatures are persisted** (`briefingsApi.update` with base64) —
  this is allowed. The no-persist regulatory rule applies to *inspection*
  signatures only (see `features/signatures/AGENTS.md`).
- **Signing phase is derived from `currentIdx`**, not from "all handled": pointing
  `currentIdx` past the last worker → interstitial/inspector; pointing it back at
  a worker → worker phase. That is what lets a chip tap re-open a signed worker.

## Canonical helpers used
- `components/FlowHeader`, `components/inspection-parts/ChipNavStrip`
- `components/inputs/FloatingLabelInput`, `components/primitives/A11yText`
- `lib/theme`, `lib/accessibility`
