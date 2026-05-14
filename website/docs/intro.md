---
slug: /
sidebar_position: 1
---

# Sarke 2.0

**Sarke 2.0** is a safety inspection platform for Georgian construction sites. An expert opens the app, picks a project, walks through a specialized checklist on site, attaches photos, collects signatures, and generates a legally formatted PDF report.

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
| **Dashboard** | `web-app/` | `https://gilavi.github.io/Sarke2.0/app/` | Web management dashboard (Vite + React) |
| **Signing page** | `web/` | `https://gilavi.github.io/Sarke2.0/` | Token-based signing page linked from SMS |
| **This docs site** | `website/` | `https://gilavi.github.io/Sarke2.0/docs/` | You are here |

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
