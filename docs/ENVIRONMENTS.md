# Environments — staging vs production

How Hubble separates **local → staging → production** across the mobile app, the
three web bundles, and Supabase. Read this before cutting a build, publishing an
OTA update, or running a migration against a cloud project.

> Status (2026-06-18): staging is **largely live** — org move, staging Supabase
> project, `eas.json` creds, GitHub Environments, and the staging **database**
> (schema + storage + seed) are all done. Remaining: edge functions + their
> secrets, demo account, the first staging device build, and the deferred prod
> migration reconciliation. **For the actual execution log + current state, read
> [STAGING_SETUP_LOG.md](STAGING_SETUP_LOG.md).** The checklist below is the
> original plan (sections marked ✅ DONE inline).

---

## 1. The matrix

| Tier | `APP_ENV` | iOS bundle / Android pkg | Scheme | App name | EAS channel | EAS profile | Supabase | Web path | Git branch |
|---|---|---|---|---|---|---|---|---|---|
| Local/Dev | `development` | `ge.sarke2.app.dev` | `sarke2dev` | Hubble (Dev) | — (dev client) | `development` | `supabase start` or staging | localhost | feature branches |
| Staging | `staging` | `ge.sarke2.app.staging` | `sarke2staging` | Hubble (Staging) | `staging` | `staging` | **NEW project** | `/app-staging/` | `develop` |
| Production | `production` | `ge.sarke2.app` | `sarke2` | Hubble | `production` | `production` | `seskuthiopywrgntsgfw` | `/app/` | `main` |

Branch model: feature branches → PR into **`develop`** (= staging) → promote to **`main`** (= production) via PR. The legacy `WEBversion2` → `/app/preview/` deploy and the `ios-legacy` branch are unrelated and left untouched.

---

## 2. How the mobile app selects its environment

`app.config.ts` (which replaced the old static `app.json`) is the single source of truth. It reads `process.env.APP_ENV` (`development` | `staging` | `production`) and resolves a per-tier config block (name, bundle id, scheme, Supabase URL/key, Sentry env, channel). **Unset `APP_ENV` → production** (fail-safe), so a bare `expo`/`eas` invocation can never accidentally resolve to a non-prod backend.

Runtime reads the resolved values via `Constants.expoConfig.extra` — `lib/supabase.ts` (`extra.supabaseUrl` / `extra.supabaseAnonKey`) and `lib/crashReporting.ts` (`extra.appEnv` → Sentry `environment`).

### Guardrails (do not remove)

`app.config.ts` throws — failing the build — when:
1. `EAS_BUILD_PROFILE` and `APP_ENV` disagree (e.g. building the `production` profile with `APP_ENV=staging`). This is the core defense against shipping the wrong backend.
2. A non-production build has no Supabase credentials wired (staging/dev require `STAGING_SUPABASE_URL` / `STAGING_SUPABASE_ANON_KEY`).

### Env-pinned scripts — never run a bare `eas update`

`extra` (including the Supabase URL) is re-embedded into the JS bundle on **every** `eas update`. A mistargeted update can point production users at staging. Always publish through the scripts that pin `APP_ENV` to the channel:

```sh
npm run start:dev          # APP_ENV=development expo start --dev-client
npm run start:staging      # APP_ENV=staging expo start
npm run build:staging      # APP_ENV=staging  eas build  --profile staging
npm run build:production   # APP_ENV=production eas build --profile production
npm run update:staging     # APP_ENV=staging  eas update --branch staging
npm run update:production  # APP_ENV=production eas update --branch production
```

### Golden rules

- Never touch the **`production`** EAS channel/profile when working on staging. Channels are baked into the binary; a build only ever pulls its own channel.
- Never run a bare `eas update` — use `update:staging` / `update:production`.
- End every Supabase CLI session with `supabase link --project-ref seskuthiopywrgntsgfw` so a later command can't hit the wrong project.
- Production DB migrations are **never** auto-applied — they go through the gated manual path (§6).

---

## 3. Manual setup checklist (the remaining work, in order)

### 0.A — EAS account access (blocks all mobile staging builds) — ✅ DONE (2026-06-18)
The EAS project (`ab800403-…`) was transferred from the personal account `x4ylee` into a shared Expo **org `hubble-ge`** that both maintainers admin (`gilavi2000` added as an org Admin). The project ref/id is unchanged by the transfer, so EAS Update channels and continuity are preserved. The config `owner` field in `app.config.ts` was updated `x4ylee` → `hubble-ge` accordingly. Staging builds, `eas env`, and `eas update:configure` are now unblocked.

