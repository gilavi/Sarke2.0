# incident-new

## What this module does
The full incident flow behind the `app/incidents/new.tsx` route (that file
is a one-line re-export, same pattern as `features/order-new`): a 4-step
wizard — type · person/details · description/witnesses/photos · summary —
plus the save layer: photo upload with offline staging, the incident row
write through the generic write outbox (`lib/outbox/`), PDF composition +
share, and background persistence of the generated PDF. Handles create,
edit (`editId` param) and the silent exit-to-draft save.

## Public API (from index.ts)
- `NewIncidentScreen` — default export; renders the entire flow.

## Internal files
- `NewIncidentScreen.tsx` — orchestrator. Owns step navigation, the
  submit guard + scroll-to-error wiring, the inspector-from-session memo,
  the `FlowProjectPicker` fallback (launched from Home without a project),
  and the FlowHeader exit wiring (`confirmExit`/`backIsExit`/`exitCopy`,
  swipe-back disabled while dirty). Renders one memoized step at a time.
- `incidentFormSchema.ts` — pure helpers: `Step`, `FormData`,
  `IncidentPhoto`, `INITIAL_FORM`, `computeHasSubstance` (the bar for the
  silent exit-draft), `canAdvanceStep`, `missingFieldsForStep` (ordered
  keys for scroll-to-error — MUST match the `registerField('<key>')`
  wrappers in the steps).
- `useIncidentForm.ts` — form state hook. One `FormData` state + a
  **stable per-field setter bag** (`setters`, identity fixed for the
  component's lifetime), witness/photo handlers, project load, edit-mode
  hydration (existing photos keep `existingPath`), and the derived
  `isFormDirty` / `exitSavesDraft` flags. The stable setters + memoized
  fields are the fix for the "every keystroke re-renders the whole form"
  perf finding — keep setters out of render-scoped closures.
- `useIncidentDraftSave.ts` — the explicit step-4 draft save and the
  fire-and-forget `saveExitDraft` (batch-4 honest exit dialog: a NEW
  incident with substance is silently kept as a draft on exit; edit mode
  discards, and the dialog copy switches accordingly in the screen).
- `useIncidentPdfSave.ts` — the completion path: save as `completed`,
  compose + share the PDF, background-persist it. Owns the failed-commit
  photo cleanup and the PDF-limit gate callbacks.
- `IncidentField.tsx` — `React.memo` wrapper around the canonical
  `FloatingLabelInput` (which itself is un-memoized). With primitive
  `value` + stable `onChangeText`, typing in one field re-renders only
  that field. Don't pass fresh object/array props to it.
- `Step1Type.tsx` / `Step2Details.tsx` / `Step3Description.tsx` /
  `Step4Summary.tsx` — memoized step components. Step 1 uses the
  canonical `components/ui/Selector` (`presentation="rows"`,
  `indicator="check"`). Step 3 additionally memoizes its `WitnessList`
  and `PhotoGrid` internals. Step 4 resolves the inspector's saved
  signature for display via `imageForDisplay`.
- `styles.ts` — `makeStyles(theme)` factory, `IncidentStyles` type.
- `saveIncident.ts` — pure async save layer (see below).

## Save layer (saveIncident.ts)
- `uploadIncidentPhotos(incidentId, photos)` → `UploadedIncidentPhoto[]`
  — uploads new photos to `incident-photos`; edit-mode photos with an
  `existingPath` are passed through untouched. Offline (or on a
  network-classified failure) each new photo is compressed + staged and
  a `file_upload` outbox op is enqueued instead — the returned `path` is
  pre-computed either way so the row's `photos` column is correct.
- `buildIncidentFields(form, photoPaths, inspectorSignature, status)` —
  the exact snake_case column set both save paths write (draft vs
  completed differ only in `status`; `pdf_url` always resets to null).
- `saveIncidentRow({ incidentId, projectId, mode, userId, fields })` →
  `{ queued, incident }` — the row write via `saveRecordThroughOutbox`.
  Online it is exactly the old `incidentsApi.create/update`; queued
  saves return an optimistic `Incident` (seeded into
  `qk.incidents.byId`) so the PDF/success screens keep working.
- `embedIncidentPhotosForPdf(uploaded)` → `string[]` — data: URLs for
  the PDF. New photos embed from their local file:// uri (offline-safe,
  no re-download, 1200px/JPEG-0.7 like `pdfPhotoEmbed`); existing ones
  go through the canonical `pdfPhotoEmbed`. Failed embeds are dropped.
- `composeIncidentPdfHtml({ incident, project, inspectorName,
  inspectorSigPath, uploaded })` → HTML string — resolves the saved
  signature via `signatureAsDataUrl` (strict data: URL, disk-cached so
  it works offline; failure just omits the graphic), embeds the photos,
  and calls the canonical `buildIncidentPdfHtml`.
- `persistIncidentPdf({ incidentId, localUri, pdfPath, pdfName,
  pdfHash, rowQueued })` → `'uploaded' | 'queued'` — background PDF
  persistence. If the row save queued (or the device is offline) the
  PDF is staged and enqueued as a `pdf_upload` op with a
  `pdf_url`/`pdf_hash` dbPatch; otherwise it uploads + patches the row
  immediately, falling back to the legacy `queuePdfUpload` queue on
  failure (pre-outbox behavior, unchanged).
