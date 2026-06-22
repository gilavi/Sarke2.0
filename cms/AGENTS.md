# cms/ — Text CMS

## What this module does

A tiny, password-gated web app that lets non-engineer co-workers **correct** the
mobile app's Georgian (`ka`) and English (`en`) UI texts — nothing else. Hosted at
**https://hubble.ge/cms/** (standalone, separate from the `web-app/` dashboard).

Edits are **live without an App Store build**: the CMS writes to the Supabase
`public.ui_strings` table, and the mobile app fetches those rows on launch and
overlays them on top of the bundled `locales/*.json` (see `lib/i18nOverlay.ts` +
`components/UiStringsLoader.tsx`). The bundled JSON stays the offline/first-launch
fallback, so an edit appears on the **next app open**, not instantly on a running app.

It is **edit-only**: you can change `en`/`ka` for keys that already exist, but never
add or delete keys (that would diverge from the bundled JSON and could break `t()`).

## Architecture

```
co-worker (password)
  → cms/ (this app)
    → POST supabase/functions/cms-texts   (verify_jwt=false; checks CMS_PASSWORD)
      → service role writes public.ui_strings
mobile app launch
  → anon SELECT public.ui_strings (public-read RLS)
    → unflatten → i18n.addResourceBundle over bundled defaults
```

The password is the **only** protection and the real check is server-side in the
edge function. The client-side gate is just UX/session (`sessionStorage`).

## Public API / files

- `src/App.tsx` — auth gate; reuses the session password on refresh.
- `src/PasswordGate.tsx` — single password field → `api.load`.
- `src/Editor.tsx` — filters + list + save bar; tracks dirty rows vs a baseline; blocks save while any edit breaks a `{{placeholder}}`.
- `src/FilterBar.tsx` — text search + section dropdown (Georgian section labels + counts) + "missing translation" toggle.
- `src/StringRow.tsx`, `src/Breadcrumbs.tsx` — UI pieces; rows show a per-field hint listing the `{{tokens}}` to keep, red when broken.
- `src/strings.ts` — all UI text, **in Georgian** (the editor is a Georgian-only non-technical user).
- `src/sections.ts` — namespace → plain-Georgian section label map.
- `src/placeholders.ts` — `{{...}}` token extract + compare (the save guard).
- `src/api.ts` — `load(pw)` / `save(pw, editor, changes)`; `VITE_CMS_MOCK=1` runs
  the UI against in-memory data with no backend (password `test`).
- `src/types.ts` — `Row`, `Change`.

## Backend pieces (outside this folder)

- `supabase/migrations/20260622120000_ui_strings.sql` — the table + public-read RLS.
- `supabase/functions/cms-texts/index.ts` — the password-gated read/write function.
- `scripts/seed-ui-strings.mjs` — emits idempotent SQL to seed/sync the table from
  `locales/*.json`. **Run after adding new keys to the locale files** so they show
  up in the CMS (insert-only; never overwrites a co-worker's edit).

## Operations (one-time setup / runbook)

These need Supabase credentials, so they're run by a maintainer, not CI:

```bash
# 1. Create the table (live). Uses the authed CLI (needs the DB password).
supabase db query --linked --file supabase/migrations/20260622120000_ui_strings.sql

# 2. Seed it from the locale files.
node scripts/seed-ui-strings.mjs
supabase db query --linked --file supabase/seed-ui-strings.generated.sql

# 3. Set the shared password + deploy the function.
supabase secrets set CMS_PASSWORD='<the password>'
supabase functions deploy cms-texts

# 4. The frontend deploys automatically on push to main (.github/workflows/deploy-cms.yml).
```

To change the password later: re-run step 3's `secrets set` (no redeploy needed).

## Gotchas

- **Georgian-only UI:** all interface text lives in `src/strings.ts` — keep it Georgian.
- **Placeholder guard:** edits that drop/alter a `{{...}}` token (e.g. `{{count}}`,
  `{{name}}`) are detected against the baseline; the field goes red and **Save is
  disabled** until restored. Don't weaken this — a broken token breaks that app screen.
- **Edit-only:** the function rejects unknown keys (`unknown_keys` → the UI shows a
  "reload" message). New keys come only from `locales/*.json` via the seed script.
- **Array values** (e.g. `calendar.monthLabels`) appear as separate rows with numeric
  segments (`calendar.monthLabels.0`); the breadcrumb renders them as `[0]`.
- **Blank field = no override:** an emptied `en`/`ka` is saved as `null`, so the
  bundled value shows (you can't blank a label to nothing). See `Editor.onSave`.
- **Drift:** the DB overrides the bundled JSON at runtime, so a DB edit wins over a
  later code change to the same key. Co-worker text fixes belong in the CMS; the
  locale files are the dev-owned baseline. Re-run the seed script to register new keys.
- **browserslist pin:** `package.json` pins `browserslist` to `4.28.2` via `overrides`.
  Release `4.28.3` ships a broken `node.js` (truncated `/^@[^/]+\//` regex →
  "Invalid regular expression: missing /"), which fails the Vite build everywhere
  (local **and** CI). Don't drop the override unless a fixed release is out.

## Canonical helpers consumed

- `lib/i18nFlatten.ts` — `flatten`/`unflatten` (the dotted-path convention shared
  with the seed script and the mobile overlay). Don't reinvent it.