### 0.B — Create the staging Supabase project — ✅ DONE (2026-06-18)
Created. Ref `oiwkfzadftmgmshidyqx`, URL `https://oiwkfzadftmgmshidyqx.supabase.co`, anon key `sb_publishable_if2XIf1WB03rHEC0PQKNSg_eJ4frwNu` (publishable, safe to commit). Apple auth provider enabled with Client IDs `ge.sarke2.app.staging,ge.sarke2.app.dev`; redirect URLs `sarke2staging://` + `sarke2dev://` added. The service-role key + DB password are held privately for the GitHub `staging` Environment (Step 0.E). The project is empty — schema gets populated after the prod reconciliation (Phase 1/2).

### 0.C — Apple App ID for the staging app
Apple Developer portal → Identifiers → new App ID `ge.sarke2.app.staging` (or let EAS auto-create credentials on the first `npm run build:staging`). **No** new App Store Connect listing — staging is internal distribution only.

### 0.D — Wire the staging Supabase creds into the mobile build — ✅ DONE (2026-06-18)
The publishable values are committed to the `staging` profile in `eas.json` (`build.staging.env.STAGING_SUPABASE_URL` / `STAGING_SUPABASE_ANON_KEY`); anon key is safe to commit.
For local `npm run start:staging`, put the same two vars in a git-ignored `.env` (loaded by `dotenv`) or export them in your shell.

### 0.E — GitHub Environments (fixes the global-secret hazard)
Settings → Environments → create **`staging`** (no protection) and **`production`** (add a required reviewer; restrict to `main`). Scoped secrets per environment:

| Secret | `staging` value | `production` value |
|---|---|---|
| `SUPABASE_PROJECT_REF` | staging ref | `seskuthiopywrgntsgfw` |
| `SUPABASE_DB_PASSWORD` | staging db password | prod db password |
| `VITE_SUPABASE_URL` | staging URL | prod URL |
| `VITE_SUPABASE_ANON_KEY` | staging anon | prod anon |

Repo-level (shared) secrets: `SUPABASE_ACCESS_TOKEN` (CLI token), `EXPO_TOKEN`.

---

## 4. Phase 1 — Production migration reconciliation + baseline squash

**Why:** prod's migration history drifted (some migrations applied by hand via the SQL editor), and four version tokens collide — `0044`, `0045`, `0046`, and `20260527150000` — each shared by two *different* feature migrations. That is undefined behavior for `supabase db push`. Goal: make prod's `schema_migrations` match the repo, then squash to one clean baseline so go-forward pushes are safe. **History-only — never alters the live schema.**

> Requires Docker running (for the local dry-run) and the CLI linked to prod.

```sh
# 0) Fix already shipped: supabase/config.toml seed path now points at the real
#    file, so `db reset` actually seeds. Validate ordering locally (free, safe):
npm run supabase:start
npm run supabase:reset            # replays all 70 files into a fresh local DB

# 1) Map the drift against PROD (read-only):
supabase link --project-ref seskuthiopywrgntsgfw
supabase migration list           # capture the Local | Remote columns

# 2) Reconcile history (idempotent; inserts/removes history rows, runs no SQL).
#    For every migration already applied in prod but missing from its history:
supabase migration repair --status applied <version> [<version> ...]
#    For each colliding token, repair the ONE whose SQL actually owns it in prod.

# 3) Confirm Local and Remote now agree:
supabase migration list

# 4) Squash to a single baseline reflecting prod's real schema, archive the rest:
supabase db dump --linked -f supabase/migrations/00000000000000_baseline.sql
mkdir -p supabase/migrations_archive
git mv supabase/migrations/0001_*.sql ... supabase/migrations_archive/   # move the 70 files

# 5) Validate the baseline from zero, locally and (later) on staging:
npm run supabase:reset
```
After squash, the colliding tokens no longer exist as go-forward files — the "do not renumber 0044/45/46" hazard (CLAUDE.md) is retired. Update the README Migrations section to describe the new baseline. **Do `db push` to prod only after `migration list` shows Local = Remote, and always `--dry-run` first.**

---

## 5. Phase 2 — Bring up the staging project

