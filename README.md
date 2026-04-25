# Sarke 2.0

Expo (React Native) app for შრომის უსაფრთხოების ექსპერტები. Lets an expert create a project, fill a checklist-style questionnaire on their phone, collect signatures, and generate a PDF inspection report.

MVP scope: two seeded templates, both in ქართული:
- **ფასადის ხარაჩოს შემოწმების აქტი** (façade scaffolding inspection)
- **დამცავი ქამრების შემოწმების აქტი** (fall-protection harness inspection)

## Stack

- Expo SDK 55 + expo-router (file-based)
- React Native 0.81, React 19
- Supabase (Postgres + Auth + Storage) — same backend as v1
- `expo-image-picker` for photos, `expo-print` + `expo-sharing` for PDF, `react-native-signature-canvas` for signatures

The native SwiftUI port lives on the [`ios-legacy`](https://github.com/gilavi/Sarke2.0/tree/ios-legacy) branch.

## Running locally

```sh
npm install --legacy-peer-deps   # peer conflicts around Radix/React 19
npx expo start                   # opens dev server
```

Scan the QR in the terminal with **Expo Go** on your phone. The Supabase URL and anon key are baked into `app.json` → `expo.extra`.

### Typecheck

```sh
npm run typecheck
```

## Supabase

Schema + seed already applied to the hosted project. Relevant files preserved here for reference:
- `supabase/migrations/0001_init.sql` — tables + RLS
- `supabase/seed/01_system_templates.sql` — system templates (also inserted via REST in v1)

Storage buckets in use: `certificates`, `answer-photos`, `pdfs`, `signatures`.

## Directory layout

```
app/                  expo-router routes
  (auth)/             login + register
  (tabs)/             home, projects, regulations, more
  projects/           create + detail + signer
  questionnaire/      wizard + signing
  template/           quick-start
  certificates/       list + add
  history.tsx, templates.tsx
components/ui.tsx     Button, Card, Input, Chip, Screen
lib/
  supabase.ts         Supabase client
  session.tsx         Auth provider
  services.ts         Data layer
  theme.ts            Design tokens
  pdf.ts              HTML -> PDF template
types/models.ts       DB types
supabase/             SQL
```

## Follow-ups

- Signature capture (react-native-signature-canvas) — currently the signing screen lists required signers and generates a PDF with blank lines; drawn signatures land next
- Comment sheet on wizard steps
- Profile/settings hidden beyond sign-out
- Font: bundle Noto Sans Georgian for the PDF to avoid WebView fallback
