# features/history

## What this module does

The global History screen (`app/history.tsx` is a one-line delegate to
`HistoryScreen`). Shows **one record type at a time**, chosen by a chip strip —
Inspections (default) · Reports · Brdzaneba · Incidents · Briefings. There is
**no "all" view**. Each tab shows only **completed** records (drafts live in
`features/drafts/`). Deep-linkable via `?type=<key>`; the Home widgets' "view
all" links land here.

On top of the type tabs the screen carries a **search field** and (when the
account has >1 project) a **project chip row** — both filter every tab
client-side over its loaded rows. Each tab **paginates** past the 50-row first
page (infinite scroll + a "მეტის ჩატვირთვა" footer), so older documents are
reachable.

## Public API

- `HistoryScreen` (default export of `HistoryScreen.tsx`) — the screen.

## Internal files

- `HistoryScreen.tsx` — chip strip + `?type=` param sync + lazy-mounted pager +
  the search / project-filter state shared by all tabs.
- `HistoryTabs.tsx` — the four simple tabs (Reports / Orders / Incidents /
  Briefings), each taking `HistoryTabFilters` (`{ search, projectId }`).
- `InspectionHistoryTab.tsx` — the Inspections tab; keeps swipe-to-delete and
  the certificate-count badge. Completed-only (no status dot).
- `RecordHistoryList.tsx` — generic per-tab scaffold: four-state guard,
  per-type empty copy, "no results" copy for a filtered-out list,
  pull-to-refresh, infinite-scroll/`load more` footer, FlatList of rows. Used
  by the Inspections / Orders / Incidents / Briefings tabs. **The Reports tab
  instead uses `ReportCardGrid`** (from `features/records`) — a 2-column grid
  of cover-photo cards that takes the same `totalCount`/`paging` props.
- `useHistoryFeed.ts` — paged (`useInfiniteQuery`) variants of the five
  completed feeds + `feedPaging()` adapter. Page 1 is seeded from the plain
  `qk.<type>.recent(completed/50)` cache entry (Home-warmed), later pages fetch
  with `RecentRecordsOpts.offset` (PostgREST `.range()`).
- `historyListUtils.ts` — pure helpers (`matchesQuery`, `projectNameMap`,
  `nextPageOffset`), unit-tested in `tests/unit/historyFeed.test.ts`.
- `HistorySearchBar.tsx` — the compact search input (deliberately not
  `FloatingLabelInput` — it's not a form field).

## Gotchas

- **Tabs mount lazily — one visible tab → one live query.** Only the active
  tab's body renders (visited tabs stay mounted; a starting swipe pre-mounts
  the neighbours so the incoming page isn't blank mid-gesture). A tab's feed
  query first subscribes when its tab is first shown. Don't go back to mapping
  all five bodies eagerly — that was a measured jank source.
- **The feeds' first page uses `RECENT_COMPLETED_LIMIT` (50, from
  `features/records`)** and is seeded from the SAME key the Home widgets warm,
  so navigating Home → History is a cache hit. The paged key is
  `[...qk.<type>.recent(...), 'paged']` — a sibling under the same namespace,
  so `invalidateRecordLists` refreshes it too.
- **Four-state guard runs on the UNfiltered count.** `RecordHistoryList` /
  `ReportCardGrid` take `totalCount` (loaded rows before search/project
  filtering); `items`/`reports` are the filtered slice. A filter that matches
  nothing renders `history.searchNoResults` — never the confirmed-empty copy
  and never a skeleton. Keep it that way (CLAUDE.md "Loading states").
- **Search is client-side over loaded rows** (title / type label / project
  name / incident location / briefing topics). It does not query the server;
  "load more" extends the searchable set. Fine at these volumes — revisit only
  with a server-side `ilike` if accounts outgrow a few hundred rows per type.
- **Type validation:** unknown/absent `?type=` falls back to
  `DEFAULT_RECORD_TYPE`. Use `isRecordTypeKey` before trusting the param.
- **Inspections routing** uses the template category
  (`routeForInspection(tpl.category, id, true)`) — matches Home and the old
  History. Don't switch it to a `source`-based path.
- Orders open the read-only detail at `app/orders/[id].tsx` — `OrdersTab`
  passes `OrderRow` an `onPress` routing to `/orders/${id}`.
- **Certificate counts key off ALL loaded inspection ids,** not the filtered
  slice — a search keystroke must not mint a new query key.

## Canonical helpers consumed

- `features/records` (rows, descriptors, `RECENT_COMPLETED_LIMIT`,
  `ReportCardGrid`, `briefingTopicsLabel`),
  `components/ui` (`Screen`, `FilterChipRow`),
  `components/projects/ProjectRowHelpers` (`IncidentRow`),
  `lib/apiHooks` (`qk`, `useProjects`, `useTemplates`, `useCertificateCounts`),
  `hooks/useListLoadState` (four-state guard),
  `RecentRecordsOpts.offset` on the five record services' `recent()`.
