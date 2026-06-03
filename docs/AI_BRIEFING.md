# AI Agent Briefing — Hubble

**Purpose:** Quick reference for AI agents working on this codebase  
**Updated:** 2026-05-27 | Branch: `main`  
**Full context:** See [`ONBOARDING.md`](../ONBOARDING.md) in the repo root for the complete guide.

---

## Core Facts

**Project Type:** Expo (React Native) mobile inspection app + two web codebases  
**Primary Language:** Georgian (ქართული) UI — all strings inline, no i18n file  
**Target Users:** Safety experts conducting equipment/scaffolding inspections on Georgian construction sites  
**Backend:** Supabase (Postgres + Auth + Storage) — single project shared by all three frontends  
**Architecture:** Feature-sliced. Modules live in `features/<name>/` with co-located `AGENTS.md` per folder; `app/` route files for large flows are thin orchestrators that re-export from `features/`.  
**Account deletion:** Implemented end-to-end via Edge Function `delete-account` + `ON DELETE CASCADE` FKs on all user-owned tables. App Store Review Guideline 5.1.1(v) compliant on the data-deletion axis.
**Marketing site (`web-app/`):** The logged-out landing is a multi-page marketing site (`/`, `/about`, `/pricing`, `/legislation`, `/contact`) sharing one `MarketingLayout`; logged-in users redirect to `/home`. `/legislation` is the PUBLIC regulations/blog page — distinct from the PROTECTED `/regulations` dashboard route. The `/contact` page has a live AI support chatbot backed by the `ai-chat` Edge Function (Anthropic Haiku proxy, `verify_jwt = false`, needs the `ANTHROPIC_API_KEY` secret + manual `supabase functions deploy ai-chat`).
**Function search_path:** All public Postgres functions have `SET search_path = public, pg_catalog`. Functions invoked from `auth.admin` operations run with restricted search_path and fail to resolve unqualified public-schema types without this pin — see migration `supabase/migrations/20260525180000_pin_function_search_paths.sql` for the precedent and the bug it fixed.
**Signatures:** Single unified flow on the **inspection result screen** (post-completion). One creator signature (captured digitally, never persisted) + N empty hand-sign slots rendered in the PDF for printed-page signing. Captured base64 lives in component state only — never to Supabase storage, any DB column, AsyncStorage, MMKV, SecureStore, or the file system. See [`features/signatures/AGENTS.md`](../features/signatures/AGENTS.md) and the cleanup migration `supabase/migrations/20260526002032_remove_persisted_inspection_signatures.sql`.
**Inspection identity:** All 10 inspection types share a parent row in `public.inspections` (keyed by UUID, `type` column tags the variant). Equipment-specific data lives in `<type>_inspections` with FK to the parent (ON DELETE CASCADE). Shared tables (`inspection_attachments`, etc.) FK to `inspections.id` only. New equipment creates go through the `create_equipment_inspection` RPC for the parent row + a regular insert for the equipment row. Migrations `20260527001240_unify_inspection_identity.sql` + `20260527001241_create_equipment_inspection_rpc.sql` (pending manual apply).
**Source:** https://github.com/gilavi/Sarke2.0

---

## Technology Stack

```
Mobile:
├─ Expo SDK 54 + React Native 0.81 + React 19
├─ New Architecture (Fabric + TurboModules) — enabled
├─ expo-router (file-based routing)
├─ TypeScript
├─ react-native-signature-canvas (signatures)
├─ expo-print + expo-sharing (PDF export)
├─ expo-image-picker (photo capture)
└─ react-native-keyboard-controller (keyboard management)

Web-App (dashboard):
├─ Vite + React 19 + TypeScript + Tailwind CSS
├─ Radix UI (shadcn-style primitives), React Query, React Router v6 HashRouter
├─ three.js + @react-three/fiber (3D SafetyGuide), Leaflet (maps), Recharts
└─ Supabase JS client

Web (signing page):
├─ Vite + React + TypeScript
└─ Hash routing — do NOT change base path (breaks SMS links)
```

---

## Branch State

- **`main`** — active development branch. Web deploys (`deploy-web.yml`, `deploy-web-app.yml`, `docs.yml`) trigger on push to `main`, so **a commit here ships to production**.
- **`ios-legacy`** — native SwiftUI iOS port. Not maintained from `main`; don't modify it from here.

> Don't pin commit hashes in this doc — they rot immediately. Run `git log --oneline -20` for current state.

---

## Directory Structure

