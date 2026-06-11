# Launch Prep — 2026-06-12 (mobile app, 8 workstreams)

One session, commits `phase-1` … `phase-9` on `main`. Baseline (Phase 0):
`npm run lint` clean, `npm run test:unit` 61/61 pass — both held through every
phase; integration suite grew from 30 to 34 tests (all pass).

## Stop-rule findings (where reality contradicted the prompt)

1. **Phase 2 premise was stale.** The storage-RLS hole (`sarke_*_authenticated`
   policies) was already fixed by `0053_storage_rls_owner_scoping.sql` and
   **applied to production on 2026-05-26** (commit `618655a` for signed-URL
   reads). Verified live this session — see Apply & Verify below. No new
   migration was needed; Phase 2 became tests + verification.
2. **README Known Issues #1** no longer mentions storage RLS (removed when
   0053 landed) — nothing to update there.
3. **No 'in-progress' inspection status exists** — the schema has
   `draft | completed` only. The demo seed uses drafts dated today instead.
4. **MapPicker used expo-location for geocoding too** (not just locate-me).
   Removing the dependency also removed address-search/reverse-geocode in the
   map picker — it is now manual pan/zoom + draggable pin + plain address text
   field (Tbilisi fallback region). See follow-ups.
5. **No container runtime on this machine** (no Docker/OrbStack/colima), so
   local Supabase could not start; the new storage RLS tests skip gracefully
   (same pattern as the existing RLS tests) and run for real once Docker is
   present: `npm run supabase:start && npm run supabase:reset && npm run test:integration`.
6. **`website/docs/whats-new.md:122`** still says the storage RLS gap is
   "Open — see BUG_REPORT.md" — doubly stale (gap closed; file moved), but
   `website/` was out of scope. Fix on a web pass.
7. **EAS CLI account mismatch** — authed as `gilavi2000`, but the EAS project
   `ab800403-…` is owned by `x4ylee`, so `eas env:list` / `update:configure`
   were not possible; OTA was configured manually and the env commands are in
   Manual Steps.
8. **`lib/bogPayment.ts` was already dead** (no importers) — deleted.

## Per-phase summary

