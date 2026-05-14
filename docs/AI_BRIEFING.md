# AI Agent Briefing — Sarke 2.0

**Purpose:** Quick reference for AI agents working on this codebase  
**Updated:** 2026-05-14 | Branch: `after-testflight` (1 commit ahead of `main`)  
**Full context:** See [`ONBOARDING.md`](../ONBOARDING.md) in the repo root for the complete guide.

---

## Core Facts

**Project Type:** Expo (React Native) mobile inspection app + two web codebases  
**Primary Language:** Georgian (ქართული) UI — all strings inline, no i18n file  
**Target Users:** Safety experts conducting equipment/scaffolding inspections on Georgian construction sites  
**Backend:** Supabase (Postgres + Auth + Storage) — single project shared by all three frontends  
**Source:** https://github.com/gilavi/Sarke2.0

---

## Technology Stack

```
Mobile:
├─ Expo SDK 55 + React Native 0.81 + React 19
├─ expo-router (file-based routing)
├─ TypeScript
├─ react-native-signature-canvas (signatures)
├─ expo-print + expo-sharing (PDF export)
├─ expo-image-picker (photo capture)
└─ react-native-keyboard-controller (keyboard management)

Web-App (dashboard):
├─ Vite + React 18 + TypeScript + Tailwind CSS
├─ shadcn/ui, React Query, React Router v6 HashRouter
└─ Supabase JS client

Web (signing page):
├─ Vite + React + TypeScript
└─ Hash routing — do NOT change base path (breaks SMS links)
```

---

## Branch State

| Branch | HEAD | Content |
|---|---|---|
| `main` | be46348 | BOG payments, 3D SafetyGuide, PDF security/hashing, project geo+photos, orders (4 templates), tab bar polish, web bundle splitting |
| `after-testflight` | f80a372 | All of main + cargo platform inspection (mobile + web), mobile scaffold N1/N3, skeleton loading system |
| **Session work** (uncommitted, on after-testflight) | — | fire_safety_order + fire_safety_order_enterprise templates; web orders wizard + detail extended for enterprise type |

---

## Directory Structure

```
Sarke 2.0/
├── app/                              # expo-router routes (mobile)
│   ├── (auth)/                       # login, register, forgot, reset
│   ├── (tabs)/                       # home, projects, regulations, more
│   ├── projects/[id]/                # project detail + signer
│   ├── inspections/
│   │   ├── [id].tsx                  # Inspection result screen (WebView PDF)
│   │   ├── bobcat/[id].tsx           # Bobcat/Large Loader wizard
│   │   ├── excavator/[id].tsx        # Excavator wizard
│   │   ├── general-equipment/[id].tsx
│   │   └── cargo-platform/[id].tsx   # Cargo platform wizard (after-testflight)
│   ├── orders/
│   │   ├── new.tsx                   # Order creation wizard (4 document types)
│   │   └── [id].tsx                  # Order success screen
│   ├── briefings/, incidents/, reports/
│   └── _layout.tsx
│
├── components/                       # Shared UI + feature components
├── lib/                              # Services, PDF builders, utilities
│   ├── bobcatService.ts / bobcatPdf.ts
│   ├── excavatorService.ts / excavatorPdf.ts
│   ├── generalEquipmentService.ts / generalEquipmentPdf.ts
│   ├── cargoPlatformService.ts / cargoPlatformPdf.ts
│   ├── orderPdf.ts                   # 4 order PDF builders
│   ├── pdfShared.ts                  # embedInspectionPhotos, escHtml, fmtDate
│   ├── pdfSecurity.ts / pdfGate.ts
│   ├── bogPayment.ts
│   └── inspectionRouting.ts
│
├── types/
│   ├── models.ts                     # All DB types + OrderDocumentType + OrderFormData
│   └── cargoPlatform.ts              # CP_ITEMS, CPResult, CargoPlatformInspection
│
├── supabase/migrations/              # 42 migrations (0001–0042)
│
├── web-app/                          # Dashboard (Vite + React)
│   └── src/
│       ├── pages/                    # 35+ page components
│       ├── lib/data/                 # Data layer (one file per entity)
│       └── components/              # UI components incl. SkeletonCard.tsx
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

---

**Full context → [`ONBOARDING.md`](../ONBOARDING.md)**  
**Last sync:** 2026-05-14
