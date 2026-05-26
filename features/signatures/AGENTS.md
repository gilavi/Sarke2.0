# signatures

## What this module does
Single-screen signatures management for an inspection. Captures one
creator signature (digitally, on a canvas) and any number of empty
hand-sign slots that render as labeled blank blocks in the generated
PDF so a printed copy can be co-signed by hand. Presented as a
full-screen Modal from the inspection wizard's final step.

## Public API (from index.ts)
- `SignaturesScreen` — the modal screen. Props: `visible`, `onClose`,
  `creatorName`, `state`.
- `useSignaturesState()` — wizard-scope state hook. Returns
  `{ creatorSignature, additionalRows, setCreatorSignature,
  clearCreatorSignature, addRow, removeRow, clear }`.
- `SignaturesState` — the hook's return type.
- `SignatureData`, `AdditionalSignatureRow` — value types.

## Internal files
- `SignaturesScreen.tsx` — composition: header, creator card, divider,
  additional-rows stack, footer "+ ხაზის დამატება" button.
- `CreatorSignatureCard.tsx` — top card. Two visual states:
  empty (placeholder + name + caption) and captured (signature image +
  name + Georgian date + `შეცვლა` button).
- `AdditionalRowCard.tsx` — one dashed-border card per additional row,
  with non-interactive placeholder labels for `ხელმოწერა`, `სახელი`,
  `თარიღი` and an × remove button. Only the × is interactive.
- `SignatureCanvasModal.tsx` — thin wrapper over
  `components/SignatureCanvas` (the canonical canvas component using
  `react-native-signature-canvas`). Exists so the no-persistence rule
  travels with the module.
- `useSignaturesState.ts` — state hook holding `creatorSignature: null
  | { pngBase64, capturedAt }` and `additionalRows: { id }[]`.
- `types.ts` — `SignatureData` + `AdditionalSignatureRow`.

## Gotchas / non-obvious things

- **REGULATORY — Captured signature data is NEVER persisted.** The
  base64 PNG from `SignatureCanvasModal.onConfirm` is held in
  component / wizard state only and exists for one purpose:
  rasterization into the generated PDF. It MUST NOT be uploaded to
  Supabase storage, written to any DB column, cached in AsyncStorage
  / MMKV / SecureStore, or saved to the file system. The wizard
  clears the signatures state explicitly after PDF generation. See
  `CLAUDE.md → Things to Avoid` for the project-wide rule.

- **Empty additional rows do not capture or collect any data.** The
  placeholder labels in `AdditionalRowCard` are visual only — they
  exist so the user understands the row maps to a labeled empty
  block on the printed PDF. The state for a row is just its `id` —
  there is no name/role/signature field. Do not add inputs to this
  card; it would defeat the printed-page purpose.

- **Only the inspection creator can sign digitally.** The creator's
  name is pulled from the user profile (`AppUser.first_name` +
  `AppUser.last_name`) by the parent screen and passed in as
  `creatorName`. There is no role/position picker, no editable name
  field, and no multi-digital-signatory support — co-signers always
  sign the printed PDF by hand using the additional rows.

- **Wizard-scope state lifetime.** `useSignaturesState` is called
  inside the inspection wizard's state hook. The state survives
  step navigation within a single wizard session but does not
  persist across kills. Calling `clear()` after PDF generation is
  the contract; the wizard must not skip it.

- **Modal presentation, not router push.** The screen is mounted as a
  `Modal` with `presentationStyle="fullScreen"` inside the wizard
  tree so the state hook lives with the wizard and the screen sees
  it directly. Don't move this to an expo-router route — that would
  fragment the state across navigation and tempt someone to wire up
  a shared cache (which would be a persistence violation).

## Canonical helpers used (from lib/ and components/)
- `components/SignatureCanvas` — the canvas + capture buttons.
- `components/primitives/A11yText` — accessible text.
- `lib/theme` — `useTheme` + `Theme` type.
- `lib/accessibility` — `a11y` props helper.

## Out of scope
This module governs the inspection signature flow only. It does not
own:
- Project-signer witness signatures (`project_signers` table, the
  `signatures` storage bucket's `project/...` paths,
  `components/RoleSlot*`).
- Tokenized remote signing (`web/` sarke-sign, `remote_signings`
  table, `remote-signatures` bucket, `send-signing-sms` Edge Function).
- Order signatures (embedded in `orders.form_data`).
- Incident / briefing reusable expert signature
  (`users.saved_signature_url` → `expert/<userId>.png`).

Those flows have their own regulatory basis and were intentionally
preserved during the signatures redesign. Do not consolidate them
into this module without explicit authorization.
