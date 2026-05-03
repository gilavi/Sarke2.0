---
sidebar_position: 2
---

# Getting Started

## Prerequisites

- **Node.js 20+** and **npm**
- **Expo Go** app on a physical iOS or Android device (recommended for camera/signature testing), or Xcode / Android Studio simulators
- A Supabase project URL + anon key (the production one is already baked into `app.json` → `expo.extra`)

## Install

```sh
git clone https://github.com/gilavi/Sarke2.0.git
cd Sarke2.0
npm install --legacy-peer-deps
```

`--legacy-peer-deps` is required because of a Radix / React 19 peer-dep conflict.

## Run

```sh
npx expo start
```

Scan the QR with **Expo Go** to launch on a device, or press `i` / `a` for a simulator.

## Configuration

App configuration lives in `app.json`:

```jsonc
"extra": {
  "supabaseUrl":     "https://seskuthiopywrgntsgfw.supabase.co",
  "supabaseAnonKey": "sb_publishable_…",
  "googleIosClientId":     "",
  "googleAndroidClientId": "",
  "googleWebClientId":     "",
  "useMockData": false
}
```

- Set `useMockData: true` to swap the data layer for `lib/services.mock.ts` (see [lib reference](./lib.md#data-services)).
- The Google Calendar fields are optional; leave blank to disable schedule sync.

## Type-check & Tests

```sh
npm run typecheck    # tsc --noEmit
npm test             # node test runner under __tests__/
```

## Database

The hosted Supabase project already has the schema applied. To replay locally:

```sh
supabase db reset                       # against your linked project
psql -f supabase/seed/01_system_templates.sql
```

See [Database → Migrations](./database/migrations.md) for the migration log.