```
Hubble/
├── app/                              # expo-router routes (mobile)
│   ├── (auth)/                       # login, register, forgot, reset
│   ├── (tabs)/                       # home, projects, regulations, more
│   ├── projects/[id]/                # project detail + signer
│   ├── inspections/
│   │   ├── [id].tsx                  # Inspection result screen (WebView PDF)
│   │   ├── bobcat/[id].tsx           # Bobcat/Large Loader wizard
│   │   ├── excavator/[id].tsx        # Excavator wizard
│   │   ├── general-equipment/[id].tsx
│   │   ├── cargo-platform/[id].tsx   # Cargo platform wizard
│   │   ├── safety-net/[id].tsx           # Safety net wizard (multi-device)
│   │   ├── mobile-ladder/[id].tsx        # Mobile ladder wizard (multi-device)
│   │   ├── fall-protection/[id].tsx      # Fall protection wizard (multi-device, 4-state checklist)
│   │   ├── forklift/[id].tsx             # Forklift wizard (3-step, 39 items, extended sig)
│   │   └── lifting-accessories/[id].tsx  # Lifting accessories wizard (multi-device)
│   ├── orders/
│   │   ├── new.tsx                   # Order creation wizard (4 document types)
│   │   └── [id].tsx                  # Order success screen
│   ├── briefings/, incidents/, reports/
│   └── _layout.tsx
│
├── components/                       # Shared UI + feature components
├── lib/                              # Services, PDF builders, utilities
│   ├── inspection/                   # Shared schema-driven inspection PDF engine
│   │   ├── pdf.ts / renderMobile.ts  # synchronous renderer + mobile photo wrapper
│   │   ├── schema.ts / pdfStyles.ts  # InspectionSchema<T> + BASE_PDF_CSS
│   │   └── schemas/                  # per-type descriptors (excavator, forklift, generalEquipment, cargoPlatform, …)
│   ├── bobcatService.ts
│   ├── excavatorService.ts
│   ├── generalEquipmentService.ts
│   ├── cargoPlatformService.ts
│   ├── orderPdf.ts                   # 4 order PDF builders
│   ├── pdfShared.ts                  # embedInspectionPhotos, escHtml, fmtDate
│   ├── pdfSecurity.ts / pdfGate.ts
│   ├── bogPayment.ts
│   └── inspectionRouting.ts
│
├── types/
│   ├── models.ts                     # All DB types + OrderDocumentType + OrderFormData
│   ├── cargoPlatform.ts              # CP_ITEMS, CPResult, CargoPlatformInspection
│   ├── safetyNet.ts                  # SN_ITEMS, SNResult, SafetyNetInspection
│   ├── mobileLadder.ts               # ML_ITEMS, MLResult, MobileLadderInspection
│   ├── fallProtection.ts             # FP_CHECKLIST_ITEMS, FPResult, FallProtectionInspection
│   ├── forklift.ts                   # FORKLIFT_ITEMS, ForkliftResult, ForkliftInspection
│   └── liftingAccessories.ts         # LA_ITEMS, LAResult, LiftingAccessoriesInspection
│
├── supabase/migrations/              # 0001–0053 + timestamp-prefixed migrations from 2026-05-25 onward; NOTE duplicate-numbered files at 0044/0045/0046 (branch merge)
│
├── web-app/                          # Dashboard + public marketing site (Vite + React)
│   └── src/
│       ├── pages/                    # 35+ page components
│       ├── pages/landing/            # Multi-page marketing site sections (Home/About/Pricing/Legislation/Contact); MarketingLayout wraps them with shared navbar/footer/overlays
│       ├── features/inspections/     # equipment detail engine (useEquipmentDetail + shared widgets)
│       ├── lib/data/                 # Data layer (one file per entity); ai-chat.ts → ai-chat Edge Function
│       └── components/              # UI components incl. SkeletonCard.tsx, marketing/ChatWidget.tsx
│
├── web/                              # Signing page (Vite + React)
│
├── ONBOARDING.md                     # Full AI guide (read this first)
├── CLAUDE.md                         # Dev workflow rules
├── README.md                         # Project overview
├── BUG_REPORT.md                     # Known issues + resolutions
└── docs/
    ├── AI_BRIEFING.md                # This file
    ├── WHATS_NEW.md                  # Changelog
    ├── primitives.md                 # Canonical helpers — read before adding new ones
    └── payments.md                   # BOG payment end-to-end flow
```

---

## Orders / ბრძანებები System

Single `orders` table (`document_type text`, `form_data jsonb` — no per-type tables, no CHECK constraint on type).

| Type key | Label | Signing |
|---|---|---|
| `labor_safety_specialist` | შრომის უსაფრთხოების სპეციალისტის დანიშვნა | none |
| `alcohol_control` | ალკოჰოლური და ნარკოტიკული თრობის კონტროლი | none |
| `fire_safety_order` | სახანძრო უსაფრთხოებაზე პასუხისმგებელი პირის დანიშვნა | 2-sig (director → appointed) |
| `fire_safety_order_enterprise` | საწარმოს სახანძრო უსაფრთხოებაზე... | 2-sig + position + ID number |

---

## Key Inspection Types