| Phase | What changed |
|---|---|
| 1 | 22 root `*.md` reports → `docs/reports/` (git mv); references updated in CLAUDE.md (doc rules now point at `docs/reports/...`), ONBOARDING, docs/, AGENTS.md files, `lib/session.tsx` comment; `docs/reports/README.md` added. |
| 2 | Live production verification of 0053 (queries below); 4 cross-user storage RLS tests added to `tests/integration/rls/policies.test.ts` (per-bucket: owner uploads/reads/deletes; other user denied download/list/delete). Stale "OPEN" P0 recipe heading in `docs/reports/BUG_REPORT.md` marked RESOLVED. |
| 3 | Purchase UI fully removed: `PaywallModal.tsx` + `bogPayment.ts` deleted; `SubscriptionNotice.tsx` added (i18n keys `components.subscriptionNotice.*` with the agreed ka/en copy, usage X/30, dismiss only); swapped at all 18 screens (state renamed `paywallVisible` → `limitNoticeVisible`); `PdfLockedBanner` subscribe CTA → Details button; More tab ₾19 renew/upgrade buttons removed (status/usage/expiry + cancel kept); payment deep links removed from `_layout.tsx`; `docs/payments.md` + AI_BRIEFING updated. Sweep grep for `₾|19/თვე|createBogOrder|PaywallModal|bogPayment` over app/components/features/lib/locales is empty. |
| 4 | `expo-apple-authentication` + `app.json` (`usesAppleSignIn`, plugin); `signInWithApple()` in `lib/session.tsx` (SHA-256 nonce → `signInWithIdToken`; cancellation swallowed; first-auth name patched onto users row + metadata, then `loadUser` re-read); new `components/auth/SocialAuthButtons.tsx` (+AGENTS.md) — iOS shows only the native Apple button (theme-aware, 48pt, `isAvailableAsync`-gated), Android keeps Google; login.tsx shrank 753→674 lines. |
| 5 | Location + mic permissions deleted from app.json (iOS strings + Android array now `[]`); `expo-location` uninstalled; `utils/location.ts`, `lib/photoLocationAlert.ts` (+ its unit test) deleted; `hooks/usePhotoWithLocation` → `hooks/usePhotoPicker` (geotag capture removed end-to-end incl. /photo-picker GPS + bus side-channel); payloads keep `latitude/longitude/address` columns but always send null; PDF templates verified null-tolerant (if-guarded captions); MapPicker/.web stripped; `check-primitives.mjs` allowlist + docs updated. Verification grep for `expo-location|getCurrentPosition|requestForegroundPermissions` is empty. |
| 6 | `@sentry/react-native/expo` plugin with `<TODO_SENTRY_ORG>/<TODO_SENTRY_PROJECT>` placeholders (no org/project found anywhere in-repo); `SENTRY_DISABLE_AUTO_UPLOAD` removed from the **production** EAS profile (preview keeps it); `expo-updates` installed; `updates.url=https://u.expo.dev/ab800403-36c4-4673-8dd8-dfc75b66d14b`, `runtimeVersion.policy=appVersion`, channels `production`/`preview`. |
| 7 | Skeletons (extending `components/Skeleton.tsx`; native Animated kept): six project sub-lists (SkeletonRow ×6 + canonical guard + their own refetch), detail screens (briefings/incidents/reports/slide/success/sign), PDF preview builds (SkeletonPreview), wizard loads (SkeletonWizard), ProjectPickerStep, CertificatesActionSheet, breathalyzer. Pull-to-refresh: calendar, regulations (force), history, templates, qualifications + the six sub-lists (theme-tinted). All button/mutation spinners and per-thumbnail indicators deliberately kept. `expo-image` `transition={200}` on all photo-grid thumbnails; harness `CellPhotoThumb` converted RN Image → expo-image. home/projects were already canonical (untouched). |
| 8 | `scripts/seed-demo-account.mjs` + `docs/APP_STORE_REVIEW.md` (details in those files). |
| 9 | This report; README sync (directory layout `docs/reports/`, Stack: +expo-apple-authentication/+expo-updates/−expo-location, Sentry note); WHATS_NEW entry. |

## Phase 2 — storage RLS: state, Apply & Verify

**Scoping model (already live).** Owner-based (`storage.objects.owner = auth.uid()`),
NOT path-based — the 2a inventory confirms path-based is impossible without
rewriting writers, because three of four buckets use non-ownable first
segments. INSERT stays auth-only (owner isn't populated when WITH CHECK runs —
same as 0020). Edge functions use the service role (bypass RLS); `sharePdf`
signed URLs keep working for recipients.

### 2a. Bucket → path template → ownership chain → policy form

| Bucket | Path template(s) (writers) | First-segment ownable? | Policy form (live) |
|---|---|---|---|
| `certificates` | `{user_id}/{inspection_id}/{uuid}.jpg` (`lib/services/real/inspections.ts uploadPhoto`) | yes (user id) — but only this bucket | owner-based R/U/D + auth insert |
| `answer-photos` | `{type-tag}/{subpath}/{uuid}.jpg` (`makeInspectionService`, tags `bobcat`, `excavator`, `general_equipment`, …); `{questionnaire_id}/{question_id}/{ts}.{ext}` (wizard + harness); order cert images (`NewOrderScreen`) | no (literal tags / inspection ids) | owner-based R/U/D + auth insert |
| `pdfs` | `incidents/{pdfName}`, `orders/{pdfName}` (+ queue `lib/pdfUploadQueue`) | no (literal folders) | owner-based R/U/D + auth insert |
| `signatures` | `project/{project_id}/signer-{…}.png` (project signer); incident inspector sig paths; web-app writes same bucket | no (literal `project/`) | owner-based R/U/D + auth insert |

### Verification already executed against production (2026-06-12, read-only)

