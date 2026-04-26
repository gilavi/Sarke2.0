---
slug: /
sidebar_position: 1
---

# Sarke 2.0

**Sarke 2.0** is an Expo / React Native mobile app for Georgian scaffolding (ხარაჩო) safety inspections. An expert opens the app, picks a project, walks through a templated checklist on site, attaches photos, collects signatures from the crew, and generates a PDF certificate.

## At a glance

| | |
| --- | --- |
| **Frameworks** | Expo SDK 55, React Native 0.81, React 19, Expo Router |
| **Backend** | Supabase (Postgres + Auth + Storage) |
| **Build** | EAS Build (iOS + Android) |
| **PDF** | `expo-print` from an HTML template (`lib/pdf.ts`) |
| **Signatures** | `react-native-signature-canvas` |
| **Maps** | `react-native-maps` for project geolocation |
| **i18n** | Georgian-first (UI strings in `ka`); domain enums in English |

## What this docs site covers

- **Routes** — every Expo Router screen, what it does, what it talks to.
- **Components** — the 17 reusable UI pieces under `components/`.
- **Lib** — services, Supabase client, offline queue, PDF generator, etc.
- **Data model** — the entities in `types/models.ts` with an ER diagram.
- **Database** — table reference, migration log, embedded Swagger UI for the auto-generated Supabase REST API.
- **Flows** — PDF generation, offline sync, on-site + remote signing.
- **Deployment** — EAS Build, GitHub Actions, hosting this docs site.

## Source

- App repo: [github.com/gilavi/Sarke2.0](https://github.com/gilavi/Sarke2.0)
- This site is built from `website/` in the same repo and deployed by `.github/workflows/docs.yml` to the `gh-pages` branch.
