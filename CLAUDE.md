# Hubble — Claude Code Instructions

This file is read automatically at the start of every Claude Code session in this repo. Rules here override Claude's defaults.

## Documentation Rules (always)

After completing **any** feature, fix, refactor, or significant change, update the relevant docs in the **same change** — do not defer it.

- **`README.md`** — keep the Stack, Directory Layout, Running Locally, and Known Issues sections in sync with reality. If you add/remove a top-level folder, change the dev command, bump a major dep (Expo, React Native, Supabase), or introduce/remove a Known Issue, update README.md.
- **`docs/`** — if the change touches a flow that has a doc under `docs/` (e.g. `docs/prompts/otp-signer-verification.md`), update that doc too. The repo's working overview lives in [docs/AI_BRIEFING.md](docs/AI_BRIEFING.md) and recent changes in [docs/WHATS_NEW.md](docs/WHATS_NEW.md) — keep both reasonably current.
- **`BUG_REPORT.md`** — when fixing a bug listed there, mark it resolved (with date + commit ref) instead of silently deleting.
- **`QA_REPORT_*.md`** — do not edit historical QA reports. If QA findings change, create a new dated report.
- **Inline JSDoc / TSDoc** — for new exported functions in `lib/` and `components/`, add a short doc comment describing inputs, outputs, and side effects (especially Supabase calls).
- **Supabase schema changes** — if you add a migration in `supabase/migrations/`, also update the schema description in README.md (Supabase section) and the relevant types in `types/models.ts`.

If a change has zero user-facing or developer-facing impact (pure internal rename, formatting), say so explicitly in the commit message and skip the doc update.

## Workflow

1. Make the code change.
2. Update docs per the rules above.
3. Run `npm run lint` (typecheck + `scripts/check-primitives.mjs`). It may fail per known issues — note new failures, don't add to them.
4. Stage code + docs together in the same commit.

## Before adding a util or wrapper

Before adding a new file in `lib/`, a new wrapper in `components/`, or a new variant of an existing helper, **read [docs/primitives.md](docs/primitives.md) first**. The single most common bug class in this repo is the same primitive getting reinvented in two or three places with different defaults — keyboard wrappers, image helpers, `pdf_language` writers all bit us this way (see `BUG_REPORT.md`).

Rules:
- If a canonical owner exists and is wrong for your use case, **fix the owner** instead of adding a sibling. Add an `opts` parameter or a new purpose-named export inside the same file.
- Name new primitives by **purpose** (`pdfPhotoEmbed`, `imageForDisplay`), not implementation (`getStorageImageDataUrlStrict`). The right default should fall out of picking the right name.
- After adding a primitive, add a row to `docs/primitives.md`. If misuse is grep-detectable (banned import, wrong-default helper name), add a rule to `scripts/check-primitives.mjs`.
- Don't bypass `STORAGE_BUCKETS`, the canonical keyboard wrappers, or the canonical image helpers — even for one-off cases. `npm run lint` will block known offenders.

## Project Quick Reference