```sh
supabase link --project-ref <STAGING_REF>
supabase db push                  # applies the baseline (+ any go-forward) from zero
supabase functions deploy         # all 6 functions (respects config.toml verify_jwt)

# Staging secrets (sandbox BOG, staging deep-link scheme, staging callback):
supabase secrets set \
  BOG_ENV=sandbox BOG_CLIENT_ID=... BOG_CLIENT_SECRET=... \
  BOG_CALLBACK_URL=https://<STAGING_REF>.supabase.co/functions/v1/bog-payment-callback \
  APP_SCHEME=sarke2staging \
  ANTHROPIC_API_KEY=... TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... TWILIO_FROM_NUMBER=...
#  Optional: SIGN_WEB_URL=<staging signing page>, BOG_REDIRECT_ALLOWLIST=<csv>

# Seed system templates + the App Store review demo account:
#   (run the seed SQL via the dashboard SQL editor or psql, then:)
SUPABASE_URL=https://<STAGING_REF>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<staging-service-role> \
  node scripts/seed-demo-account.mjs

supabase link --project-ref seskuthiopywrgntsgfw   # ALWAYS re-link to prod when done
```

The new env-driven edge-function knobs (`SIGN_WEB_URL`, `APP_SCHEME`, `BOG_REDIRECT_ALLOWLIST`) all default to the exact current prod values, so re-deploying these functions to **prod** is a behavioral no-op.

---

## 6. CI behavior reference

| Workflow | Trigger | Target | Notes |
|---|---|---|---|
| `db-and-functions.yml` | push `develop` (supabase/**) | **staging** (auto) | links staging, dry-run, `db push`, `functions deploy` |
| `db-and-functions.yml` | manual `workflow_dispatch` → `production` | **production** (gated) | pauses on the `production` Environment's required-reviewer gate; prod migrations are never auto |
| `deploy-web-app-staging.yml` | push `develop` (web-app/**, lib, types) | gh-pages `/app-staging/` | staging Supabase via the `staging` Environment; no prod fallback |
| `deploy-web-app.yml` | push `main` | gh-pages `/app/` | **unchanged** — still uses inline prod fallback (see below) |
| `deploy-web.yml` / `deploy-web-app-preview.yml` / `docs.yml` | unchanged | — | left exactly as-is |

### Deferred (do AFTER 0.E exists) — rewire the prod web workflows
Once the `production` GitHub Environment has its `VITE_SUPABASE_*` secrets, switch the prod web workflows off the inline fallback so a missing/incorrect repo secret can't silently repoint prod:
- `deploy-web-app.yml` and `deploy-web.yml`: add `environment: production` to the job, and change
  `${{ secrets.VITE_SUPABASE_URL || 'https://seskuthiopywrgntsgfw.supabase.co' }}` → `${{ secrets.VITE_SUPABASE_URL }}` (and likewise the anon key).
**Do not do this before the Environment + secrets exist** — it would break the next prod web deploy.

---

## 7. Risk register (carry-over from the plan)

| # | Risk | Mitigation (status) |
|---|---|---|
| R1 | `eas update` w/ wrong `APP_ENV` ships staging URL to prod users | env↔profile guard in `app.config.ts` ✅; env-pinned scripts ✅; CI sets env |
| R2 | Global repo secret repoints all 3 prod web deploys | GitHub Environments (§0.E) — pending; prod workflows untouched until then ✅ |
| R3 | Colliding version tokens mis-apply on push | local `db reset` first + squash to baseline (§4) — pending Docker/prod |
| R4 | `db push` replays applied migrations on prod | `migration repair` + `--dry-run` + manual-approval Environment (§4, §6) |
| R5 | Touching the `production` channel breaks live OTA | never rename `production`; `staging` is its own profile ✅. The unused `preview` profile (channel but no `APP_ENV` → silently resolved to PRODUCTION) was removed 2026-06-18 — it was a loaded gun. |
| R6 | Repointing prod `SIGN_WEB_URL` kills in-flight SMS links | prod default unchanged; `gilavi.github.io/Sarke2.0` → `hubble.ge` 301 kept ✅ |
| R7 | Staging build collides with prod Apple identity | distinct bundle id + scheme + channel ✅; prod config verified byte-identical ✅ |
| R8 | CLI left linked to staging → next push hits wrong project | re-link to prod after every session; CI always `link` explicitly ✅ |
