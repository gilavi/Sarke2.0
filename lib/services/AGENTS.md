# lib/services

## What this module does
Single entry point for all data-layer calls in the mobile app. Each
domain (projects, inspections, answers, …) exposes an async API. The
dispatcher in `index.ts` reads `expo.extra.useMockData` from app.json
and routes every call through either the real (Supabase-backed)
implementation under `./real/` or the in-memory mock under `./mock/`.

`from '../../lib/services'` resolves to `index.ts` — existing call
sites keep working unchanged after the split.

## Public API (from index.ts)
- `projectsApi`, `projectFilesApi`
- `templatesApi`
- `inspectionsApi` (+ `questionnairesApi` alias for legacy callers)
- `inspectionAttachmentsApi`
- `answersApi`
- `signaturesApi`
- `qualificationsApi`, `certificatesApi`, `isExpiringSoon`
- `projectItemsApi`
- `schedulesApi`
- `remoteSigningApi`
- `storageApi`
- `reportsApi`
- `incidentsApi`
- `paymentRecordsApi`

## Internal files
- `index.ts` — dispatcher; picks `real` vs `mock` once at module load
  time based on `useMockData` in app.json.
- `real/index.ts` — re-exports every domain's real implementation.
- `real/_shared.ts` — supabase-boundary helpers (`throwIfError`,
  `throwIfErrorMaybe`, `listOrThrow`, `failShape`, `unwrap`,
  `isMissingDbObjectError`), `mapCrew` / `withMappedCrew`,
  `assertLogoSize`.
- `real/<domain>.ts` — one file per API surface
  (projects, templates, inspections, answers, signatures,
  qualifications, projectItems, schedules, remoteSigning,
  storage, reports, incidents, payments).
- `mock/index.ts` — re-exports every domain's mock implementation
  plus `resetMockDb()`.
- `mock/_store.ts` — the in-memory MockDB (with AsyncStorage
  persistence), seed data, `uuid()`, `now()`, `load()`, `save()`,
  `MOCK_USER_ID`, `MOCK_IMAGE_URI`, `resetMockDb()`.
- `mock/<domain>.ts` — matching mock implementation per domain.

## Gotchas / non-obvious things
- **Cross-project `recent({ limit, status })`** lives on `inspectionsApi`,
  `reportsApi`, and `incidentsApi` (real + mock); `briefingsApi` / `ordersApi`
  expose the same in `lib/` (real-only — they bypass this dispatcher, so MOCK
  mode hits Supabase for those two). The optional `status` pushes an
  `.eq('status', …)` filter so the Home widgets + History (completed) and the
  Drafts screen (draft) each fetch exactly their slice. RLS scopes every read to
  the signed-in user, so dropping the `project_id` filter is safe. Hooks:
  `useRecent{Inspections,Reports,Incidents,Briefings,Orders}` in `lib/apiHooks`.
- **Lean list feeds:** briefings/orders list reads (`recent`, `listByProject`,
  briefings `listAll`) go through the `briefings_list_lean` / `orders_list_lean`
  views and `certificatesApi.countsByInspection` through the
  `get_certificate_counts` RPC (migration `20260708120000_lean_list_feeds.sql`)
  so list feeds never carry base64 signature payloads. Each falls back to the
  legacy query via `isMissingDbObjectError` (real/_shared.ts) when the
  migration isn't applied. `getById` stays on the base tables — detail/PDF
  paths need the full row. See docs/primitives.md → "Lean list feeds".
- The toggle is **module-load-time only**. Flipping `useMockData` in
  app.json requires a full app restart — the live binding to `src` is
  resolved when this module first imports.
- `real/inspections.ts` re-imports `storageApi` from `./storage` (used
  by `inspectionAttachmentsApi.uploadPhoto`). Don't refactor `storage`
  to depend on `inspections` — it would create a cycle.
- `mock/projects.ts`' `saveRosterSignature` calls `projectsApi.upsertSigner`.
  That's a self-reference within the same module — fine, but if you
  split projects further keep the two on the same file.
- The mock storage `signedUrl`/`publicUrl` returns a transparent 1×1
  PNG data URI (`MOCK_IMAGE_URI`) so `<Image>` components render
  without crashing. PDF render paths that try to fetch this will see
  a 1-byte image — they should fail gracefully, not retry forever.
- `inspectionsApi` is also exported as `questionnairesApi` for older
  cache keys / route paths. The alias is a **deliberate identity**
  (`export const questionnairesApi = inspectionsApi`), not a separate
  object — mutations through one are visible to the other.

## Canonical helpers used (from lib/)
- `lib/supabase` — `supabase`, `STORAGE_BUCKETS`, `SUPABASE_URL`,
  `SUPABASE_ANON_KEY`.
- `lib/guards` — `isAnswer`, `isInspection`, `isProject`,
  `isQuestion`, `isTemplate`.
- `lib/logError` — surfaces schema mismatches and storage failures.
- `lib/photoCompression` — `compressPhoto`, `CompressionProfile`,
  `CompressOptions`.
- `expo-crypto`, `expo-file-system/legacy` — only used by real/.
- `@react-native-async-storage/async-storage` — only used by mock/.
