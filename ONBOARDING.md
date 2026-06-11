# Hubble — AI Onboarding Guide

> Complete context for any AI agent joining this codebase cold.
> Updated: 2026-05-25 | Branch: `main` (the `after-testflight` work has been merged into `main`; the branch should be considered historical)

---

## What This Project Is

Hubble is a **safety inspection platform** used by Georgian construction safety experts. It lets an expert create a project, conduct specialized equipment/safety inspections on their phone, collect digital signatures from workers, and generate legally formatted PDF reports in Georgian.

**Primary users:** safety experts (`expert` role) and workers who sign (`worker` / `signer_role`)  
**UI language:** Georgian (ქართული) — all strings are inline, no i18n file  
**Backend:** single Supabase project shared by all three codebases  
**Deployment:** GitHub Pages (gh-pages branch, static CI via GitHub Actions)

---

## Three Codebases

This repo contains three completely separate frontends that share only Supabase:

| Codebase | Path | URL | Purpose |
|---|---|---|---|
| **Mobile** | `/` (root) | Expo Go / TestFlight | Primary app — inspections, signatures, PDF export |
| **Dashboard** | `web-app/` | `https://gilavi.github.io/Sarke2.0/app/` | Web management dashboard (Vite + React) |
| **Signing page** | `web/` | `https://gilavi.github.io/Sarke2.0/` | Token-based signing page linked from SMS |

**They share no code** — features are re-implemented in each codebase independently. Mobile parity is not a goal for web-app.

---

## Tech Stack

### Mobile (Expo)
```
Expo SDK 54 + React Native 0.81 + React 19
New Architecture (Fabric + TurboModules) enabled
expo-router (file-based routing)
TypeScript
Supabase JS client
expo-print + expo-sharing      PDF export
expo-image-picker              photo capture
react-native-signature-canvas  signature capture
react-native-keyboard-controller  keyboard avoidance
```

### Web-App (dashboard)
```
Vite + React 19 + TypeScript + Tailwind CSS
shadcn/ui components
React Query (@tanstack/react-query)
React Router v6 (HashRouter)
Supabase JS client
```

### Web (signing page)
```
Vite + React + TypeScript
Hash routing (#/sign/<token>)
Do NOT change its base path — breaks in-flight SMS links
```

---

## Supabase Schema