- **Stack:** Expo SDK 54, React Native 0.81, React 19, Supabase (Postgres + Auth + Storage), expo-router.
- **Install:** `npm install --legacy-peer-deps` (Radix/React 19 peer conflicts).
- **Dev:** `npx expo start`.
- **Native iOS legacy:** `ios-legacy` branch — do not modify from main.
- **Storage buckets:** `certificates`, `answer-photos`, `pdfs`, `signatures`, `incident-photos`, `report-photos`, `project-files`, `remote-signatures`.
- **Languages:** UI strings are in Georgian (ქართული). Do not auto-translate them to English.
- **Migrations:** range is currently `0001`–`0053` plus timestamp-prefixed migrations from 2026-05-25 onward (`YYYYMMDDHHMMSS_*.sql`). Numbers `0044`/`0045`/`0046` are each used by two files (merged branches) — do **not** renumber them (it desyncs the hosted migration history); new numeric migrations would continue from `0053`. The full list with one-line descriptions is in [README.md](README.md#migrations-supabasemigrations).

## Per-module context

Feature folders and most component subfolders carry an `AGENTS.md`
that documents the module's public API, internal files, gotchas, and
canonical helpers it consumes. When you start work in any of these
folders, **read its `AGENTS.md` first** — it's the cheapest way to
load the local invariants before editing.

Locations to look:

- `features/<feature>/AGENTS.md` — slice-by-slice context for
  `features/inspection-wizard`, `features/order-new`, and
  `features/project-detail`.
- `components/<folder>/AGENTS.md` — the per-component-folder docs
  (animations, bobcat, cargoPlatform, excavator, generalEquipment,
  harness-list, home, icons, inputs, inspection-parts,
  inspection-steps, layout, photo-annotator, primitives, projects,
  qualifications, ui, wizard, wizard/kamari).
- `lib/services/AGENTS.md` — services dispatcher + real/mock split.
- `lib/pdf/order/AGENTS.md`, `lib/pdf/inspection/AGENTS.md` — PDF
  template internals.

If you're adding a new folder, add an `AGENTS.md` next to it using
the same template (What this module does / Public API / Internal
files / Gotchas / Canonical helpers).

## File-size targets

Enforced limits. If a change would push a file over its target, split it into siblings in the same folder (extract a hook, a section component, a CSS sibling, …) rather than letting it grow.

- **Component:** < 200 lines
- **Hook:** < 150 lines
- **Route file (`app/**/*.tsx`):** < 300 lines, orchestration only — delegate to a feature module under `features/`
- **Service file (`lib/**/*.ts`):** < 500 lines

A few files currently exceed these targets (`features/project-detail/ProjectDetail.tsx`, `features/inspection-wizard/useWizardState.ts`, `lib/pdf/inspection/template.css.ts`) — they're documented in [REFACTOR_SUMMARY_V2.md](REFACTOR_SUMMARY_V2.md) along with the reasons each remaining residue was deferred. Don't grow them further.

## Loading states (skeleton vs empty vs data)

Three-state UI rule for any screen that reads from React Query: **skeleton while the query has not yet produced a real answer, empty state only once the query settles with `[]`, data otherwise.** Bare `isLoading` / `isPending` flags are not enough — they only flip true on the very first fetch and skip background refetches that are replacing a stale cached `[]`. The canonical guard is:

```ts
const loading = (q.isFetching || !q.isFetched) && data.length === 0;
```

This way a racy empty result from a previous session (e.g. a prefetch that fired before the JWT propagated, then got cached as "fresh" for `staleTime`) is masked by the skeleton until the in-flight refetch lands, instead of flashing the empty-state card. See `app/(tabs)/home.tsx`, `app/(tabs)/projects.tsx`, and the post-login `prefetchQuery({ staleTime: 0 })` in `lib/session.tsx` for the canonical wiring.

When adding a new "list screen", do all three of:
1. Use the `(isFetching || !isFetched) && data.length === 0` skeleton guard, not `isLoading`.
2. If the data is user-scoped, prefer adding the key to the post-login warm-up in `lib/session.tsx` (with `staleTime: 0`) over relying on cache rehydration alone.
3. Empty state copy + CTA is for the **confirmed empty** branch only — never the loading branch.

## Web codebases

There are three separate web codebases in this repo. None share code with the Expo mobile app — only Supabase.

- **`web/` (hubble-sign):** tokenized signing page hosted at `https://gilavi.github.io/Sarke2.0/` (root). Linked from SMS in `lib/sms.ts` + `supabase/functions/send-signing-sms/`. Hash routing (`#/sign/<token>`). Don't change its base path — it would break in-flight SMS links.
- **`web-app/` (dashboard):** public dashboard at `https://gilavi.github.io/Sarke2.0/app/`. Vite + React + TypeScript + Tailwind. Reimplements features in HTML/CSS — no Expo, no React Native. **Mobile parity is generally not a goal** — most changes here don't need to track the Expo app. **Exception — inspection acts:** the unified inspection engine (`web-app/src/lib/inspection/` + `web-app/src/features/inspections/structured/`) **does** track the mobile app — web schemas/catalogs are hand-mirrored from the Expo `lib/inspection/` + `types/<type>.ts` (the `@root` import is eslint-banned), and equipment rows must round-trip with mobile (web creates the parent `public.inspections` row via the `create_equipment_inspection` RPC; see `lib/db/repository.ts` `parentInspection`). See [web-app/UNIFIED_INSPECTIONS_PLAN.md](web-app/UNIFIED_INSPECTIONS_PLAN.md).
- **`website/` (Docusaurus):** documentation site, deployed via `.github/workflows/docs.yml`.

All three deploy to the same `gh-pages` branch under different `destination_dir` values (workflows: `deploy-web.yml`, `deploy-web-app.yml`, `deploy-web-app-preview.yml`, `docs.yml`); `keep_files: true` preserves the other trees.

## Things to Avoid

- Don't add new top-level folders without updating the Directory Layout in README.md.
- Don't bump Expo/RN/React major versions without an accompanying README note.
- Don't delete entries from `BUG_REPORT.md` — mark them resolved.
- Don't edit historical `QA_REPORT_YYYY-MM-DD.md` files.
- Don't re-consolidate the domain-split files (`lib/services/`, `lib/pdf/`, `features/`). The split is intentional and enforced by the File-size targets above.
- Don't create public Postgres functions without `SET search_path = public, pg_catalog`. Functions invoked from `auth.admin` contexts (notably `deleteUser`) run with an empty search_path and fail to resolve unqualified public-schema types. See migration `supabase/migrations/20260525180000_pin_function_search_paths.sql` for the precedent and the TestFlight 500 it fixed.
- Do not persist captured inspection signature data in any form (Supabase storage, DB column, AsyncStorage, MMKV, SecureStore, file system). Regulatory requirement. Captured signatures live in result-screen component state only and exist for one purpose: rasterization into the generated PDF. The state dies when the screen unmounts. Out-of-scope flows (project signers, tokenized remote signing, order signatures, incident/briefing reusable expert signature) are preserved and unrelated to this rule. See [`features/signatures/AGENTS.md`](features/signatures/AGENTS.md).
- When creating any new inspection type, always insert into `public.inspections` first (or via the `create_equipment_inspection` RPC) before writing the type-specific row. Shared tables (`inspection_attachments`, etc.) FK to `inspections.id` only. The `makeInspectionService` factory in `lib/inspection/service.ts` already does this — every per-type config needs to set `inspectionType` to the tag the unify migration backfilled (e.g. `'bobcat'`, `'fall_protection_inspection'`). See [`INSPECTION_ARCHITECTURE_NOTES.md`](INSPECTION_ARCHITECTURE_NOTES.md).
