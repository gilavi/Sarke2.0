# lib/outbox — generic write outbox

## What this module does
Queues document writes made offline (or on a network-classified failure) and
replays them on reconnect, so every creation flow — orders, briefings,
incidents, reports, risk assessments, breathalyzer logs, and inspection
creation itself — completes offline. It complements, not replaces, the two
older queues: `lib/offline.tsx` (inspection answers/photos/completion) and
`lib/pdfUploadQueue.ts` (legacy online-path PDF retries). `OfflineProvider`
flushes the three sequentially: **outbox → offline queue → pdf queue**
(rows must exist before their FK children).

## Public API (import from `lib/outbox`)
- `saveRecordThroughOutbox(args)` — THE way screens write records
  (`entity`, `mode`, `recordId`, `payload`, `displayTitle`, `projectId`,
  `detailKey`, `optimistic`). Online = the direct service call it replaces;
  offline/network-failure = enqueue + seed the detail cache. Never call
  `<entity>Api.create/update` directly from a screen. **Pending-create
  guard:** an online UPDATE for a record whose earlier save is still queued
  (or sits in the failed queue — it gets revived first) coalesces into that
  op instead of writing a row that doesn't exist yet — several services'
  patches (risk, breathalyzer) have no row-count check and would silently
  no-op, losing the edit when the create later replays.
- `enqueueOutboxOp(op)` — raw enqueue for `file_upload` / `pdf_upload` /
  `inspection_create` ops (record ops should use saveRecordThroughOutbox).
- `flushOutbox()` / `retryOutboxFailed()` / `dismissOutboxFailed(groupId?)`.
- `pendingInspectionIds()` — consumed by `lib/offline.tsx` to defer
  answer/patch ops whose inspection creation is still queued.
- `useOutbox()` — pending/failed groups for `components/PendingSyncSection`.
- `isNetworkError(e)` (from `./storage`) — the shared failure classifier.

## Internal files
- `types.ts` — the op union (`record_save`, `file_upload`, `pdf_upload`,
  `inspection_create`) + `NewOutboxOp`. Everything must round-trip JSON.
- `storage.ts` — AsyncStorage keys `@outbox:queue|failed` (+ `:backup`,
  corruption-fallback pattern from lib/offline.tsx), the change emitter, the
  mutation lock, enqueue + **coalescing**: an UPDATE for a record whose
  earlier record_save is still queued merges into that op's payload
  (edit-after-queued-create). Leaf module — no imports into apiHooks or
  services, so `lib/inspection/service.ts` can enqueue cycle-free. Every
  enqueue while `onlineManager` still reports online (i.e. the op got here
  via a network-classified failure) schedules a `flushOutbox` kick — without
  it nothing would replay until the next NetInfo transition. The kick uses a
  dynamic `import('./flush')` on purpose (a static import would arm the
  service→registry→services cycle at module-init).
- `registry.ts` — entity → create/update dispatch. Because of coalescing,
  every service `create` accepts the entity's updatable fields as optional
  args (`id`, `status`, `slides`, `inspectorSignature`, …); breathalyzer's
  method-per-field api is dispatched on payload keys, and a coalesced
  `close` is unpacked inside its create wrapper.
- `flush.ts` — FIFO; a failing op skips the rest of its group this pass;
  3 exhausted attempts move the WHOLE group to the failed queue; an
  auth-classified error aborts the flush without burning attempts (token
  hasn't refreshed yet). A replayed create hitting 23505/duplicate-key
  re-applies its payload as an UPDATE (edits coalesced in after a
  half-applied pass must not drop; the report registry mapper strips
  create-only keys for exactly this path). `inspection_create` runs the
  parent RPC first, then UPSERTS the row (`ignoreDuplicates`) — the
  CLAUDE.md parent-row-first rule.
- `saveRecord.ts` / `useOutbox.ts` / `index.ts` — the public surface.

## Gotchas
- **Queued work dies on forced sign-out**: `SIGNED_OUT` triggers
  `purgeUserScopedStorage` which wipes `@outbox:` (deliberate — ops carry
  another user's rows otherwise). Same exposure as the older queues.
- **Group ordering is the only ordering**: ops of one document share
  `groupId` (= record id) and replay in enqueue order; cross-group order is
  best-effort FIFO. Photos whose paths are pre-computed don't need to
  precede their row (no FK on storage paths).
- **PDF uploads for queued records** must go through a `pdf_upload` op with
  `dbPatch` — NOT `queuePdfUpload` (that queue silently DROPS items after 3
  attempts and can't wait for the row to exist).
- **Optimistic cache seeds** use the caller-passed `detailKey` — pass
  `qk.<entity>.byId(recordId)` so `cachedRead`/hooks find it; never
  hand-write key literals.
- Do not import `lib/outbox/flush.ts` (or anything that reaches
  `lib/apiHooks`) from service files — use `./storage` exports only, or you
  recreate the service→apiHooks→service cycle.

## Canonical helpers it consumes
`stageCompressedPhotoForOffline` (lib/photoCompression),
`stagePdfForQueue` (lib/pdfUploadQueue), `storageApi.uploadFromUri`,
`invalidateRecordLists` (lib/apiHooks), `onlineManager` (react-query).
