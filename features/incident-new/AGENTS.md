# incident-new

## What this module does
Save orchestration for the incident flow route (`app/incidents/new.tsx`):
photo upload with offline staging, the incident row write through the
generic write outbox (`lib/outbox/`), PDF photo embedding, and the
background persistence of the generated PDF. The route file keeps the
form/step UI and all toasts + routing; every function here is a pure
async operation over explicit arguments.

## Public API (from saveIncident.ts)
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
- `persistIncidentPdf({ incidentId, localUri, pdfPath, pdfName,
  pdfHash, rowQueued })` → `'uploaded' | 'queued'` — background PDF
  persistence. If the row save queued (or the device is offline) the
  PDF is staged and enqueued as a `pdf_upload` op with a
  `pdf_url`/`pdf_hash` dbPatch; otherwise it uploads + patches the row
  immediately, falling back to the legacy `queuePdfUpload` queue on
  failure (pre-outbox behavior, unchanged).

## Internal files
- `saveIncident.ts` — everything above plus two private helpers:
  `stagePhotoOp` (stage + enqueue one photo) and `localPhotoForPdf`
  (local-file resize→base64 with a raw file:// fallback, which
  expo-print renders — precedent: `features/inspection-result/shareActPdf.ts`).

## Gotchas / non-obvious things
- **Op ordering rides on `groupId`.** Every op enqueued here uses the
  incident id as `groupId`, and photos are enqueued before the row,
  the row before the PDF — the outbox flush replays a group in
  enqueue order, so storage objects exist before rows reference them.
- **Offline-staged photo paths are always `.jpg`** (staging compresses
  to JPEG); online uploads keep the picked file's extension, matching
  the pre-outbox path scheme `${incidentId}/${photoId}.<ext>`.
- **Cleanup semantics:** on a failed commit the route only removes
  photos that actually reached storage (`isNew && !queued`). Queued
  `file_upload` ops are NOT dequeued if a later non-network error
  aborts the save — they may upload orphaned photos; acceptable, same
  as the legacy dropped-photo behavior is lossy in the other direction.
- **The PDF free-tier gate is skipped offline** — the route passes
  `userId: undefined` to `generateAndSharePdf` when
  `onlineManager.isOnline()` is false, because `increment_pdf_count`
  is a Postgres RPC. Offline PDFs therefore don't count against the
  free tier.
- **Edit mode:** photos with `existingPath` are never re-uploaded or
  deleted; the optimistic row for a queued update merges over the
  cached `getById` row to preserve `created_at`/`user_id`.
- **REGULATORY:** nothing here persists captured signature data. The
  inspector's reusable saved signature is referenced by storage path
  only; its data: URL is resolved in the route via `signatureAsDataUrl`
  (disk-cached, offline-capable) and exists only inside the PDF HTML.

## Canonical helpers used (from lib/)
- `lib/outbox` — `saveRecordThroughOutbox`, `enqueueOutboxOp`;
  `lib/outbox/storage` — `isNetworkError`.
- `lib/photoCompression` — `stageCompressedPhotoForOffline` (profile
  `'incident'`).
- `lib/pdfUploadQueue` — `stagePdfForQueue`, `queuePdfUpload` (legacy
  online-failure fallback only).
- `lib/imageUrl` — `pdfPhotoEmbed` (existing photos only).
- `lib/services` — `incidentsApi`, `storageApi` (compression profile
  `'incident'` on upload).
- `lib/apiHooks` — `qk.incidents.byId`; `lib/queryClient` —
  `queryClient` (optimistic detail-cache seed).
- `lib/supabase` — `STORAGE_BUCKETS.incidentPhotos`, `STORAGE_BUCKETS.pdfs`.
- `lib/logError` — `logError`.
