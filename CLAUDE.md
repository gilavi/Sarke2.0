# Sarke 2.0 — Claude Code Instructions

This file is read automatically at the start of every Claude Code session in this repo. Rules here override Claude's defaults.

## Documentation Rules (always)

After completing **any** feature, fix, refactor, or significant change, update the relevant docs in the **same change** — do not defer it.

- **`README.md`** — keep the Stack, Directory Layout, Running Locally, and Known Issues sections in sync with reality. If you add/remove a top-level folder, change the dev command, bump a major dep (Expo, React Native, Supabase), or introduce/remove a Known Issue, update README.md.
- **`docs/`** — if the change touches a flow that has a doc under `docs/` (e.g. `docs/prompts/otp-signer-verification.md`), update that doc too.
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

- **Stack:** Expo SDK 55, React Native 0.81, React 19, Supabase (Postgres + Auth + Storage), expo-router.
- **Install:** `npm install --legacy-peer-deps` (Radix/React 19 peer conflicts).
- **Dev:** `npx expo start`.
- **Native iOS legacy:** `ios-legacy` branch — do not modify from main.
- **Storage buckets:** `certificates`, `answer-photos`, `pdfs`, `signatures`.
- **Languages:** UI strings are in Georgian (ქართული). Do not auto-translate them to English.

## Web codebases

There are two separate web codebases in this repo. Neither shares code with the Expo mobile app — only Supabase.

- **`web/` (sarke-sign):** tokenized signing page hosted at `https://gilavi.github.io/Sarke2.0/` (root). Linked from SMS in `lib/sms.ts` + `supabase/functions/send-signing-sms/`. Hash routing (`#/sign/<token>`). Don't change its base path — it would break in-flight SMS links.
- **`web-app/` (dashboard):** new public dashboard at `https://gilavi.github.io/Sarke2.0/app/`. Vite + React + TypeScript + Tailwind. Reimplements features in HTML/CSS — no Expo, no React Native. **Mobile parity is not a goal** — changes here don't need to track the Expo app.

Both deploy via separate GitHub Actions (`deploy-web.yml` and `deploy-web-app.yml`) to the same `gh-pages` branch under different `destination_dir` values; `keep_files: true` preserves the other app's tree.

## Things to Avoid

- Don't add new top-level folders without updating the Directory Layout in README.md.
- Don't bump Expo/RN/React major versions without an accompanying README note.
- Don't delete entries from `BUG_REPORT.md` — mark them resolved.
- Don't edit historical `QA_REPORT_YYYY-MM-DD.md` files.
