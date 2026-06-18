# Hubble

Expo (React Native) app for occupational safety experts in Georgia. An expert creates a project, fills a checklist-style inspection on their phone, collects worker signatures, and generates a PDF report. All UI copy is in Georgian (ქართული).

There is also a public web dashboard ([`web-app/`](web-app/)) and a tokenized signing page ([`web/`](web/)) sharing the same Supabase backend.

**See also:** [docs/AI_BRIEFING.md](docs/AI_BRIEFING.md) for a working overview, [docs/WHATS_NEW.md](docs/WHATS_NEW.md) for recent changes, [docs/primitives.md](docs/primitives.md) for cross-cutting helpers, [docs/payments.md](docs/payments.md) for BOG payment flow, [CLAUDE.md](CLAUDE.md) for AI-session rules.

---

## Stack

- **Expo SDK 54** + expo-router (`~6.0.23`) — file-based routing.
- **React Native 0.81**, **React 19**.
- **New Architecture** (Fabric + TurboModules) enabled via `app.config.ts`'s `newArchEnabled: true`; required by `react-native-reanimated@4.x`.
- **Supabase** (`@supabase/supabase-js ^2.58.0`) — Postgres + Auth + Storage. URL and anon key are resolved per-environment by `app.config.ts` → `expo.extra` (selected by the `APP_ENV` env var; unset → production). `lib/supabase.ts` reads them via `Constants.expoConfig.extra`. See [docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md).
- **`react-native-keyboard-controller`** — wired at the root via `<KeyboardProvider>`. Always import `KeyboardAvoidingView` / `KeyboardAwareScrollView` from this package, not from `react-native`.
- **`expo-image-picker`**, **`expo-document-picker`**, **`expo-print`**, **`expo-sharing`** — media + PDF generation.
- **`react-native-signature-canvas`** — signature capture.
- **`expo-apple-authentication`** — Sign in with Apple (iOS only; Google sign-in is Android-only per Apple guideline 4.8). Added 2026-06-12.
- **`expo-updates`** — EAS Update (OTA). Channel is baked per build and selected by the EAS profile (`production` / `staging`); `runtimeVersion.policy = appVersion`. Only applies to builds created after 2026-06-12. Publish **only** via the env-pinned scripts (`npm run update:staging` / `update:production`) — never a bare `eas update` (it can ship the wrong backend to a channel; see [docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md)).
- **`qrcode`** — inspection QR embedded in the PDF header (SVG data URL).
- **Sentry** — crash reporting via [lib/crashReporting.ts](lib/crashReporting.ts). Set `EXPO_PUBLIC_SENTRY_DSN` to enable; otherwise crashes log to console. The Sentry `environment` tag is the active `APP_ENV` (development/staging/production), sourced from `extra.appEnv`. Production builds upload source maps; the `@sentry/react-native/expo` plugin org/project are `hubble-pk`/`hubble-mobile` in `app.config.ts`, overridable via `SENTRY_ORG`/`SENTRY_PROJECT` env.
- **No location/microphone**: `expo-location` was removed 2026-06-12 (photo geotagging dropped; map pin is manual). The app records no audio/video.

