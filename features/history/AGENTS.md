# features/history

## What this module does

The global History screen (`app/history.tsx` is a one-line delegate to
`HistoryScreen`). Shows **one record type at a time**, chosen by a chip strip —
Inspections (default) · Reports · Brdzaneba · Incidents · Briefings. There is
**no "all" view**. Each tab shows only **completed** records (drafts live in
`features/drafts/`). Deep-linkable via `?type=<key>`; the Home widgets' "view
all" links land here.

## Public API

- `HistoryScreen` (default export of `HistoryScreen.tsx`) — the screen.

## Internal files

- `HistoryScreen.tsx` — chip strip + `?type=` param sync + the four simple
  tabs (Reports / Orders / Incidents / Briefings) as module-scope components.
- `InspectionHistoryTab.tsx` — the Inspections tab; keeps swipe-to-delete and
  the certificate-count badge. Completed-only (no status dot).
- `RecordHistoryList.tsx` — generic per-tab scaffold: three-state guard,
  per-type empty copy, pull-to-refresh, FlatList of rows.

## Gotchas

- **One mounted tab → one query.** Tabs are conditionally rendered, so only the
  active type's `useRecent*` query runs. They use `RECENT_COMPLETED_LIMIT` (50,
  from `features/records`) — the SAME key as the Home widgets, so navigating
  Home → History is a cache hit.
- **Type validation:** unknown/absent `?type=` falls back to
  `DEFAULT_RECORD_TYPE`. Use `isRecordTypeKey` before trusting the param.
- **Inspections routing** uses the template category
  (`routeForInspection(tpl.category, id, true)`) — matches Home and the old
  History. Don't switch it to a `source`-based path.
- Orders are display-only (no detail route) — `OrderRow` gets no `onPress`.

## Canonical helpers consumed

- `features/records` (rows, descriptors, `RECENT_COMPLETED_LIMIT`),
  `components/ui` (`Screen`, `FilterChipRow`),
  `components/projects/ProjectRowHelpers` (`IncidentRow`),
  `lib/apiHooks` (`useRecent*`, `useCertificateCounts`).
