# Tab Routes

`app/(tabs)/*` — the main bottom-tab navigation for an authenticated user.

| Path | File | Purpose |
| --- | --- | --- |
| `/` (home) | `app/(tabs)/index.tsx` | Dashboard: upcoming inspections, quick actions |
| `/projects` | `app/(tabs)/projects.tsx` | List + create projects |
| `/calendar` | `app/(tabs)/calendar.tsx` | Schedule view (next-due inspections) |
| `/certificates` | `app/(tabs)/certificates.tsx` | Generated PDFs across all projects |
| `/regulations` | `app/(tabs)/regulations.tsx` | Static regulatory content |
| `/more` | `app/(tabs)/more.tsx` | Profile, settings, sign out, T&Cs |

Tabs share `app/(tabs)/_layout.tsx` which configures `<Tabs>` from `expo-router`.

The "create project" CTA on `/projects` opens `app/projects/new.tsx` (modal). The "create inspection" CTA flows through template selection (`app/templates.tsx` → `app/template/[id]/start.tsx`) into the [inspection wizard](./inspections.md).
