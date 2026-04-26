# Offline & Sync

Inspections are filled in on remote sites where connectivity is patchy. The app aims to "keep working" offline and reconcile when the network returns.

## Surfaces

- [`<OfflineBanner />`](./components.md#offlinebanner) — top-of-screen indicator while offline.
- [`<SyncStatusPill />`](./components.md#syncstatuspill) — pill in headers showing the offline-queue depth and sync state.
- [`lib/offline.tsx`](./lib.md#offlinetsx) — provider + hook backing both surfaces.

## What's queued vs. immediate

| Operation | Path |
| --- | --- |
| Reading lists / detail data | Goes through Supabase JS; cached by RN runtime; no offline cache layer beyond what's on screen. |
| Saving an answer | Queued; replayed on reconnect. |
| Uploading a photo | Queued and retried; uploads use `FileSystem.uploadAsync` (see [PDF generation](./pdf-generation.md#why-filesystemuploadasync-for-photos)). |
| Marking inspection complete | Requires connectivity — must succeed atomically with cert generation. |
| Optimistic deletes | Tracked in [`lib/pendingDeletes.ts`](./lib.md#pendingdeletests) so deleted-but-unsynced rows don't reappear in cached lists. |

## Reconciliation

On reconnect the offline provider drains its queue oldest-first, surfacing failures via `<SyncStatusPill />`. Failed mutations stay queued until the user retries from the pill or signs out (`storage-purge.ts` clears them).

## Limitations

- Only mutations the app explicitly routes through the offline queue are replayed. Direct Supabase calls (e.g. signing up) require connectivity.
- The queue is persisted with `expo-secure-store` and survives app restart; it does **not** survive sign-out.
- Conflict resolution is last-write-wins server-side (Postgres triggers in `0008` / `0010` block edits to frozen rows, so an offline edit attempted against a since-completed inspection will fail loudly).
