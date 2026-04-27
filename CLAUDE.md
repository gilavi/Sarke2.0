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
3. Run `npm run typecheck` (it may fail per known issues — note new failures, don't add to them).
4. Stage code + docs together in the same commit.

## Project Quick Reference

- **Stack:** Expo SDK 55, React Native 0.81, React 19, Supabase (Postgres + Auth + Storage), expo-router.
- **Install:** `npm install --legacy-peer-deps` (Radix/React 19 peer conflicts).
- **Dev:** `npx expo start`.
- **Native iOS legacy:** `ios-legacy` branch — do not modify from main.
- **Storage buckets:** `certificates`, `answer-photos`, `pdfs`, `signatures`.
- **Languages:** UI strings are in Georgian (ქართული). Do not auto-translate them to English.

## Things to Avoid

- Don't add new top-level folders without updating the Directory Layout in README.md.
- Don't bump Expo/RN/React major versions without an accompanying README note.
- Don't delete entries from `BUG_REPORT.md` — mark them resolved.
- Don't edit historical `QA_REPORT_YYYY-MM-DD.md` files.