| Category | DB Table | UUIDs | Wizard |
|---|---|---|---|
| Generic (facade, harness, scaffold) | `inspections` | system templates seeded | `app/inspections/[id].tsx` |
| `bobcat` | `bobcat_inspections` | 33333333 / 44444444 | `app/inspections/bobcat/[id].tsx` |
| `excavator` | `excavator_inspections` | 55555555 | `app/inspections/excavator/[id].tsx` |
| `general_equipment` | `general_equipment_inspections` | 66666666 | `app/inspections/general-equipment/[id].tsx` |
| `cargo_platform` | `cargo_platform_inspections` | 77777777 | `app/inspections/cargo-platform/[id].tsx` |
| `safety_net_inspection` | `safety_net_inspections` | 88888888 | `app/inspections/safety-net/[id].tsx` |
| `mobile_ladder_inspection` | `mobile_ladder_inspections` | bbbbbbbb | `app/inspections/mobile-ladder/[id].tsx` |
| `fall_protection_inspection` | `fall_protection_inspections` | cccccccc | `app/inspections/fall-protection/[id].tsx` — 4-state checklist (✓/✗/Z/N) |
| `lifting_accessories_inspection` | `lifting_accessories_inspections` | aaaaaaaa | `app/inspections/lifting-accessories/[id].tsx` |
| `forklift_inspection` | `forklift_inspections` | dddddddd | `app/inspections/forklift/[id].tsx` — 39-item checklist, 13-row summary, extended signature |

### Project selection (no in-flow project step)
Equipment inspections are created **with a project already attached** (DB
`project_id` is `NOT NULL`), so there's no in-flow project-pick step. Launching
**from a project** creates the row immediately and opens on the first real step.
Launching **from Home** routes to `app/inspections/new.tsx` — a lightweight
screen where project selection is the first full-screen step; it creates the row
lazily once a project is chosen (via `lib/inspection/registry.ts`), then
`router.replace`s into the real flow. Multi-item flows (fall-protection devices,
harnesses) share `components/inspection-parts/ChipNavStrip` for jump-navigation
between sub-items.

---

## Workflow Rules (from CLAUDE.md)

- Always update docs in the **same commit** as code changes
- Run `npm run lint` before committing (tsc + check-primitives.mjs)
- Read `docs/primitives.md` before adding any new `lib/` file or component wrapper
- Fix the canonical primitive instead of adding a sibling
- Mark bugs resolved in `BUG_REPORT.md` — never delete entries

---

## Georgian Localization Rules

**All UI strings are inline Georgian. Do not translate.**

Polite form always: `შეიყვანეთ`, `აირჩიეთ`, `დააჭირეთ`, `დაამატეთ`, `შეამოწმეთ`

| Term | Georgian |
|---|---|
| Inspection artifact | შემოწმების აქტი |
| Email | ელ-ფოსტა |
| PDF artifact | PDF რეპორტი |
| Scaffold | ხარაჩო |
| Harness | ქამარი |

---

## Development Commands

```bash
# Mobile
npm install --legacy-peer-deps
npx expo start

# Web dashboard
cd web-app && npm install && npm run dev   # localhost:5173/Sarke2.0/app/

# Lint
npm run lint        # tsc --noEmit + check-primitives.mjs
```

---

## Common Pitfalls

| Pitfall | Solution |
|---|---|
| Adding a new `KeyboardAvoidingView` | Import from `react-native-keyboard-controller`, not `react-native`. Use `KeyboardSafeArea` wrapper. |
| Adding a new image helper | Read `docs/primitives.md`. Fix the canonical owner. |
| Hardcoding a storage bucket name | Use `STORAGE_BUCKETS` constant |
| Adding a new order type | No migration needed — `document_type` is plain text, `form_data` is jsonb |
| Forgetting signature base64 prefix | Order signatures strip `data:image/png;base64,` before storing; re-add it for `<img src>` |
| Typecheck failing | Expected. See CLAUDE.md. Note new failures but don't block on them. |
| Adding page transitions in `AppShell` | Keep `<AnimatePresence mode="wait" initial={false}>`. Never branch with two `motion.div`s sharing the same `key` — exits never reconcile and the DOM accumulates one ghost copy per navigation (BUG-20, fixed 2026-05-26). One `motion.div` per `AnimatePresence`; vary props with conditionals, not separate elements. |
| Scaffold vs harness in inspections-table rows | The `inspections` table holds 4 categories (`harness`, `xaracho`, `mobile_scaffold`, `mobile_scaffold_n3`). Always read `template[0]?.category` from the joined `template:templates(category)` to set the row type — hardcoding `'harness'` (or `'inspection'`) gives every scaffold row a harness badge. Pattern in `History.tsx`, `Inspections.tsx`, `InspectionsSection.tsx`, `ProjectActivityWidget.tsx`. |
| Empty-state flashes on a screen the user has data on | Use `(q.isFetching \|\| !q.isFetched) && data.length === 0` for the skeleton guard, not `q.isLoading` or `q.isPending`. `isLoading` only covers the *very first* fetch and skips background refetches replacing a stale `[]`. For user-scoped queries also add a `staleTime: 0` prefetch in `lib/session.tsx` so a racy empty value from a previous boot can't outlive login. See `app/(tabs)/home.tsx`, `app/(tabs)/projects.tsx` for the canonical wiring, and BUG_REPORT.md ("Home shows empty projects after first login"). |

---

**Full context → [`ONBOARDING.md`](../ONBOARDING.md)**  
**Last sync:** 2026-05-27
