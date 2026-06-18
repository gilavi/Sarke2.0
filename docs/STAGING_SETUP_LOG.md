# Staging setup log — what was actually done

This is the execution log + current state of the **staging tier**, complementing
the design in [ENVIRONMENTS.md](ENVIRONMENTS.md). If you're a new session / another
AI / a teammate picking this up, **read this first** — it records what really exists
in the cloud (not just the plan).

Last updated: **2026-06-18**.

---

## TL;DR current state

| Piece | Status |
|---|---|
| Expo project moved to shared org `hubble-ge`; `app.config.ts` `owner` = `hubble-ge` | ✅ |
| `develop` branch (= staging), `main` branch (= production) | ✅ |
| Staging Supabase project created (`oiwkfzadftmgmshidyqx`, "hubble-staging", Mumbai) | ✅ |
| `eas.json` staging profile wired to staging Supabase | ✅ (on `develop`) |
| Local `.env` so `npm run start:staging` works | ✅ (git-ignored) |
| GitHub `staging` + `production` Environments + secrets | ✅ (done by repo owner) |
| Staging DB: full prod **schema** (31 tables, 27 funcs, 42 policies) | ✅ |
| Staging DB: **storage** (8 buckets + 28 RLS policies) | ✅ |
| Staging DB: **seed** (system templates: 4 templates, 14 questions) | ✅ |
| Staging **edge functions** deployed | ⬜ TODO |
| Staging **function secrets** (BOG sandbox / Twilio / Anthropic / APP_SCHEME) | ⬜ TODO |
| Staging **demo account** (`scripts/seed-demo-account.mjs`) | ⬜ TODO |
| First **staging app build** on a device (`eas device:create` + `build:staging`) | ⬜ TODO |
| **Prod migration reconciliation + baseline squash** (touches prod history) | ⬜ DEFERRED — do together |

---

## How environment selection actually works (important)

The **git branch does not choose the backend.** Two separate layers:

1. **The running/built app** is chosen by **`APP_ENV`** (read in `app.config.ts`):
   - `npm run start:staging` / `npm run build:staging` → **staging** Supabase.
   - A bare `npx expo start` with no `APP_ENV` → **production** (fail-safe default).
   - Local dev: this repo's git-ignored `.env` sets `APP_ENV=staging` + the staging
     creds, so local dev defaults to staging. Builds override via the npm scripts.
   - EAS builds: staging creds come from `eas.json` → `build.staging.env`.
2. **CI/deploys** are branch-wired: push to **`develop`** deploys to **staging**
   (GitHub `staging` Environment); push to **`main`** deploys to **production**.

**Never** run a bare `eas update`; always re-link the CLI to prod
(`supabase link --project-ref seskuthiopywrgntsgfw`) after any staging CLI work.

---

## Coordinates

- **Prod** Supabase: ref `seskuthiopywrgntsgfw` ("Sarke", Mumbai). **Protected — the app is live on the App Store.**
- **Staging** Supabase: ref `oiwkfzadftmgmshidyqx` ("hubble-staging", Mumbai).
  - URL `https://oiwkfzadftmgmshidyqx.supabase.co`
  - anon/publishable key `sb_publishable_if2XIf1WB03rHEC0PQKNSg_eJ4frwNu` (safe to commit)
  - service-role key + DB password: held privately; live only in the GitHub `staging` Environment secrets.
- EAS project id (unchanged by the org move): `ab800403-36c4-4673-8dd8-dfc75b66d14b`, owner `hubble-ge`.

---

## How the staging DB was built (so it can be reproduced / understood)

The repo's 70 migration files **cannot** be replayed cleanly because **4 version
tokens collide** (`0044`, `0045`, `0046`, `20260527150000` each name two different
files — a merged-branch artifact; see CLAUDE.md "do not renumber"). A raw
`supabase db push` either errors or silently skips one file of each pair. So
staging was built from **prod's finished schema** instead:

1. **Read prod, read-only** (prod was never modified):
   - `supabase db dump --linked -f supabase/baseline_prod_schema.sql` → full public schema.
   - `supabase db dump --linked --data-only -s storage -x storage.objects ...` → the 8 storage bucket rows (4 of which exist only in prod, created by hand — not in any migration).
   - `supabase db dump --linked -s storage` → the 28 storage RLS policies.
2. **Rehearse locally** (Docker): treat the baseline as a single migration, `supabase db reset` into a throwaway local DB to confirm it applies from zero.
3. **Load into staging** (after `link`-ing to staging and hard-verifying the `●`):
   - `db push` the baseline → schema.
   - `migration repair --status applied <66 unique versions>` so staging's history matches the repo (mirrors prod's harmless collision quirk; staging CI `db push` then works).
   - Storage + seed loaded as one-off **staging-only** migrations, pushed with the **"twin-swap" trick**: temporarily move the 4 collision-twin files aside so `db push` applies only the new file (`--include-all` is unusable — it would re-run the collision files whose objects already exist). Files deleted + history rows reverted afterward; the repo is unchanged (70 files, no diff).
4. **Re-link to prod** when done.

**Gotcha for whoever redoes this:** some `CREATE POLICY` statements are multi-line
(EXISTS subqueries) — extract full statements, not `grep '^CREATE POLICY'`. Also,
the prod dump ends with an empty `search_path`, so any seed SQL must be prefixed
with `set search_path = public, extensions;`.

The prod dumps are kept locally at `supabase/baseline_prod_schema.sql` and
`supabase/prod_storage_*.sql` (git-ignored) — reused later for the prod squash.

---

## What's left & how to do it

1. **Edge functions** — link staging, then `supabase functions deploy` (deploys all
   6: ai-chat, bog-payment-callback, create-bog-order, delete-account,
   fetch-regulation-dates, send-signing-sms). Re-link prod after.
2. **Function secrets** — `supabase secrets set ...` against staging (BOG **sandbox**
   creds, Twilio, Anthropic, `APP_SCHEME=sarke2staging`). See ENVIRONMENTS.md §5.
3. **Demo account** — `node scripts/seed-demo-account.mjs` with the staging service-role key.
4. **Staging app on a device** — `eas device:create` (register device), then
   `npm run build:staging` → install the internal-distribution build side-by-side
   with the production app (separate bundle id `ge.sarke2.app.staging`).

---

## Hard rules (don't break prod)

- Prod has only ever been **read**. Never run `db push` / `db push --include-all`
  against prod — that requires the deferred reconciliation (migration `repair` +
  baseline squash), done deliberately and together.
- The squash is **NOT** on `develop` — the repo still has all 70 migration files.
  Do **not** merge `develop` → `main` expecting a clean migration state until the
  prod reconciliation is done.
- `app.config.ts` defaults `APP_ENV` to `production` on purpose. Keep it that way.