- Private helpers: `stagePhotoOp` (stage + enqueue one photo) and
  `localPhotoForPdf` (local-file resize→base64 with a raw file://
  fallback, which expo-print renders — precedent:
  `features/inspection-result/shareActPdf.ts`).

## Gotchas / non-obvious things
- **Preserve the batch-4 exit behavior.** `exitSavesDraft` (new + has
  project + type picked + `computeHasSubstance`) gates the silent
  exit-draft; the FlowHeader gets `confirmExit={isFormDirty}`,
  `backIsExit={step === 1}`, and per-case `exitCopy`
  (`incidents.exitDraftBody` vs `wizard.exitBodyDiscard`); iOS
  swipe-back is disabled while dirty (`gestureEnabled: !isFormDirty`);
  Android hardware back is handled inside FlowHeader. Don't decouple
  these — the dialog copy must stay honest about what exit does.
- **Op ordering rides on `groupId`.** Every op enqueued here uses the
  incident id as `groupId`, and photos are enqueued before the row,
  the row before the PDF — the outbox flush replays a group in
  enqueue order, so storage objects exist before rows reference them.
- **Offline-staged photo paths are always `.jpg`** (staging compresses
  to JPEG); online uploads keep the picked file's extension, matching
  the pre-outbox path scheme `${incidentId}/${photoId}.<ext>`.
- **Cleanup semantics:** on a failed commit `useIncidentPdfSave` only
  removes photos that actually reached storage (`isNew && !queued`).
  Queued `file_upload` ops are NOT dequeued if a later non-network error
  aborts the save — they may upload orphaned photos; acceptable, same
  as the legacy dropped-photo behavior is lossy in the other direction.
- **The PDF free-tier gate is skipped offline** — `useIncidentPdfSave`
  passes `userId: undefined` to `generateAndSharePdf` when
  `onlineManager.isOnline()` is false, because `increment_pdf_count`
  is a Postgres RPC. Offline PDFs therefore don't count against the
  free tier.
- **Edit mode:** photos with `existingPath` are never re-uploaded or
  deleted; the optimistic row for a queued update merges over the
  cached `getById` row to preserve `created_at`/`user_id`.
- **Re-render discipline:** every step is `React.memo`'d and receives
  primitives + stable references only (setter bag, `registerField`,
  `t`, theme, `s`). If you add a field, give it a setter in the bag and
  render it through `IncidentField`; don't pass inline objects/arrays
  or fresh closures into memoized children, and don't hand the whole
  `form` object to steps 1–3 (step 4 gets it because it re-renders
  only on entry).
- **REGULATORY:** nothing here persists captured signature data. The
  inspector's reusable saved signature is referenced by storage path
  only; its data: URL is resolved in `composeIncidentPdfHtml` via
  `signatureAsDataUrl` (disk-cached, offline-capable) and exists only
  inside the PDF HTML.

## Canonical helpers used (from lib/, hooks/, components/)
- `lib/outbox` — `saveRecordThroughOutbox`, `enqueueOutboxOp`;
  `lib/outbox/storage` — `isNetworkError`.
- `lib/photoCompression` — `stageCompressedPhotoForOffline` (profile
  `'incident'`).
- `lib/pdfUploadQueue` — `stagePdfForQueue`, `queuePdfUpload` (legacy
  online-failure fallback only).
- `lib/imageUrl` — `pdfPhotoEmbed`, `signatureAsDataUrl`,
  `imageForDisplay`.
- `lib/incidentPdf` — `buildIncidentPdfHtml`; `lib/pdfOpen` /
  `lib/pdfSecurity` / `lib/pdfName` — PDF share, hash, naming.
- `lib/usePdfUsage` — quota gating for the paywall.
- `lib/services` — `incidentsApi`, `projectsApi`, `storageApi`
  (compression profile `'incident'` on upload).
- `lib/apiHooks` — `qk`, `invalidateRecordLists`; `lib/queryClient` —
  `queryClient`; `lib/cachedRead` — `cachedRead`.
- `lib/supabase` — `STORAGE_BUCKETS.incidentPhotos`,
  `STORAGE_BUCKETS.pdfs`, `STORAGE_BUCKETS.signatures`.
- `lib/statusColors` — `incidentColors`; `lib/formatDate` —
  `formatShortDateTime`; `lib/errorMap` — `friendlyError`;
  `lib/logError` — `logError`; `lib/theme` / `lib/toast` /
  `lib/session`.
- `hooks/useSubmitGuard`, `hooks/useScrollToError`,
  `hooks/usePhotoPicker`.
- `components/FlowHeader`, `components/FlowProjectPicker`,
  `components/DateTimeField`, `components/SubscriptionNotice`,
  `components/layout/KeyboardSafeArea`, `components/ui` (`Button`,
  `Selector`), `components/inputs/FloatingLabelInput`,
  `components/primitives` (`A11yText`, `IconButton`).