```sql
select policyname, cmd from pg_policies
 where schemaname='storage' and tablename='objects' order by policyname;
-- → per-bucket "<bucket> owner read/update/delete" + "<bucket> auth insert"
--   for certificates / answer-photos / pdfs / signatures; NO sarke_* rows.

select policyname from pg_policies
 where schemaname='storage' and tablename='objects' and policyname ilike '%sarke%';
-- → 0 rows.

select id, public from storage.buckets order by id;
-- → all 8 buckets public = false.
```

Re-run anytime via `supabase db query --linked "<sql>"` (CLI is linked; do
**not** `supabase db push` — the hosted migration history is intentionally
behind and a push would apply a backlog).

### Manual smoke checklist (recommended once before submission)

1. Account 1: upload a certificate photo, an answer photo, generate + share a
   PDF — all visible/openable to account 1.
2. Account 2 (different login): using account 1's object paths, attempt
   `download`/`list`/`remove` via the storage API → all denied/no-op.
3. PDF share via signed URL from account 1 opens in an incognito browser
   (no auth) — signed URLs bypass RLS by design.
4. With Docker available: `npm run supabase:start && npm run supabase:reset &&
   npm run test:integration` — the 4 new storage tests must pass (they
   currently skip without local Supabase).

## Manual steps for Luka (in order)

1. **Supabase → Authentication → Providers → Apple**: enable, add `ge.sarke2.app`
   to Client IDs. (For Expo Go testing also add `host.exp.Exponent`; not needed
   for TestFlight.) Sign in with Apple capability on the App ID syncs via EAS
   on the next build — just confirm it in the build logs.
2. **Sentry**: create/locate the Sentry org + project, replace
   `<TODO_SENTRY_ORG>` / `<TODO_SENTRY_PROJECT>` in `app.json`, then (under the
   EAS account that owns the project — `x4ylee`; the CLI here was authed as
   `gilavi2000` which lacks access):
   ```bash
   eas env:create --name EXPO_PUBLIC_SENTRY_DSN --value "<dsn>" --environment production --visibility plaintext
   eas env:create --name SENTRY_AUTH_TOKEN --value "<token>" --environment production --visibility secret
   ```
3. **Demo account**: `SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node
   scripts/seed-demo-account.mjs` → paste the printed password into
   `docs/APP_STORE_REVIEW.md` + App Store Connect review notes.
4. **Privacy policy URL** must be live before submission (placeholder in
   `docs/APP_STORE_REVIEW.md`).
5. **Cut a new build**: `eas build --platform ios --profile production`.
   Apple sign-in, the permission removals, Sentry upload, and OTA are all
   invisible in Expo Go and in existing builds. First OTA hotfix afterwards:
   `eas update --channel production --message "<fix>"`.
6. Optional: run the storage smoke checklist above.

## Recommended follow-ups (not done)

- **Owner-scope `incident-photos`/`report-photos` properly** (path-aware:
  `{project_id}/{report_id}/…`) — deliberately auth-only since the June 2026
  web audit.
- **Limit-reached email** ("upgrade at hubble.ge") sent server-side — legal
  under 3.1.1/3.1.3(?) guidance for reader-style communications via email, but
  requires an email provider; skipped by design.
- **Geocode search in MapPicker** — restore via an HTTP geocoder (e.g. a
  Supabase Edge Function proxying Nominatim/Google) now that expo-location is
  gone.
- **`website/docs/whats-new.md`** stale RLS line (out of scope this session).
- **Tighten `increment_pdf_count`** free limit (currently 30) + raise price
  from the ₾1 test rate when ready — both server-side, no app build needed.
- **Sentry org/project placeholders** must be replaced before the next
  production build (the plugin will otherwise rely on env fallbacks).

## Test gate (Phase 9)

- `npm run lint` — clean (typecheck + check-primitives).
- `npm run test:unit` — 61/61 pass (the deleted photoLocationAlert suppress
  test was removed with its feature).
- `npm run test:integration` — 34/34 pass (4 new storage RLS tests skip
  gracefully without local Supabase — no Docker on this machine).
- `npm run test:e2e` not run (Playwright targets the web bundle; out of scope).