52 migrations applied (0001–0052; numbers 0044/0045/0046 are each used by two files from merged branches — see [README.md migrations table](README.md#migrations-supabasemigrations)). Key tables:

| Table | Key columns | Purpose |
|---|---|---|
| `projects` | id, user_id, name, logo, location_lat/lng, contact_phone | Groups inspections |
| `inspections` | id, project_id, template_id, status, answers (jsonb), completed_at | Generic template-driven inspections |
| `templates` | id, name, category, is_system, required_qualifications | Questionnaire definitions |
| `signatures` | id, inspection_id, signer_name, role, image_path | Signed inspection signatures |
| `bobcat_inspections` | id, project_id, company, items (jsonb), verdict, signatures (jsonb) | Bobcat/large-loader inspection |
| `excavator_inspections` | id, project_id, company, sections (jsonb), verdict, signature (jsonb) | Excavator inspection |
| `general_equipment_inspections` | id, project_id, company, equipment (jsonb), verdict, signatures (jsonb) | Flexible equipment inspection |
| `cargo_platform_inspections` | id, project_id, company, platform_type_model, cargo (jsonb), items (jsonb), verdict, signatures (jsonb) | Cargo platform inspection (0040) |
| `orders` | id, project_id, document_type text, form_data jsonb, status | Safety appointment orders / ბრძანებები (0038) |
| `incidents` | id, project_id, description, photos (jsonb), created_at | Workplace incidents |
| `briefings` | id, project_id, topic, participants (jsonb), completed_at | Safety briefings |
| `reports` | id, project_id, content, created_at | Site reports |
| `answer_photos` | id, inspection_id, item_id, path, latitude, longitude | Photos taken during inspections |
| `users` | id, pdf_count, subscription_status, subscription_expires_at, bog_card_token | Extended user profile |
| `payment_records` | id, user_id, bog_order_id, status | BOG payment history |
| `qualifications` | id, user_id, name, image_path, expires_at | Expert credential certificates |

Storage buckets: `certificates`, `answer-photos`, `pdfs`, `signatures`, `incident-photos`, `report-photos`, `project-files`, `remote-signatures`

---

## Branch State

`main` is the only active branch. `after-testflight` was merged into `main` and the branch should be considered historical — do not modify from `main`. The `ios-legacy` branch holds the native SwiftUI port and is also not maintained from `main`.

Commit hashes rot quickly; run `git log --oneline -20` for the current state of `main` rather than relying on a snapshot here. Recent changes are tracked in [docs/WHATS_NEW.md](docs/WHATS_NEW.md).

---

## Feature Inventory

### Inspection Types

All inspection types route from a template picker. Specialized types have their own DB tables and wizard screens.

| Type | Category | DB Table | Mobile Screen | Web Page |
|---|---|---|---|---|
| Facade scaffolding | `facade` | `inspections` | generic wizard | `InspectionDetail.tsx` |
| Harness | `harness` | `inspections` | generic wizard | `InspectionDetail.tsx` |
| Mobile scaffold N1 | `mobile_scaffold` | `inspections` | generic wizard | `InspectionDetail.tsx` |
| Mobile scaffold N3 | `mobile_scaffold_n3` | `inspections` | generic wizard | `InspectionDetail.tsx` |
| Bobcat / Large Loader | `bobcat` | `bobcat_inspections` | `app/inspections/bobcat/[id].tsx` | `BobcatInspectionDetail.tsx` |
| Excavator | `excavator` | `excavator_inspections` | `app/inspections/excavator/[id].tsx` | `ExcavatorInspectionDetail.tsx` |
| General equipment | `general_equipment` | `general_equipment_inspections` | `app/inspections/general-equipment/[id].tsx` | `GeneralEquipmentInspectionDetail.tsx` |
| Cargo platform | `cargo_platform` | `cargo_platform_inspections` | `app/inspections/cargo-platform/[id].tsx` | `CargoPlatformInspectionDetail.tsx` |

Template UUIDs: bobcat `33333333-…`, large loader `44444444-…`, excavator `55555555-…`, general equipment `66666666-…`, cargo platform `77777777-…`.

### Orders / ბრძანებები System

Safety appointment orders. Added in migration 0038. No custom table per type — a single `orders` table with `document_type text` and `form_data jsonb`.

| Document Type | Georgian Label | Extra Fields |
|---|---|---|
| `labor_safety_specialist` | შრომის უსაფრთხოების სპეციალისტის დანიშვნა | specialistName, certificateNumber |
| `alcohol_control` | ალკოჰოლური და ნარკოტიკული თრობის კონტროლი | responsiblePersonName, responsiblePersonPosition |
| `fire_safety_order` | სახანძრო უსაფრთხოებაზე პასუხისმგებელი პირის დანიშვნა | appointedName, appointedPhone; 2-signatory signing flow |
| `fire_safety_order_enterprise` | საწარმოს სახანძრო უსაფრთხოებაზე პასუხისმგებელი პირის დანიშვნა | + appointedPosition, appointedIdNumber; 5-clause enterprise template |

Mobile flow: `app/orders/new.tsx` (wizard), `app/orders/[id].tsx` (success screen)  
Web flow: `web-app/src/pages/NewOrder.tsx` (wizard), `web-app/src/pages/OrderDetail.tsx` (view + sign)

**Signing flow** (fire safety variants only): director signs first → appointed person signs → status becomes `completed`. Signatures stored as base64 PNG in `form_data.directorSignature` / `appointedSignature` (not in the `signatures` table).

### PDF Generation Pipeline

**Mobile:**
- All equipment inspections (bobcat, excavator, general-equipment, cargo-platform, safety-net, mobile-ladder, fall-protection, forklift, lifting-accessories) route through the shared schema-driven engine in `lib/inspection/` (per-type descriptors in `lib/inspection/schemas/`). See [docs/primitives.md → Inspection PDF engine](docs/primitives.md#inspection-pdf-engine).
- Orders: domain-split under `lib/pdf/order/` (one file per doctype: `laborSafety`, `alcoholControl`, `fireSafety`, `fireSafetyEnterprise`, `craneOperator`, `craneTechnical`). `lib/orderPdf.ts` is a re-export barrel.
- Generic / harness inspection template: domain-split under `lib/pdf/inspection/` (`template.ts` for structure, `template.css.ts` for CSS). `lib/inspectionPdfTemplate.ts` is a re-export barrel.
- Legacy shared utilities: `lib/pdfShared.ts` (`embedInspectionPhotos`, `escHtml`, `fmtDate`) — retained only for `lib/breathalyzerLogPdf.ts`; do not use for new inspection PDFs.
- Security: `lib/pdfSecurity.ts` (sha256 hash stored in DB)
- Entry: `lib/pdfOpen.ts` → `generateAndSharePdf()` → `expo-print` + `expo-sharing`
- Paywall: `lib/pdfGate.ts` (`checkAndIncrementPdfCount`) → 30 free PDFs via `increment_pdf_count` RPC

**Web:**
- Orders PDF: `web-app/src/lib/orderPdf.ts` (HTML builders, `openOrderPdfPreview` opens in new tab)
- Inspection print pages: `web-app/src/pages/print/` (static A4 HTML via `A4_PRINT_STYLES`)
- Paywall: `web-app/src/lib/pdfGate.ts` (mirrors mobile)

### Signatures

Three different signature patterns in this codebase:

1. **Inspection signatures** — Canvas on mobile, stored as image file in `signatures` bucket, path in `signatures` table
2. **Briefing in-person signing** — Phone-passing flow in `app/briefings/[id]/sign.tsx`; each worker signs on the same device sequentially
3. **Order signatures** (fire safety) — Canvas on mobile/web, stored as base64 PNG directly in `orders.form_data`

### BOG Payments (Recurring)

Georgian payment processor. Mobile + web parity.
- Edge function: `create-bog-order` (creates recurring order, returns redirect URL)
- Edge function: `bog-webhook` (receives status callbacks, updates `payment_records` + `users`)
- Mobile: `lib/bogPayment.ts` → `useBogPayment()` hook
- Web: `web-app/src/lib/bogPayment.ts` + `/subscribe`, `/subscribe/success`, `/subscribe/fail` routes
- See `docs/payments.md` for end-to-end flow

### Web Dashboard Pages

`web-app/src/pages/`:

| Route | Page | Purpose |
|---|---|---|
| `/` | `Home.tsx` | Stat cards + recent inspections + subscription status |
| `/projects` | `Projects.tsx` | Project list |
| `/projects/:id` | `ProjectDetail.tsx` | Project overview + all sub-items |
| `/inspections` | `Inspections.tsx` | Unified inspection list across all types |
| `/inspections/new` | `NewInspection.tsx` | Template picker for generic inspections |
| `/inspections/:id` | `InspectionDetail.tsx` | Generic inspection view/edit |
| `/bobcat/new` | `NewBobcatInspection.tsx` | Create bobcat inspection |
| `/bobcat/:id` | `BobcatInspectionDetail.tsx` | Bobcat inspection view/edit |
| `/excavator/new` | `NewExcavatorInspection.tsx` | Create excavator inspection |
| `/excavator/:id` | `ExcavatorInspectionDetail.tsx` | Excavator view/edit |
| `/general-equipment/new` | `NewGeneralEquipmentInspection.tsx` | Create general equipment inspection |
| `/general-equipment/:id` | `GeneralEquipmentInspectionDetail.tsx` | General equipment view/edit |
| `/cargo-platform/new` | `NewCargoPlatformInspection.tsx` | Create cargo platform inspection |
| `/cargo-platform/:id` | `CargoPlatformInspectionDetail.tsx` | Cargo platform view/edit |
| `/orders/new` | `NewOrder.tsx` | Order wizard (4 document types, 4–6 steps) |
| `/orders/:id` | `OrderDetail.tsx` | Order view + signature collection |
| `/briefings` | `Briefings.tsx` | Briefing list |
| `/briefings/:id` | `BriefingDetail.tsx` | Briefing view |
| `/incidents` | `Incidents.tsx` | Incident list |
| `/incidents/:id` | `IncidentDetail.tsx` | Incident view |
| `/reports` | `Reports.tsx` | Report list |
| `/reports/:id` | `ReportDetail.tsx` | Report view |
| `/templates` | `Templates.tsx` | Template list |
| `/certificates` | `Certificates.tsx` | Certificate list |
| `/qualifications` | `Qualifications.tsx` | Qualification list |
| `/safety` | `SafetyGuidePage.tsx` | 3D interactive construction safety guide |
| `/account` | `Account.tsx` | Subscription management |
| `/subscribe` | `Subscribe.tsx` | BOG payment initiation |

---

## Key Conventions

### Georgian Language Rules

All UI strings are inline Georgian. No i18n file.

| Term | Georgian | Never use |
|---|---|---|
| Inspection artifact | შემოწმების აქტი | შემოწმება, ინსპექტირება (as nouns) |
| Email | ელ-ფოსტა | იმეილი |
| PDF artifact | PDF რეპორტი | PDF ანგარიში |
| Qualification credential | კვალიფიკაციის სერტიფიკატი | — |
| Scaffold | ხარაჩო | — |
| Harness | ქამარი | — |

**Polite form always:** `შეიყვანეთ`, `აირჩიეთ`, `დააჭირეთ`, `დაამატეთ`, `შეამოწმეთ`  
Never informal: `შეიყვანე`, `აირჩიე`, `დააჭირე`

### Folder & File Conventions

- Mobile screens: `app/<feature>/[id].tsx` or `app/<feature>/new.tsx`
- Specialized inspection screens: `app/inspections/<category>/[id].tsx`
- Web pages: `web-app/src/pages/<PageName>.tsx` (PascalCase)
- Web data layer: `web-app/src/lib/data/<feature>.ts`
- Mobile services: `lib/<feature>Service.ts` or `lib/<feature>Api.ts`
- Mobile types: `types/<feature>.ts` (for complex types) or `types/models.ts` (shared DB types)

### Primitive Utilities (read `docs/primitives.md` before adding anything)

| Utility | File | Purpose |
|---|---|---|
| Keyboard (regular screens) | `components/KeyboardSafeArea.tsx` | Wraps content, handles keyboard avoidance |
| Keyboard (bottom sheets) | `lib/useSheetKeyboardMargin.ts` | Hook for modal-based sheets |
| Image for display | canonical helper in `lib/` | Do not add new image helpers |
| Photo picking | `hooks/usePhotoPicker.ts` | ImagePicker flows (geotagging removed 2026-06) |
| PDF embed photo | `lib/pdfShared.ts` → `embedInspectionPhotos` | Resizes + base64 encodes for PDF |
| Storage bucket names | `STORAGE_BUCKETS` constant | Never hardcode bucket strings |

**`npm run lint` = `tsc --noEmit` + `scripts/check-primitives.mjs`**. The primitives check blocks known misuses (bare `KeyboardAvoidingView` from react-native, wrong image helper names, direct AsyncStorage access to `pdf_language`).

### Keyboard Handling (3 patterns — use the right one)

1. **Regular screens** → `<KeyboardSafeArea headerHeight={N}>` (pass `44` if `<FlowHeader>` above)
2. **Modal-based bottom sheets** → `useSheetKeyboardMargin()` on the card's `Animated.View`; do NOT also wrap in KAV
3. **Inside `BottomSheetProvider`** → nothing needed; `<SheetLayout>` handles it

Import `KeyboardAvoidingView` and `KeyboardAwareScrollView` from `react-native-keyboard-controller`, never from `react-native`.

---

## Development Workflow

```sh
# Mobile
npm install --legacy-peer-deps   # peer conflicts around Radix/React 19
npx expo start                   # Expo dev server

# Web dashboard
cd web-app && npm install && npm run dev   # http://localhost:5173/Sarke2.0/app/

# Lint (run before committing)
npm run lint                     # tsc + check-primitives.mjs

# Deploy (CI, don't run manually)
# deploy-web.yml    → web/ to gh-pages/
# deploy-web-app.yml → web-app/ to gh-pages/app/
# keep_files: true preserves both trees
```

**Before every commit:**
1. `npm run lint` — note new failures, don't add to them
2. Update docs in the same commit (see CLAUDE.md for rules)
3. Update `docs/reports/BUG_REPORT.md` if fixing a listed bug

---

## For AI — Where to Find Things

| You want to… | Look here |
|---|---|
| Understand data models | `types/models.ts` |
| Understand cargo platform types | `types/cargoPlatform.ts` |
| Understand order document types | `web-app/src/lib/data/orders.ts` (web) or `types/models.ts` (mobile) |
| See all DB tables | `supabase/migrations/` — read chronologically |
| See how mobile inspection data is fetched | `lib/<feature>Service.ts` (e.g. `lib/bobcatService.ts`) |
| See how web inspection data is fetched | `web-app/src/lib/data/<feature>.ts` |
| See inspection routing logic | `lib/inspectionRouting.ts` |
| Understand the PDF pipeline | `lib/pdfShared.ts` + `lib/<type>Pdf.ts` |
| See web PDF generation | `web-app/src/lib/orderPdf.ts` |
| Understand the payment gate | `lib/pdfGate.ts` (mobile) or `web-app/src/lib/pdfGate.ts` |
| Understand BOG payments | `lib/bogPayment.ts` + `docs/payments.md` |
| See all web routes | `web-app/src/App.tsx` |
| See mobile routing | `app/_layout.tsx` + expo-router file convention |
| See signature flow for orders | `app/orders/new.tsx` (step 4/5) + `web-app/src/pages/OrderDetail.tsx` |
| Find Georgian copy rules | `README.md` → Copy Style Guide section |
| Find known bugs | `docs/reports/BUG_REPORT.md` |

---

## For AI — Common Task Recipes

### Add a new inspection type (specialized, own table)

> **Read [docs/primitives.md → Inspection PDF engine](docs/primitives.md#inspection-pdf-engine) first.** All equipment types now go through the shared `lib/inspection/` engine — don't hand-roll a `lib/<name>Pdf.ts` builder or a `lib/<name>Service.ts` CRUD module; add a schema and use the factory. The steps below predate the engine and remain only as a rough template for the surrounding glue (migration, types, screen, routing); the **PDF builder** and **CRUD service** steps in particular should be replaced by a single schema descriptor + `makeInspectionService(...)`.

1. Write migration `supabase/migrations/XXXX_<name>.sql` — table + RLS + updated_at trigger + template INSERT
2. Create `types/<name>.ts` — types + constants (mirror `types/cargoPlatform.ts`)
3. Add a schema descriptor at `lib/inspection/schemas/<name>.ts` and register it in `lib/inspection/registry.ts` — this replaces the legacy `lib/<name>Pdf.ts` step. The service is built via `makeInspectionService(...)` rather than a hand-written `lib/<name>Service.ts`.
4. Create `app/inspections/<category>/[id].tsx` — wizard screen
5. Update `lib/inspectionRouting.ts` — add category → path mapping
6. Update `app/projects/[id].tsx` — add query + createInspection branch
7. Update `app/(tabs)/home.tsx` — add to unified inspection list
8. Web: create `web-app/src/lib/data/<name>.ts`, `features/inspections/equipment/<Name>Detail.tsx` (uses `useEquipmentDetail`), optional print page. See [primitives.md → Web dashboard equipment inspection detail](docs/primitives.md#web-dashboard-equipment-inspection-detail-web-app).
9. Web: add routes to `web-app/src/app/router.tsx`
10. Web: update `web-app/src/pages/Inspections.tsx` — add to list + dropdown
11. Web: update `web-app/src/pages/Templates.tsx` — add category label

### Add a new order document type

1. Add to `OrderDocumentType` union in `types/models.ts` and `web-app/src/lib/data/orders.ts`
2. Add `FormData` interface for new type
3. Add label to `ORDER_DOCUMENT_TYPE_LABEL` in both files
4. Add `buildXHtml()` function to `lib/orderPdf.ts` (mobile) and `web-app/src/lib/orderPdf.ts` (web)
5. Update `app/orders/new.tsx` — add doc type option + form step + `buildFormData()` case
6. Update `web-app/src/pages/NewOrder.tsx` — same additions
7. Update `web-app/src/pages/OrderDetail.tsx` — add info rows for new fields
8. No migration needed — `document_type` is plain `text`, `form_data` is `jsonb`

### Add a skeleton loading state to a web page

Use `SkeletonCard.tsx` exports in `web-app/src/components/`:
- `SkeletonList` — for list pages with rows
- `SkeletonGrid` — for card-grid pages (Projects, Templates)
- `SkeletonStatCard` — for stat cards on Home
- `SkeletonDetailPage` — for any detail/edit page

Replace `if (isLoading) return <p>იტვირთება…</p>` with the appropriate skeleton.

### Fix a bug

1. Find the entry in `docs/reports/BUG_REPORT.md`
2. Fix the code
3. Mark it resolved in `docs/reports/BUG_REPORT.md` with date + commit ref — do not delete the entry
4. Include the `docs/reports/BUG_REPORT.md` update in the same commit

---

*This document covers both `main` and `after-testflight` branches. Do not merge them — they serve different deployment states. The uncommitted session work (fire safety enterprise orders, enterprise web forms) lives on top of `after-testflight`.*
