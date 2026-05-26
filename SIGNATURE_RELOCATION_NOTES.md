# Signature Relocation — Discovery Notes (2026-05-26)

Pre-work read before moving the signatures entry point from the wizard's
`ConclusionStep` to the inspection result screen.

## 1. Result-screen file

`git grep -l "InspectionResultView"` returns one definition + the consumers:

- **Definition:** [components/InspectionResultView.tsx](components/InspectionResultView.tsx) — shared
  post-completion shell rendered by every inspection-type screen after the
  wizard finishes. Owns the WebView PDF preview, the bottom action bar, and
  the paywall modal. Receives `previewHtml` + `onDownloadPdf` from the
  caller.
- **Consumers (10):** the 9 equipment screens (bobcat, excavator,
  general-equipment, cargo-platform, safety-net, mobile-ladder, forklift,
  fall-protection, lifting-accessories) and the generic harness screen at
  [app/inspections/harness/[id].tsx](app/inspections/harness/[id].tsx). The
  generic act detail at [app/inspections/[id].tsx](app/inspections/[id].tsx)
  does NOT use `InspectionResultView` — it has its own inline bottom bar.

## 2. Pre-Phase-5 bottom-bar layout

`git log --all -S "სერტიფიკატები" -- components/InspectionResultView.tsx`
points at `f80a372` (the cargo-platform / mobile-scaffold landing). The
relevant version of the file laid the bottom bar out as a column:

1. A row containing **two outline buttons side-by-side**: certificates on
   the left, signatures on the right. Both went through `useBottomSheet()
   .showSheet({ content: ... })` to mount the corresponding action sheet.
2. A full-width green `გადმოწერა` primary button below.

The certificates button stayed throughout the redesign. Phase 5 of the
previous signature redesign session removed only the signatures button +
its `renderSignaturesSheet` plumbing — the certificates button is still in
the file today (current line 80). What needs restoring is the **row**:
re-introduce the side-by-side layout so that signatures can sit next to
certificates again, instead of certificates standing alone above the
download button.

## 3. Certificates module — still intact

`git grep -l "CertificatesActionSheet"` confirms the existing certificates
sheet is unchanged across the redesign:

- [components/CertificatesActionSheet.tsx](components/CertificatesActionSheet.tsx) — the sheet itself.
- [lib/services/{real,mock}/qualifications.ts](lib/services/real/qualifications.ts) — provides
  `certificatesApi` (the qualifications module aggregates both).
- [lib/services/index.ts](lib/services/index.ts) — `certificatesApi` re-exported.
- [lib/apiHooks.ts](lib/apiHooks.ts) — `useCertificates`, `useCertificatesByInspection`, etc.
- [lib/pdfUploadQueue.ts](lib/pdfUploadQueue.ts) — uses `certificatesApi.create`/`listByInspection`
  for queued uploads.

No restoration of the certificates feature itself is needed. The user's
Phase 3 reduces to wiring the existing `CertificatesActionSheet` into the
re-introduced row layout — and in fact `InspectionResultView` already
mounts it; the only structural change is the column → row layout to make
room for the signatures button next to it.

## 4. Current PDF data flow (to be unwound)

`git grep "getSignaturesSession\|clearSignaturesSession\|setSignaturesSession"`
reports four files:

| File | Role |
|---|---|
| [features/signatures/sessionStore.ts](features/signatures/sessionStore.ts) | Module-level `Map<inspectionId, SignaturesSessionData>` plus the three accessor functions. RAM only, no disk persistence. Phase 5 of this session deletes it. |
| [features/signatures/index.ts](features/signatures/index.ts) | Re-exports the three accessors. Phase 5 removes those exports. |
| [features/inspection-wizard/InspectionWizard.tsx](features/inspection-wizard/InspectionWizard.tsx) | Calls `setSignaturesSession(ws.questionnaire.id, signatures)` from `handleFinish` to stash before navigating away. Phase 4 of this session removes this call (and the wizard's `useSignaturesState` instantiation + the `<SignaturesScreen>` modal mount). |
| [lib/inspection/useInspectionFlow.ts](lib/inspection/useInspectionFlow.ts) | `buildSignaturesSection(inspectionId)` calls `getSignaturesSession`; `handlePdf` calls `clearSignaturesSession`. Phase 5 replaces the session-store reads with a snapshot passed in as a function argument from the result screen. |
| [app/inspections/[id].tsx](app/inspections/[id].tsx) | Same pattern as `useInspectionFlow` for the generic inspection screen. Phase 5 reroutes through the snapshot-arg pattern. |

## 5. The wizard signature entry point (to be removed)

`git grep -nE "SignaturesEntryRow|signatureStatusText|onOpenSignatures|signaturesOpen|useSignaturesState" -- 'features/inspection-wizard/'`
identifies the wizard-side wiring:

- [features/inspection-wizard/InspectionWizard.tsx](features/inspection-wizard/InspectionWizard.tsx) — instantiates
  `useSignaturesState()`, derives `signatureStatusText` and `creatorName`,
  mounts the `<SignaturesScreen>` modal, and threads `onOpenSignatures` /
  `signatureStatusText` into `ConclusionStep`. Phase 4 strips all of this.
- [features/inspection-wizard/ConclusionStep.tsx](features/inspection-wizard/ConclusionStep.tsx) — renders the
  `ხელმოწერები` section with `<SignaturesEntryRow>`. Phase 4 removes that
  section and the prop.
- [features/inspection-wizard/SignaturesEntryRow.tsx](features/inspection-wizard/SignaturesEntryRow.tsx) — the row
  component. Phase 4 deletes this file outright.

## 6. Scope check

Certificates discovery passes: the feature itself is unchanged across the
prior redesign; the only thing missing on the result screen is the
side-by-side row layout that used to hold both buttons. **No separate
scope.** Phases 2 and 3 collapse into one structural change to
`InspectionResultView`, plus an internal `useSignaturesState` hook + modal
mount + a callback prop for the parent to receive the snapshot at download
time.
