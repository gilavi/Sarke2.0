---
slug: /
sidebar_position: 1
---

# Hubble

**Hubble** is a safety inspection platform for Georgian construction sites. An expert opens the app, picks a project, walks through a specialized checklist on site, attaches photos, collects signatures, and generates a legally formatted PDF report.

## Quick Reference

### 🔗 Live links

| | URL |
|---|---|
| **Web Dashboard** | https://hubble.ge/app/ |
| **Signing Page** (SMS links go here) | https://hubble.ge/ |
| **Docs** (this site) | https://hubble.ge/docs/ |
| **GitHub Repo** | https://github.com/gilavi/Sarke2.0 |
| **Supabase Dashboard** | https://supabase.com/dashboard/project/seskuthiopywrgntsgfw |

### 💻 Running locally

```sh
# Mobile (Expo) — scan QR with Expo Go
npm install --legacy-peer-deps
npx expo start

# Web Dashboard → http://localhost:5173/app/
cd web-app && npm install && npm run dev

# Signing Page → http://localhost:5173/
cd web && npm install && npm run dev

# Docs Site → http://localhost:3000/docs/
cd website && npm install && npm start
```

### 📱 EAS builds

```sh
npx eas build --platform ios --profile preview        # TestFlight / internal
npx eas build --platform ios --profile production     # App Store
npx eas build --platform android --profile production # Play Store
```

Before any release bump all three version fields in `app.json`:
`expo.version` · `expo.ios.buildNumber` · `expo.android.versionCode`

### 💳 BOG test card (sandbox only)

```
Card number : 4000 0000 0000 0001
Expiry      : any future date  (e.g. 12/26)
CVV         : any 3 digits
```

BOG sandbox OAuth: `https://oauth2-sandbox.bog.ge`  
BOG sandbox API: `https://api-sandbox.bog.ge/payments/v1/ecommerce/orders`  
Edge Function secrets needed: `BOG_ENV=sandbox`, `BOG_CLIENT_ID`, `BOG_CLIENT_SECRET`

### 🔑 Supabase public credentials

These are the anon (public) credentials baked into `app.json`. Safe to share — Row-Level Security enforces all access control.

```
URL:            https://seskuthiopywrgntsgfw.supabase.co
Anon key:       sb_publishable_OF_L2E27-Uv8MMw87fWfSA_znD7moYY
EAS project ID: ab800403-36c4-4673-8dd8-dfc75b66d14b
```

---

## At a glance

| | |
| --- | --- |
| **Frameworks** | Expo SDK 55, React Native 0.81, React 19, Expo Router |
| **Backend** | Supabase (Postgres + Auth + Storage + Edge Functions) |
| **Build** | EAS Build (iOS + Android) |
| **PDF** | `expo-print` from HTML templates; per-type builders in `lib/` |
| **Signatures** | `react-native-signature-canvas` |
| **Payments** | BOG (Georgian bank) recurring subscriptions |

## Three codebases, one Supabase project

| Codebase | Path | URL | Purpose |
|---|---|---|---|
| **Mobile** | `/` (repo root) | Expo Go / TestFlight | Primary app — inspections, signatures, PDF |
| **Dashboard** | `web-app/` | `https://hubble.ge/app/` | Web management dashboard (Vite + React) |
| **Signing page** | `web/` | `https://hubble.ge/` | Token-based signing page linked from SMS |
| **This docs site** | `website/` | `https://hubble.ge/docs/` | You are here |

They share only Supabase. No code is shared between them.

## Inspection types

Eight inspection types are supported, across two patterns:

**Generic (template-driven, `inspections` table):**
- ფასადის ხარაჩოს შემოწმების აქტი — facade scaffolding
- დამცავი ქამრების შემოწმების აქტი — fall-protection harness
- მობილური ხარაჩო N1 — mobile scaffold
- მობილური ხარაჩო N3 — mobile scaffold (variant)

**Specialized (own table, own wizard screen):**
- **Bobcat / Large Loader** — `bobcat_inspections`, 30/33-item checklist, verdict auto-suggestion
- **Excavator** — `excavator_inspections`, 6-step wizard per ISO 9457
- **General equipment** — `general_equipment_inspections`, user-built item list
- **Cargo platform** — `cargo_platform_inspections`, 9-item checklist, dual signatures, cargo weight table

## Orders / ბრძანებები

Legal appointment orders (შრომის, სახანძრო, ალკოჰოლური კონტროლი). Stored in a single `orders` table with `document_type text` and `form_data jsonb`. Fire safety variants have an in-app 2-signatory signing flow with embedded base64 signatures.

See [Orders](./orders).

## What this docs site covers

- **Routes** — every Expo Router screen and web dashboard page.
- **Data model** — entities in `types/models.ts` with an ER diagram.
- **Database** — table reference, full migration log, Swagger UI.
- **PDF generation** — pipeline for both inspection certificates and orders.
- **Orders** — the ბრძანებები module, document types, signing flow.
- **Signing flow** — on-site, remote, and in-order signing.
- **Deployment** — EAS Build, GitHub Actions CI, this docs site.

## Source

- Repo: [github.com/gilavi/Sarke2.0](https://github.com/gilavi/Sarke2.0)
- This site is built from `website/` and deployed by `.github/workflows/docs.yml` to `gh-pages/docs/`.
