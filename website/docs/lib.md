---
sidebar_position: 6
---

# Lib Reference

Everything under `lib/`. The lib layer owns Supabase calls, cross-cutting concerns, and any logic that isn't a screen.

## Backend client

### supabase.ts

Initialises the `SupabaseClient`. Reads URL + anon key from `Constants.expoConfig.extra`. Configures:

- `auth.flowType: 'pkce'` for `expo-auth-session`
- `auth.storage` → `expo-secure-store`
- Storage bucket helpers used by upload code paths

### session.tsx

`<SessionProvider>` + `useSession()` hook. Wraps `app/_layout.tsx` so every route can read `{ user, status, signIn, signOut }`. Restores the session on cold-start; swallows stale-refresh-token errors and treats them as logged-out.

## Data services

Files: `lib/services.ts`, `lib/services.real.ts`, `lib/services.mock.ts`.

`lib/services.ts` is a thin selector that re-exports either `services.real.ts` or `services.mock.ts` based on `expo.extra.useMockData`.

- **`services.real.ts`** — production data layer. Plain async functions wrapping Supabase queries: `projectsApi`, `templatesApi`, `inspectionsApi`, `answersApi`, `signaturesApi`, `certificatesApi`, `qualificationsApi`, `schedulesApi`, `remoteSigningApi`, etc.
- **`services.mock.ts`** — in-memory fixtures for offline development and demos.

This is the **only** place Supabase is queried. Routes and components import from `lib/services.ts` only.

## PDF & sharing

### pdf.ts

HTML-template-based PDF generation for inspection certificates. Embeds photos and signatures as base64 data URIs (the indirection exists to work around a Hermes Blob bug — see commit `23f3e89`). Calls `expo-print` to render and returns a local file URI.

### sharePdf.ts

Wraps `expo-sharing` to open the OS share sheet with a generated PDF.

## Signatures

### signatures.ts

Helpers around storage paths and base64-PNG → Storage upload for signature images. Used by both on-site and remote signing flows.

## Offline & sync

### offline.tsx

Provides the offline queue context: pending mutations, sync state, retry. UI surfaces consume it via `<SyncStatusPill />` and `<OfflineBanner />`.

### pendingDeletes.ts

Optimistic-delete tracker — rows the user deleted while offline that haven't been confirmed by the server yet. Prevents them from "reappearing" in cached lists.

### storage-purge.ts

Clears caches and pending state — used by the "log out everywhere" path.

## Files & images

### blob.ts

Binary / base64 conversion utilities that work around React Native's incomplete `Blob` implementation.

### imageUrl.ts

URL generation for Supabase Storage objects (`signed_url` vs. `public_url`) and local file:// paths.

### photoPickerBus.ts

Tiny event bus so the `/photo-picker` modal can return its result to whichever screen launched it.

### projectAvatar.ts

Generates initials + colour for a project that has no `logo_url`.

## Notifications & feedback

### toast.tsx

Imperative toast API: `toast.success(...)`, `toast.error(...)`. Mounted once near the root layout.

### haptics.ts

`expo-haptics` wrapper with named events (success / warning / impact).

### notifications.ts

`expo-notifications` setup: permissions, scheduling, channel config.

## Integration

### googleCalendar.ts

Google Calendar API wrapper. Used by `lib/services.real.ts` schedules path to mirror inspection due-dates as calendar events.

### sms.ts

SMS sending for remote signing invitations.

## i18n & formatting

### locale.ts

i18n setup; ka (Georgian) is the default UI locale, en is fallback.

### formatDate.ts

Locale-aware date formatters used in lists, certificates, and PDF templates.

### theme.ts

Design tokens — colors, spacing, typography. Imported by `components/ui.tsx`.

## Validation & errors

### validators.ts

Form validation helpers (email, phone, required, numeric range).

### guards.ts

TypeScript narrowing helpers — `assertDefined`, `isInspectionCompleted`, etc.

### errorMap.ts

Maps Supabase / Postgres error codes to user-readable Georgian messages.

### logError.ts

Centralised error logger. Currently `console.error` with structured context; the integration point for Sentry / Crashlytics if added later.

## Misc

### terms.ts

Current T&C version constant + display copy. Bumping this forces all users back through `/terms`.

### scaffoldHelp.ts

Registry of help-topic content used by `<ScaffoldHelpSheet />`.

### polyfills.ts

Imports run early at app start to patch RN runtime gaps (e.g. `crypto.randomUUID`).