The native SwiftUI port lives on the [`ios-legacy`](https://github.com/gilavi/Sarke2.0/tree/ios-legacy) branch and is not maintained from `main`.

---

## Running Locally

```sh
npm install --legacy-peer-deps   # peer conflicts around Radix/React 19
npx expo start                   # Expo dev server
```

Scan the QR with **Expo Go** (defaults to the production backend when `APP_ENV` is unset). Supabase credentials are resolved by `app.config.ts`; run `npm run start:staging` to point the dev server at the staging project. See [docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md).

### Lint + typecheck

```sh
npm run lint        # tsc --noEmit && check-primitives.mjs && check-tokens-fresh.mjs
npm run typecheck   # tsc only
npm run tokens      # regenerate web token artifacts from lib/design-tokens.ts
```

`scripts/check-primitives.mjs` blocks grep-detectable misuses (bare `KeyboardAvoidingView` from `react-native`, legacy image helper names, direct `AsyncStorage` access to `pdf_language`). When adding a cross-cutting helper, read [docs/primitives.md](docs/primitives.md) first.

**Design tokens** are defined once in [lib/design-tokens.ts](lib/design-tokens.ts) (pure data — colors, type scale, spacing, radii, shadows, motion, z-index). `lib/theme.ts` shapes them into the React Native theme; `npm run tokens` regenerates the web artifacts under `web-app/src/generated/` (`tokens.css`, `tailwind-tokens.ts`). `check-tokens-fresh.mjs` (run in `npm run lint`) fails if those are stale, so web and mobile can't drift. Edit tokens **only** in `lib/design-tokens.ts` — never the generated files.

### Unit tests

```sh
npx vitest run                  # run all unit tests
npx vitest run --coverage       # with v8 coverage report
npx vitest                      # watch mode
```

Tests live under [tests/unit/](tests/unit) (config: [vitest.config.ts](vitest.config.ts), jsdom environment, `react-native` aliased to `react-native-web`). Project-wide coverage is currently **~26% statements / ~28% branches / ~20% functions / ~26% lines** across 36 files / 407 tests, gated by `coverage.thresholds = 20/20/20/20`. Coverage is measured over `lib/**`, `types/**`, and `store/**` (see `coverage.include` in `vitest.config.ts`); `lib/supabase.ts`, `lib/theme.ts`, `lib/ThemeContext.tsx` are excluded.

The legacy `__tests__/*.mjs` files are not run (they use `node:test` which doesn't load under vitest's jsdom). New unit tests go in `tests/unit/`. Integration tests in `tests/integration/` need a live Supabase and are not part of the default run.

---

## Repository Layout

Top-level folders, one line each.

| Path | Purpose |
|---|---|
| `app/` | expo-router routes for the mobile app. Large flows (`inspections/[id]/wizard.tsx`, `orders/new.tsx`, `projects/[id].tsx`) are thin orchestrators that re-export from `features/`. Subfolders: `(auth)/`, `(tabs)/`, `projects/[id]/logs/` (breathalyzer log journal), `questionnaire/`, `template/`, `inspections/` (per-category screens: bobcat, excavator, cargo-platform, general-equipment, safety-net, mobile-ladder, fall-protection, forklift, lifting-accessories, plus generic `[id].tsx`). |
| `components/` | Shared RN components, organized as flat top-level files (`ProjectAvatar`, `BottomSheet`, `FlowHeader`, `SheetLayout`, …) plus domain folders (`ui/` primitives, `harness-list/`, `photo-annotator/`, `wizard/` + `wizard/kamari/`, `inspection-parts/`, `inspection-steps/`, `bobcat/`, `excavator/`, `cargoPlatform/`, `generalEquipment/`, `home/`, `icons/`, `inputs/`, `layout/`, `primitives/`, `projects/`, `qualifications/`, `animations/`) each with its own `AGENTS.md` documenting public API and gotchas. |
| `features/` | Feature-sliced modules. Each subfolder (`inspection-wizard/`, `order-new/`, `project-detail/`, `signatures/`) owns a self-contained flow with its own `AGENTS.md`; `app/` route files delegate to the matching feature module. The `signatures/` module owns the unified inspection signatures flow (one creator capture + N empty hand-sign slots) and enforces the no-persistence rule for captured signature data. |
| `lib/` | Supabase client, session/auth provider, domain-split data services under `services/` (`real/<domain>.ts` + `mock/<domain>.ts`), theme, the schema-driven equipment-inspection PDF engine (`inspection/` — renderer, schemas, service factory, registry; see [docs/primitives.md](docs/primitives.md#inspection-pdf-engine)), domain-split order/inspection PDF templates under `pdf/order/` and `pdf/inspection/` (with `template.css.ts` siblings; the original `lib/orderPdf.ts` and `lib/inspectionPdfTemplate.ts` paths remain as re-export barrels), generic PDF template (`pdf.ts`), offline queue, `pdfGate.ts`, `pdfSecurity.ts`, `crashReporting.ts`, `sms.ts`, canonical keyboard hooks, and `shared/` — pure cross-platform helpers imported by **both** the Expo app and `web-app/` (currently `shared/documentName.ts`, the canonical document display-name logic; see [docs/primitives.md](docs/primitives.md#document-display-names-shared-with-web)). |
| `hooks/` | React hooks (e.g. `usePhotoPicker` for all photo-pick flows). |
| `utils/` | Stateless helpers (`location.ts` GPS + reverseGeocode, etc.). |
| `types/` | Shared TypeScript models (`models.ts`). |
| `assets/` | Fonts, images, icons bundled with the app. |
| `locales/` | UI strings (Georgian baseline). |
| `shims/` | Web stubs (worklets, keyboard-controller) loaded via `metro.config.js` aliases. |
| `scripts/` | Repo scripts including `check-primitives.mjs` (lint guard). |
| `supabase/` | `migrations/` SQL files (0001–0054 plus timestamp-prefixed migrations from 2026-05-25 onward; numbers 0044/0045/0046 are each used by two files — see Migrations note), `seed/` system templates, `functions/` Edge Functions, `.temp/` local CLI cache. |
| `docs/` | Project documentation — `AI_BRIEFING.md`, `WHATS_NEW.md`, `primitives.md`, `payments.md`, `APP_STORE_REVIEW.md`, `design-system-audit-*.md`, `prompts/`, and `reports/` (historical session/QA/bug reports — the repo root keeps only README/CLAUDE/ONBOARDING/TESTING). |
| `web/` | `hubble-sign` tokenized signing page (Vite + React). Deployed to `https://hubble.ge/` (GitHub Pages with CNAME). |
| `web-app/` | Public dashboard (Vite + React + TS + Tailwind). Deployed to `https://hubble.ge/app/`. |
| `website/` | Docusaurus documentation site. Deployed via `.github/workflows/docs.yml`. |
| `design-system/` | Storybook design-system showcase. Renders the **real** `components/primitives/*` on the web via react-native-web (the "universal" component tier — same files as the Expo app, so no drift) plus token galleries from `lib/design-tokens.ts`. Standalone Vite/Storybook project (not a workspace); excluded from the Metro/Expo build. Planned host: `ds.hubble.ge`. See [design-system/AGENTS.md](design-system/AGENTS.md). |
| `public/` | Static assets for the web bundles. |
| `tests/` | Vitest unit tests under `tests/unit/` (canonical location; config in [vitest.config.ts](vitest.config.ts)) plus live-Supabase integration tests under `tests/integration/`. |
| `__tests__/` | Legacy `.mjs` test mirrors that import `node:test` — not loaded by the vitest runner. Do not add new tests here; write them under `tests/unit/`. |
| `e2e/` | Playwright end-to-end tests (config in `playwright.config.ts`). |
| `src/` | Misc shared sources used by the web bundles. |
| `ios/` | Native iOS scaffold (legacy reference; primary native port is on `ios-legacy` branch). |

GitHub Actions in `.github/workflows/`: `deploy-web.yml`, `deploy-web-app.yml`, `deploy-web-app-staging.yml` (develop → `/app-staging/`, staging Supabase), `deploy-web-app-preview.yml`, `db-and-functions.yml` (Supabase migrations + functions: develop → staging auto, production via gated manual run), `ci-web-app.yml`, `docs.yml`, `test.yml`.

The full **staging vs production** environment strategy — branch model (`develop` = staging, `main` = production), the second Supabase project, EAS app variants, GitHub Environments, and the remaining manual setup steps — lives in **[docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md)**.

---

## Inspection Templates

All seeded by `supabase/seed/01_system_templates.sql` and individual migrations.

| Template | Category | DB table | Route | Notes |
|---|---|---|---|---|
| ფასადის ხარაჩოს შემოწმების აქტი (facade scaffolding) | (generic) | `inspections` + `answers` | `app/questionnaire/[id].tsx` (wizard) → `app/inspections/[id].tsx` (result) | Original template. Includes the 9-card ხარაჩო tour persisted in AsyncStorage under `haraco_tour_seen`. |
| დამცავი ქამრების შემოწმების აქტი (fall-protection harness) | (generic, kamari flow) | `inspections` + `answers` | wizard + `components/wizard/kamari/` | Count screen, overview grid, per-belt accordion. |
| ციცხვიანი დამტვირთველის შემოწმების აქტი (Bobcat / Skid-Steer) | `bobcat` | `bobcat_inspections` | `app/inspections/bobcat/[id].tsx` | 30-item 3-state checklist, summary table, verdict auto-suggestion. Migration 0024. |
| დიდი ციცხვიანი დამტვირთველის შემოწმება (Large Loader) | `bobcat` | `bobcat_inspections` | same as Bobcat | 33-item variant (template UUID `44444444-…`). Item #40 (reverse camera) has a neutral "არ გააჩნია" option. Migration 0025. |
| ექსკავატორის ტექნიკური შემოწმების აქტი (Excavator) | `excavator` | `excavator_inspections` | `app/inspections/excavator/[id].tsx` | 6-step wizard (info → engine → undercarriage → cabin+safety → maintenance+verdict → signature). Migration 0026, registration number added in 0030. |
| ტექნიკური აღჭურვილობის შემოწმების აქტი (general equipment) | `general_equipment` | `general_equipment_inspections` | `app/inspections/general-equipment/[id].tsx` | User builds the equipment list row-by-row. Migration 0027. |
| ტვირთის მიმღები პლატფორმის შემოწმების აქტი (cargo receiving platform) | `cargo_platform` | `cargo_platform_inspections` | `app/inspections/cargo-platform/` | 7-section template: general info, platform ID, cargo list, 9-item checklist, verdict, summary photos, two signatories. Migration 0040. |
| მობილური ხარაჩოს შემოწმების აქტი (mobile scaffold) | (generic) | `inspections` + `answers` | generic wizard | Reuses the generic wizard — no new table. Template UUID `33333333-…`. Migrations 0041, 0042 (N3 variant). |
| უსაფრთხოების ბადის შემოწმების აქტი (safety net) | `safety_net_inspection` | `safety_net_inspections` | `app/inspections/safety-net/[id].tsx` | Multi-device wizard; per-net identification + condition checklist. UUID `88888888-…`. Migration 0044. |
| მობილური კიბის შემოწმების აქტი (mobile ladder) | `mobile_ladder_inspection` | `mobile_ladder_inspections` | `app/inspections/mobile-ladder/[id].tsx` | Multi-device wizard. UUID `bbbbbbbb-…`. Migration 0045. |
| დამჭერი მოწყობილობების შემოწმების აქტი (fall protection) | `fall_protection_inspection` | `fall_protection_inspections` | `app/inspections/fall-protection/[id].tsx` | Multi-device, 4-state checklist (✓/✗/Z/N), per-device verdict + signature. UUID `cccccccc-…`. Migration 0046. |
| ჩანგლიანი დამტვირთველის შემოწმების აქტი (forklift) | `forklift_inspection` | `forklift_inspections` | `app/inspections/forklift/[id].tsx` | 3-step wizard; 39-item checklist (A/B/C sections), 13-row summary table, extended signature. UUID `dddddddd-…`. Migration 0047. |
| სამაგრი მოწყობილობების შემოწმების აქტი (lifting accessories) | `lifting_accessories_inspection` | `lifting_accessories_inspections` | `app/inspections/lifting-accessories/[id].tsx` | Multi-device wizard; EN 1492/818/1677/ISO 4309 standards. UUID `aaaaaaaa-…`. Migration 0049. |

All equipment types above (`bobcat` … `lifting_accessories`) generate their PDFs through the shared schema-driven engine in `lib/inspection/` — each type is a data descriptor in `lib/inspection/schemas/`, rendered by one `buildInspectionPdf` and persisted via `makeInspectionService`. The generic/harness templates still use `lib/pdf.ts`. See [docs/primitives.md → Inspection PDF engine](docs/primitives.md#inspection-pdf-engine).

Photo geotagging was removed 2026-06-12 (location permission dropped for App Store review). The `answer_photos` GPS columns (migration 0023) remain in the schema for old rows; new uploads always write `latitude/longitude/address = null`.

---

## Web codebases

Two static bundles in this repo plus a Docusaurus site. None share code with the Expo mobile app — only Supabase.

| Path | Purpose | URL | Deploy workflow |
|---|---|---|---|
| `web/` (hubble-sign) | Tokenized signing page recipients open from an SMS link | `https://hubble.ge/` | `deploy-web.yml` |
| `web-app/` (dashboard) | Public dashboard with full BOG payment parity | `https://hubble.ge/app/` | `deploy-web-app.yml` (+ `-preview.yml` for PR previews under `/app/preview/`) |
| `website/` (Docusaurus) | Documentation site | published via `docs.yml` | `docs.yml` |

All three deploy to the same `gh-pages` branch under different `destination_dir` values; `keep_files: true` preserves the other trees.

**Don't change the base path of `web/`** — in-flight SMS links from `lib/sms.ts` + `supabase/functions/send-signing-sms/` would break (the path after the domain must stay `/`; the `hubble.ge` CNAME can change without affecting links).

### Public marketing site (multi-page)

The logged-out landing is a multi-page marketing site sharing one `MarketingLayout` (navbar / footer / overlays); logged-in visitors are redirected to `/home`. Pages: `/#/` (Home), `/#/about`, `/#/pricing`, `/#/legislation` (public regulations/blog — **distinct** from the protected `/#/regulations` dashboard page), `/#/contact`. The Contact page hosts a **live AI support chatbot** backed by the `ai-chat` Edge Function (Anthropic proxy; `verify_jwt = false`). Sections live in `web-app/src/pages/landing/`.

### Dashboard routes

| Route | Description |
|---|---|
| `/#/` | Home — greeting, subscription banner, quick-action tiles, combined stats+heatmap widget, per-project activity widgets |
| `/#/projects` | Project list (grid or map view). Cards show OSM map tile background + logo badge. |
| `/#/projects/:id` | Project detail — 11-section layout (crew, signers, inspections, incidents, briefings, reports, files, orders, danger zone). Composed from `pages/ProjectDetail/` modules. |
| `/#/inspections` | All scaffold/harness inspections list |
| `/#/incidents` | Incidents list + new incident |
| `/#/briefings` | Briefings list + new briefing |
| `/#/reports` | Reports list + new report |
| `/#/orders` | Orders (ბრძანებები) list |
| `/#/calendar` | Calendar view of activity |
| `/#/history` | Activity history |
| `/#/account` | Subscription management + payment history |
| `/#/subscribe` | Initiates a BOG order via the shared `create-bog-order` Edge Function |
| `/#/subscribe/success` / `/#/subscribe/fail` | BOG redirect targets; success invalidates `pdf-usage` cache |
| `/#/safety` | 3D Interactive Construction Safety Guide (Three.js / React Three Fiber). Responsive: side-by-side on desktop, stacked on mobile. |

`PaywallModal` wraps `/subscribe` for in-flow upsell; gate calls via `checkAndIncrementPdfCount(userId)` from `web-app/src/lib/pdfGate.ts` (mirrors mobile [lib/pdfGate.ts](lib/pdfGate.ts)). Cancel uses the `cancel_subscription` RPC — idempotent; access continues until `subscription_expires_at`.

See [docs/payments.md](docs/payments.md) for the end-to-end BOG flow.

### Dashboard local dev

```sh
cd web-app
npm install
cp .env.example .env   # already has the public anon credentials
npm run dev            # http://localhost:5173/Sarke2.0/app/
```

---

## Keyboard Handling — the three patterns

There is one way to handle the keyboard for each surface type. Don't invent a fourth.

1. **Regular screens** — wrap content in `<KeyboardSafeArea headerHeight={N}>`. The wrapper uses the library's KAV under the hood, sets `contentContainerStyle: { flexGrow: 1 }` on the inner ScrollView, and dismisses the keyboard on tap. Put the primary action button as the **last child** (with a `<View style={{ flex: 1 }} />` spacer above it if you want it pinned to the bottom of the visible area). Pass the height of any custom header rendered above the wrapper (`<FlowHeader>` is `44`); `0` if none. For stock stack headers, `useHeaderHeight()` from `@react-navigation/elements` is the right value (see [signer.tsx](app/projects/%5Bid%5D/signer.tsx)).

2. **Custom bottom sheets** (Modal-based) — apply `marginBottom` from `useSheetKeyboardMargin()` (see [lib/useSheetKeyboardMargin.ts](lib/useSheetKeyboardMargin.ts)) to the sheet card's wrapping `Animated.View`. The hook listens to `keyboardWillShow` / `keyboardWillHide` and animates with the iOS keyboard's own `e.duration` and `Easing.bezier(0.17, 0.59, 0.4, 0.77)`. **Do not wrap a Modal-based sheet in `KeyboardAvoidingView`** — that double-lifts on top of `SheetLayout`'s internal `KeyboardAwareScrollView` and overshoots.

3. **Inside `BottomSheetProvider`** — nothing to do. The provider's sheet card uses the same hook; `<SheetLayout>` content rides the keyboard automatically.

---

## Supabase

Schema + seed already applied to the hosted project. Migrations are preserved for reference.

### Auth — email delivery (Resend SMTP)

Outbound email uses **Resend** via custom SMTP (configured in the Supabase dashboard under Auth → SMTP Settings). Sender domain is `mail.hubble.ge` (SPF/DKIM/DMARC on Amazon Route 53). Do not switch back to Supabase's built-in SMTP — the free tier caps at ~4 emails/hour and has poor deliverability.

### Migrations (`supabase/migrations/`)

> **Duplicate numbers:** `0044`, `0045`, `0046` each have **two files** — inspection tables from one branch and reports-RLS fixes from another, merged together. Both halves are applied to the hosted DB. **Do not renumber them** — it would desync the migration history. Numeric migrations continue from `0054`; **migrations from 2026-05-25 onward use timestamp-prefixed names** (`YYYYMMDDHHMMSS_...sql`) for SQL that originated in Supabase Studio and was captured to the repo after the fact. Both naming conventions coexist.

| File | Purpose |
|---|---|
| `0001_init.sql` | Tables + initial RLS |
| `0002_terms_acceptance.sql` | Terms-of-service acceptance tracking |
| `0003_feature_additions.sql` | Misc feature columns |
| `0004_signatures_v2.sql` | Signatures schema v2 |
| `0005_schedules_automation.sql` | Schedules + automation hooks |
| `0006_inspections_certificates.sql` | Inspections + certificates tables |
| `0007_rename_required_qualifications.sql` | Qualification column rename |
| `0008_freeze_completed_inspections.sql` | Freeze-on-complete guard |
| `0009_notes_column.sql` | Adds notes column |
| `0010_freeze_completed_at.sql` | `completed_at` freeze timestamp |
| `0011_remote_signing.sql` | Tokenized remote signing |
| `0012_project_location.sql` | Project lat/lng/address |
| `0013_project_crew.sql` | Project crew members |
| `0014_project_files.sql` | Project file attachments |
| `0015_project_logo.sql` | Optional `projects.logo` (base64 data URL) |
| `0016_signer_role_other.sql` | Adds `'other'` to `signer_role` enum |
| `0017_incidents.sql` | Incidents table |
| `0018_briefings.sql` | Briefings table |
| `0019_reports.sql` | Reports table |
| `0020_storage_rls_and_timestamps.sql` | Tightens `incident-photos` / `report-photos` storage RLS to row owner; adds `updated_at` + audit trigger; adds composite indexes |
| `0021_inspection_attachments.sql` | `inspection_attachments` table for equipment certificates (type chip + №number + 16:9 photo) |
| `0022_project_contact_phone.sql` | Project contact phone column |
| `0023_photo_location.sql` | Adds `latitude`, `longitude`, `address` to `answer_photos`; backfills from legacy `addr:` caption prefix |
| `0024_bobcat_inspections.sql` | `bobcat_inspections` table + Bobcat and Large Loader templates (`category: 'bobcat'`) |
| `0025_large_loader_template.sql` | Large Loader template variant (UUID `44444444-…`) |
| `0026_excavator_template.sql` | `excavator_inspections` table + template (`category: 'excavator'`) |
| `0027_general_equipment_inspection.sql` | `general_equipment_inspections` table (JSONB `equipment`, `summary_photos`) + template (UUID `66666666-…`) |
| `0028_pdf_usage_tracking.sql` | Adds `pdf_count`, `subscription_status`, `subscription_expires_at`, `bog_card_token` to `users`; `increment_pdf_count` RPC enforces the free-tier cap |
| `0029_subscription_unlimited.sql` | Auto-expires lapsed subscriptions; grants unlimited PDFs to active subscribers |
| `0030_excavator_registration_number.sql` | Adds registration number to excavator inspections |
| `0031_subscription_cancel_and_history.sql` | `users.subscription_cancelled_at`, `cancel_subscription` RPC, `payment_records` table |
| `0032_inspections_add_signature.sql` | Inspector signature column on generic inspections |
| `0033_inspections_add_inspector_name.sql` | Inspector name column on generic inspections |
| `0034_bobcat_add_department.sql` | Department column on bobcat inspections |
| `0035_general_equipment_add_department.sql` | Department column on general-equipment inspections |
| `0036_inspections_add_department.sql` | Department column on generic inspections |
| `0037_summary_photos_bobcat_excavator.sql` | Adds JSONB `summary_photos` to bobcat + excavator |
| `0038_orders.sql` | `orders` table (e.g. labor-safety-specialist document orders) |
| `0039_pdf_hash.sql` | Adds `pdf_hash` to all tables storing generated PDF URLs; populated by `lib/pdfSecurity.ts` `hashPdf()`, verified by `verifyPdf()` |
| `0040_cargo_platform_inspection.sql` | `cargo_platform_inspections` self-contained table (7 sections, two signatories) |
| `0041_mobile_scaffold_template.sql` | Mobile scaffold template (UUID `33333333-…`) reusing the generic wizard |
| `0042_mobile_scaffold_n3_template.sql` | Mobile scaffold N3 variant |
| `0043_inspection_stats_rpc.sql` | Stats RPC for the dashboard home page |
| `0044_fix_reports_insert_rls.sql` | Reports INSERT RLS fix — drops the fragile project sub-query, checks `user_id = auth.uid()` (matches orders 0038). **Shares number 0044** (branch merge). |
| `0044_safety_net_inspection.sql` | `safety_net_inspections` table + template (UUID `88888888-…`, `category: 'safety_net_inspection'`) |
| `0045_fix_reports_update_rls.sql` | Reports UPDATE RLS fix — same simplification as 0044 (fixes report-slide image upload). **Shares number 0045.** |
| `0045_mobile_ladder_inspection.sql` | `mobile_ladder_inspections` table + template (UUID `aaaaaaaa-…`, `category: 'mobile_ladder_inspection'`) |
| `0046_fix_reports_delete_rls.sql` | Reports DELETE RLS fix — same simplification as 0044/0045. **Shares number 0046.** |
| `0046_fall_protection_inspection.sql` | `fall_protection_inspections` table + template (UUID `cccccccc-…`, `category: 'fall_protection_inspection'`) — multi-device, 4-state checklist (✓/✗/Z/N), per-device verdict + signature |
| `0047_forklift_inspection.sql` | `forklift_inspections` table + template (UUID `dddddddd-…`, `category: 'forklift_inspection'`) — 39-item checklist (A/B/C sections), extended signature, 3-step wizard |
| `0048_breathalyzer_log.sql` | `breathalyzer_logs` table — per-shift alcohol test logs; JSONB entries array; people pool in AsyncStorage; PDF with SAFE/WARNING/FAIL color-coded table |
| `0049_lifting_accessories_inspection.sql` | `lifting_accessories_inspections` table + template (UUID `bbbbbbbb-…`, `category: 'lifting_accessories_inspection'`) — binary checklist, multi-select equipment types, 3-verdict selector, EN 1492/818/1677/ISO 4309 |
| `0050_inspections_add_signatories.sql` | `signatories JSONB NOT NULL DEFAULT '[]'` column on `inspections` — stores additional signatories (name, role, base64 PNG signature, signed_at) beyond the primary inspector |
| `0051_equipment_signatories.sql` | Same `signatories JSONB NOT NULL DEFAULT '[]'` column added to `bobcat_inspections`, `excavator_inspections`, `cargo_platform_inspections`, `general_equipment_inspections` |
| `0052_inspection_conclusion_photos.sql` | `conclusion_photo_paths text[]` column on `inspections` — storage paths for conclusion-step photos. (Renamed from a colliding `0047_…` to `0052`.) |
| `0053_storage_rls_owner_scoping.sql` | Owner-scopes storage RLS on `certificates` / `answer-photos` / `pdfs` / `signatures` — drops the permissive dashboard `sarke_*` policies (bucket-id-only) and replaces them with per-bucket `owner = auth.uid()` SELECT/UPDATE/DELETE policies (INSERT stays auth-only). Companion to `0020`. Closes the write/delete half of the storage-RLS P0; the read half is gated on a separate bucket-privacy follow-up (these buckets are currently `public`). Applied via Management API. |
| `0054_report_photos_authonly.sql` | Switches all three `report-photos` storage policies (INSERT/SELECT/DELETE) to **auth-only**. Fixes report slide photos failing to save/read/delete: the deployed policies (drift from `0020`) required the report id as the first path folder, but uploads use `${project_id}/${report_id}/file`, so the id never matched. Applied to prod & verified 2026-06-04 via the SQL editor; idempotent. |
| `20260525180000_pin_function_search_paths.sql` | Pins `search_path = public, pg_catalog` on every public function. Fixes the TestFlight `auth.admin.deleteUser` 500 caused by trigger functions referencing the `questionnaire_status` enum without schema qualification. |
| `20260525183000_cascade_user_deletion.sql` | Adds `ON DELETE CASCADE` FKs from every user-owned public column (`%user_id%` / `%owner_id%` / `%created_by%` / `%uploaded_by%`) to `auth.users(id)`. Required for App Store Review Guideline 5.1.1(v). |
| `20260525190000_dedupe_user_fkeys.sql` | Drops duplicate `*_auth_users_fkey` constraints produced by the prior migration's `information_schema` blind spot. |
| `20260526002032_remove_persisted_inspection_signatures.sql` | Drops the persisted inspection signature surface: `signatures` table + `signature_status` enum, `inspector_signature` columns on `inspections` / `bobcat_inspections` / `excavator_inspections` / `general_equipment_inspections`, `signatories` JSONB on those four + `cargo_platform_inspections`, the older `cargo_platform_inspections.signatures` JSONB. Also deletes objects from the `signatures` storage bucket whose first path segment is not `expert` or `project`. Multi-device per-row signature blob removal inside other JSONB columns is left as commented opt-in SQL. **Apply manually after review** — Claude Code does not execute. |
| `20260527001240_unify_inspection_identity.sql` | Adds `type text NOT NULL` to `public.inspections` and backfills parent rows for every equipment-type table, so all 10 inspection variants share a parent row keyed by the same UUID. Shared tables (`inspection_attachments`, etc.) FK to `inspections.id` only. **Apply manually**. |
| `20260527001241_create_equipment_inspection_rpc.sql` | `create_equipment_inspection(p_type, p_id, p_project_id, p_user_id, p_template_id)` RPC — atomic parent-row insert (ON CONFLICT DO NOTHING) for new equipment inspections. SECURITY INVOKER, search_path pinned. **Apply manually**. |
| `20260527033302_inspections_type_default.sql` | Sets `public.inspections.type` default to `'harness'` so legacy code paths that insert a row without specifying `type` continue to work. |
| `20260527083000_overdue_counts_rpc.sql` | `get_overdue_counts()` RPC — returns one row per project_id with the count of overdue (latest_completed + 10 days < today) inspections + briefings. Backs the projects-list "⚠ N ვადაგადაცილებული" badge so the screen doesn't have to fetch all completed inspections + briefings + templates client-side. Adds composite indexes `idx_inspections_project_template_completed` and `idx_briefings_project_completed`. |
| `20260527091308_project_inspections_unified_rpc.sql` | `get_project_inspections_unified(project_id uuid)` RPC — single-query replacement for the 10 parallel per-type inspection fetches on the project-detail screen. After the identity-unification migration every equipment row has a parent in `public.inspections` tagged with `type`, so one SELECT returns id+source+template_id+status+created_at for every inspection. SECURITY INVOKER (RLS scopes results). Adds composite index `idx_inspections_project_created`. |
| `20260527120000_get_inspection_stats_rpc.sql` | `get_inspection_stats()` RPC — per-project draft/completed counts for the projects list. SECURITY INVOKER so RLS scopes results to the caller automatically. **Apply manually**. |
| `20260527150000_email_exists_rpc.sql` | `email_exists(p_email text)` RPC — boolean lookup of `auth.users`. Backs the login screen's distinct error messages ("wrong password" vs "no account") and the after-3-attempts password-reset prompt. SECURITY DEFINER (RLS hides `auth.users` from anon/authenticated). Deliberate user-enumeration trade-off accepted for modern login UX. Granted to `anon` so the unauthenticated login screen can call it. **Apply manually**. |

> Free-tier PDF limit: `increment_pdf_count` allows 30 free PDFs (intentional soft-launch setting). BOG payment is now live with production keys — tighten this limit when ready to enforce it. See [docs/payments.md](docs/payments.md).

### Storage buckets

`certificates`, `answer-photos`, `pdfs`, `signatures`, `incident-photos`, `report-photos`, `project-files`, `remote-signatures`.

---

## Conventions

### Adding cross-cutting helpers

Before adding a file in `lib/`, a wrapper in `components/`, or a new variant of an existing helper, read [docs/primitives.md](docs/primitives.md). The most common bug class in this repo is the same primitive reinvented in two or three places with different defaults. If a canonical owner exists and is wrong for your use case, fix the owner with an `opts` parameter rather than adding a sibling. After adding a primitive, add a row to `docs/primitives.md`; if misuse is grep-detectable, add a rule to `scripts/check-primitives.mjs`.

### Copy style guide (Georgian UI)

All in-app strings are inline (no i18n file). Keep the voice consistent:

| Rule | Decision |
|---|---|
| You-form | Polite `თქვენ` everywhere: `შეიყვანეთ`, `აირჩიეთ`, `დააჭირეთ`, `დაამატეთ`, `შეამოწმეთ`. Never `შეიყვანე` / `აირჩიე` / `დააჭირე` / `დაამატე` / `შეამოწმე`. |
| Email | `ელ-ფოსტა` (never `იმეილი`). |
| Inspection (noun) | `შემოწმების აქტი` (never `შემოწმება` / `ინსპექტირება` as the artifact noun). |
| To inspect (verb) | `შემოწმება` allowed only as the verbal action, not the noun for the artifact. |
| PDF artifact | `PDF რეპორტი` (not `PDF ანგარიში`). |
| Qualification credential | `კვალიფიკაციის სერტიფიკატი`; short form `სერტიფიკატი` only inside qualifications screens. |
| Project / Template / Signature / Scaffold / Harness | `პროექტი` / `შაბლონი` / `ხელმოწერა` / `ხარაჩო` / `ქამარი`. |
| No abbreviations | Don't shorten Georgian words (`გამოტოვ.` → `გამოტოვილი`). Weekday abbreviations may stay. |
| No English UI words | Inside Georgian copy, use Georgian (`Share` → `გაზიარება`). |
| `გთხოვთ` | OK for the formal register; don't sprinkle on every line, but don't strip either. |

Grep guard for regressions:

```sh
git grep -nE "იმეილი|გაიცანი |სცადე[^თ]|შეიყვანე[^თ]|აირჩიე[^თ]|დააჭირე[^თ]|დაამატე[^თ]|შეამოწმე[^თ]|არ ხარ\b" -- 'app/**' 'components/**'
```

---

## Known Issues

1. **Web build (`expo start --web`) worklets workaround.** `react-native-worklets@0.5.x` reads `globalThis.__RUNTIME_KIND` at module-init to decide native vs web mode, but seeds that global later in a different module — so on web the native path runs and crashes at boot ([reanimated#8285](https://github.com/software-mansion/react-native-reanimated/issues/8285)). Worked around with Metro `resolveRequest` aliases in [metro.config.js](metro.config.js) that redirect `react-native-worklets/.../PlatformChecker` and `react-native-keyboard-controller` to web stubs in [shims/](shims/). Auth on the web bundle currently cannot log in with iOS-simulator credentials — investigate before relying on web for QA.

2. **Offline queue is lost on uninstall.** Offline photo capture is queued under `documentDirectory/offline-photos/` and flushes on reconnect. If the user uninstalls the app before reconnecting, the queue is gone.

3. **PDF export is fast for typical cases but not instant.** Multi-photo reports went ~10× faster after the resize+cache pipeline landed (2026-04-30). A 30-photo inspection still takes a beat.

4. **Staging environment is mid-rollout (2026-06-17).** The mobile app, edge functions, and CI are now environment-aware (`app.config.ts` + `APP_ENV`, `db-and-functions.yml`, `deploy-web-app-staging.yml`), but the staging tier is not live yet — it is blocked on external steps: creating the second Supabase project + Apple App ID (`ge.sarke2.app.staging`), and configuring the GitHub `staging`/`production` Environments. (EAS account access was resolved on 2026-06-18 — the project moved into the shared `hubble-ge` Expo org.) The prod web workflows still use inline prod-credential fallbacks and must NOT be switched to GitHub Environments until those Environments exist. Full runbook + status: [docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md).

5. **Address geocoding uses public Nominatim (2026-06-18).** The project forms keep the address text and the map pin in sync via the public OpenStreetMap Nominatim HTTP API ([lib/geocode.ts](lib/geocode.ts)) — chosen so we don't re-add `expo-location` (the native location permission was dropped app-wide in 2026-06). Callers debounce + abort, but Nominatim is rate-limited (~1 req/s) and has no SLA; at higher volume, move to a self-hosted Nominatim or a keyed geocoding provider. Geocoding is best-effort — a miss never blocks creating/saving a project.
