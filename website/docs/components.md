---
sidebar_position: 5
---

# Components

Reusable UI under `components/`. None of them call Supabase directly — they take props (data + callbacks) and render. Data fetching belongs in [route screens](./routes/tabs.md) or [services](./lib.md#data-services).

## Primitives

### ui.tsx

The kitchen-sink primitives module. Exports:

- `<Button />` — primary / secondary / destructive variants
- `<Card />` — rounded container with elevation
- `<Input />` — labelled text input with error state
- `<Chip />` — pill / tag display
- `<Screen />` — `<SafeAreaView>` + scrollview wrapper used by every route

Anything you'd otherwise build with bare `<View>` + theme tokens lives here.

### Skeleton

Loading placeholder. Used while waiting for `useAsync` results.

## Form / input

### SignatureCanvas

Wrapper around `react-native-signature-canvas`. Handles base64 export, clear, undo. Used by `/signature` and the inspection done step.

### MapPicker

Map + draggable pin for selecting `latitude` + `longitude` on a project. Shows reverse-geocoded address.

### CrewSection

Editable list of `CrewMember[]`. Add row, delete row, edit name / role inline. Writes back via the parent's `onChange`.

### UploadedFilesSection

List of `ProjectFile` rows for a project. Add file (camera / picker / files), delete with confirmation.

### QuestionAvatar

Small icon indicating the [`QuestionType`](./data-model.md#enums) (yesno / measure / grid / freetext / photo). Used in question lists and the wizard header.

## Modals & sheets

### BottomSheet

Reusable bottom-drawer modal pattern. Used by help sheets, photo picker, signer modal.

### AddRemoteSignerModal

Phone / email + name + role form. On submit creates a `remote_signing_requests` row and triggers the SMS / email send. See [Signing flow](./signing-flow.md).

### ScaffoldHelpSheet

Contextual help bottom sheet keyed on a help-topic id. Content registry in [`lib/scaffoldHelp.ts`](./lib.md#scaffoldhelpts).

### ScaffoldTour

First-run onboarding overlay with a sequence of tooltip steps.

## Status / state

### ProjectLogo

Logo image + fallback to a generated avatar from project initials.

### SyncStatusPill

Badge showing offline-queue depth + sync status. Driven by `lib/offline.tsx`.

### OfflineBanner

Top-of-screen banner shown when the device is offline.

### UploadOverlay

Full-screen progress overlay during a long upload (PDF, multiple photos).

### ErrorBoundary / ErrorState

`<ErrorBoundary>` catches render-time errors and shows `<ErrorState>`. `<ErrorState>` is also used directly for fetch failures.
