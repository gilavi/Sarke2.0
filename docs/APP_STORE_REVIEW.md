# App Store Review — notes, privacy labels, permissions

Prepared 2026-06-12 (launch prep). Fill the placeholders before submission.

## Review notes (paste into App Store Connect → App Review Information)

> **What the app does.** Hubble is a construction-site safety app for the
> Georgian market. Safety experts use it to run equipment and scaffolding
> inspections (checklists with photos), hold safety briefings, log incidents,
> and export the resulting acts as PDF documents. The UI is in Georgian
> (ქართული) — the primary audience is Georgian construction professionals.
>
> **Demo account.**
> Email: `appreview@hubble.ge`
> Password: `<PASTE — printed once by scripts/seed-demo-account.mjs>`
> The account is pre-seeded with two projects, several inspections in
> different states, and a briefing, so every main screen shows real data.
>
> **Account deletion** (guideline 5.1.1(v)): Profile → ანგარიშის წაშლა
> (More tab → profile → "Delete account"). Deletion is immediate and removes
> all user data server-side.
>
> **Purchasing:** Subscriptions are sold outside the app on our web platform;
> the app contains no purchasing (guideline 3.1.3). At the free-tier limit the
> app shows a neutral notice with no price, link, or call to action.
>
> **Sign in with Apple** is offered on iOS alongside email/password
> (guideline 4.8). Google sign-in is Android-only.

## App Privacy labels (post-permission-diet state, 2026-06-12)

All data is **linked to the user's identity** (account-based app). **None** is
used for tracking. No third-party advertising.

| Apple category | Data | Where it comes from |
|---|---|---|
| Contact Info → Name | first/last name | registration, Apple sign-in first authorization |
| Contact Info → Email Address | account email | registration / OAuth |
| Contact Info → Phone Number | project contact + document-signer phone numbers (SMS signing flow stores `signer_phone`; projects store `contact_phone`) | user-entered |
| Identifiers → User ID | Supabase auth UUID | account system |
| User Content → Photos or Videos | inspection/incident/certificate photos (no video) | camera / photo library |
| User Content → Other User Content | inspection answers, PDFs, briefings, incident reports, signatures captured for documents | user-entered |
| Diagnostics → Crash Data | crash reports via Sentry | `@sentry/react-native` |

**Location: NOT collected.** Photo geotagging and the location permission were
removed on 2026-06-12 (phase-5). Microphone: not used. No video recording.

## iOS permissions as shipped (app.json → ios.infoPlist)

| Key | Georgian string |
|---|---|
| `NSCameraUsageDescription` | კამერა გამოიყენება ხარაჩოს და ქამრების ფოტოების ატვირთვისთვის. |
| `NSPhotoLibraryUsageDescription` | ფოტოების არჩევა სისტემის ბიბლიოთეკიდან. |
| `NSPhotoLibraryAddUsageDescription` | საჭიროა ფოტოების შესანახად |

(Plus the expo-image-picker plugin strings: gallery — „აპი ითხოვს წვდომას
გალერეაზე ფოტოების ასატვირთად.", camera — „კამერა გამოიყენება ფოტოების
გადასაღებად.")

Android `permissions` array is empty — camera/photo permissions come from the
image-picker plugin; location and `RECORD_AUDIO` were removed.

## Privacy policy

URL: `https://hubble.ge/app/#/privacy` — live since 2026-06-12 (public,
reachable logged-out; ka+en). Content source: `web-app/src/lib/privacy.ts`.
App Store Connect requires a reachable privacy policy URL; the app also links
terms in-app (Profile → წესები და პირობები → `https://hubble.ge/app/#/terms`).

## Demo data seeding

```bash
SUPABASE_URL="https://<project>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
node scripts/seed-demo-account.mjs            # idempotent; --reset-password to rotate
```

The script never embeds keys, never persists signatures (regulatory rule),
and prints the demo password exactly once.
