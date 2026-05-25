# Sarke 2.0

Expo (React Native) app for occupational safety experts in Georgia. An expert creates a project, fills a checklist-style inspection on their phone, collects worker signatures, and generates a PDF report. All UI copy is in Georgian (ქართული).

There is also a public web dashboard ([`web-app/`](web-app/)) and a tokenized signing page ([`web/`](web/)) sharing the same Supabase backend.

**See also:** [docs/AI_BRIEFING.md](docs/AI_BRIEFING.md) for a working overview, [docs/WHATS_NEW.md](docs/WHATS_NEW.md) for recent changes, [docs/primitives.md](docs/primitives.md) for cross-cutting helpers, [docs/payments.md](docs/payments.md) for BOG payment flow, [CLAUDE.md](CLAUDE.md) for AI-session rules.

---

## Stack

- **Expo SDK 54** + expo-router (`~6.0.23`) — file-based routing.
- **React Native 0.81**, **React 19**.
- **New Architecture** (Fabric + TurboModules) enabled via `app.json`'s `newArchEnabled: true`; required by `react-native-reanimated@4.x`.
- **Supabase** (`@supabase/supabase-js ^2.58.0`) — Postgres + Auth + Storage. URL and anon key are baked into `app.json` → `expo.extra`.
- **`react-native-keyboard-controller`** — wired at the root via `<KeyboardProvider>`. Always import `KeyboardAvoidingView` / `KeyboardAwareScrollView` from this package, not from `react-native`.
- **`expo-image-picker`**, **`expo-document-picker`**, **`expo-print`**, **`expo-sharing`** — media + PDF generation.
- **`react-native-signature-canvas`** — signature capture.
- **`qrcode`** — inspection QR embedded in the PDF header (SVG data URL).
- **Sentry** — crash reporting via [lib/crashReporting.ts](lib/crashReporting.ts). Set `EXPO_PUBLIC_SENTRY_DSN` to enable; otherwise crashes log to console.

The native SwiftUI port lives on the [`ios-legacy`](https://github.com/gilavi/Sarke2.0/tree/ios-legacy) branch and is not maintained from `main`.

---

## Running Locally

```sh
npm install --legacy-peer-deps   # peer conflicts around Radix/React 19
npx expo start                   # Expo dev server
```

Scan the QR with **Expo Go**. Supabase credentials are in `app.json`.

### Lint + typecheck

```sh
npm run lint        # tsc --noEmit && scripts/check-primitives.mjs
npm run typecheck   # tsc only
```

`scripts/check-primitives.mjs` blocks grep-detectable misuses (bare `KeyboardAvoidingView` from `react-native`, legacy image helper names, direct `AsyncStorage` access to `pdf_language`). When adding a cross-cutting helper, read [docs/primitives.md](docs/primitives.md) first.

---

## Repository Layout

Top-level folders, one line each.

| Path | Purpose |
|---|---|
| `app/` | expo-router routes for the mobile app. Large flows (`inspections/[id]/wizard.tsx`, `orders/new.tsx`, `projects/[id].tsx`) are thin orchestrators that re-export from `features/`. Subfolders: `(auth)/`, `(tabs)/`, `projects/[id]/logs/` (breathalyzer log journal), `questionnaire/`, `template/`, `inspections/` (per-category screens: bobcat, excavator, cargo-platform, general-equipment, safety-net, mobile-ladder, fall-protection, forklift, lifting-accessories, plus generic `[id].tsx`). |
| `components/` | Shared RN components, organized as flat top-level files (`ProjectAvatar`, `BottomSheet`, `FlowHeader`, `SheetLayout`, …) plus domain folders (`ui/` primitives, `harness-list/`, `photo-annotator/`, `wizard/` + `wizard/kamari/`, `inspection-parts/`, `inspection-steps/`, `bobcat/`, `excavator/`, `cargoPlatform/`, `generalEquipment/`, `home/`, `icons/`, `inputs/`, `layout/`, `primitives/`, `projects/`, `qualifications/`, `animations/`) each with its own `AGENTS.md` documenting public API and gotchas. |
| `features/` | Feature-sliced modules. Each subfolder (`inspection-wizard/`, `order-new/`, `project-detail/`) owns a self-contained flow with its own `AGENTS.md`; `app/` route files delegate to the matching feature module. |
| `lib/` | Supabase client, session/auth provider, domain-split data services under `services/` (`real/<domain>.ts` + `mock/<domain>.ts`), theme, the schema-driven equipment-inspection PDF engine (`inspection/` — renderer, schemas, service factory, registry; see [docs/primitives.md](docs/primitives.md#inspection-pdf-engine)), domain-split order/inspection PDF templates under `pdf/order/` and `pdf/inspection/` (with `template.css.ts` siblings; the original `lib/orderPdf.ts` and `lib/inspectionPdfTemplate.ts` paths remain as re-export barrels), generic PDF template (`pdf.ts`), offline queue, `pdfGate.ts`, `pdfSecurity.ts`, `crashReporting.ts`, `photoLocationAlert.ts`, `sms.ts`, canonical keyboard hooks, and `shared/` — pure cross-platform helpers imported by **both** the Expo app and `web-app/` (currently `shared/documentName.ts`, the canonical document display-name logic; see [docs/primitives.md](docs/primitives.md#document-display-names-shared-with-web)). |
| `hooks/` | React hooks (e.g. `usePhotoWithLocation` for direct ImagePicker flows). |
| `utils/` | Stateless helpers (`location.ts` GPS + reverseGeocode, etc.). |
| `types/` | Shared TypeScript models (`models.ts`). |
| `assets/` | Fonts, images, icons bundled with the app. |
| `locales/` | UI strings (Georgian baseline). |
| `shims/` | Web stubs (worklets, keyboard-controller) loaded via `metro.config.js` aliases. |
| `scripts/` | Repo scripts including `check-primitives.mjs` (lint guard). |
| `supabase/` | `migrations/` SQL files (0001–0052; numbers 0044/0045/0046 are each used by two files — see Migrations note), `seed/` system templates, `functions/` Edge Functions, `.temp/` local CLI cache. |
| `docs/` | Project documentation — `AI_BRIEFING.md`, `WHATS_NEW.md`, `primitives.md`, `payments.md`, `design-system-audit-*.md`, `prompts/`. |
| `web/` | `sarke-sign` tokenized signing page (Vite + React). Deployed to `https://gilavi.github.io/Sarke2.0/`. |
| `web-app/` | Public dashboard (Vite + React + TS + Tailwind). Deployed to `https://gilavi.github.io/Sarke2.0/app/`. |
| `website/` | Docusaurus documentation site. Deployed via `.github/workflows/docs.yml`. |
| `public/` | Static assets for the web bundles. |
| `tests/` , `__tests__/` | Vitest unit tests (config in `vitest.config.ts`). |
| `e2e/` | Playwright end-to-end tests (config in `playwright.config.ts`). |
| `src/` | Misc shared sources used by the web bundles. |
| `ios/` | Native iOS scaffold (legacy reference; primary native port is on `ios-legacy` branch). |

GitHub Actions in `.github/workflows/`: `deploy-web.yml`, `deploy-web-app.yml`, `deploy-web-app-preview.yml`, `docs.yml`, `test.yml`.

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

Photo flows write GPS + reverse-geocoded address to `answer_photos` (migration 0023). `lib/photoLocationAlert.ts` auto-sets project coords on first photo and warns on >500 m mismatch.

---

## Web codebases

Two static bundles in this repo plus a Docusaurus site. None share code with the Expo mobile app — only Supabase.

| Path | Purpose | URL | Deploy workflow |
|---|---|---|---|
| `web/` (sarke-sign) | Tokenized signing page recipients open from an SMS link | `https://gilavi.github.io/Sarke2.0/` | `deploy-web.yml` |
| `web-app/` (dashboard) | Public dashboard with full BOG payment parity | `https://gilavi.github.io/Sarke2.0/app/` | `deploy-web-app.yml` (+ `-preview.yml` for PR previews under `/app/preview/`) |
| `website/` (Docusaurus) | Documentation site | published via `docs.yml` | `docs.yml` |

All three deploy to the same `gh-pages` branch under different `destination_dir` values; `keep_files: true` preserves the other trees.

**Don't change the base path of `web/`** — in-flight SMS links from `lib/sms.ts` + `supabase/functions/send-signing-sms/` would break.

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

### Migrations (`supabase/migrations/`)

> **Duplicate numbers:** `0044`, `0045`, `0046` each have **two files** — inspection tables from one branch and reports-RLS fixes from another, merged together. Both halves are applied to the hosted DB. **Do not renumber them** — it would desync the migration history. New migrations continue from `0052`.

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

> Migration `0028_pdf_usage_tracking.sql` and the free-tier limit are noted in memory — the function currently allows 30 free PDFs (soft-launch). Tighten when BOG payment is fully wired.

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

1. **Storage RLS gap (open).** Dashboard-created policies named `sarke_*_authenticated` on the `certificates`, `answer-photos`, `pdfs`, and `signatures` buckets gate only on `bucket_id = ANY(...)`. Any authenticated user can read or delete files in those buckets. They aren't in version control because they were created via the Supabase dashboard. `incident-photos` and `report-photos` were tightened in migration 0020; the rest still need owner-scoped policies. See `BUG_REPORT.md`.

2. **Web build (`expo start --web`) worklets workaround.** `react-native-worklets@0.5.x` reads `globalThis.__RUNTIME_KIND` at module-init to decide native vs web mode, but seeds that global later in a different module — so on web the native path runs and crashes at boot ([reanimated#8285](https://github.com/software-mansion/react-native-reanimated/issues/8285)). Worked around with Metro `resolveRequest` aliases in [metro.config.js](metro.config.js) that redirect `react-native-worklets/.../PlatformChecker` and `react-native-keyboard-controller` to web stubs in [shims/](shims/). Auth on the web bundle currently cannot log in with iOS-simulator credentials — investigate before relying on web for QA.

3. **Offline queue is lost on uninstall.** Offline photo capture is queued under `documentDirectory/offline-photos/` and flushes on reconnect. If the user uninstalls the app before reconnecting, the queue is gone.

4. **PDF export is fast for typical cases but not instant.** Multi-photo reports went ~10× faster after the resize+cache pipeline landed (2026-04-30). A 30-photo inspection still takes a beat.
