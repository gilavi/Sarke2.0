# App Store Submission Checklist — Sarke 2.0

Last reviewed: 2026-05-27 · Branch: `app-store`

This is the single source of truth for what's required to push Sarke 2.0 to the App Store. Code-side work is on the `app-store` branch; remaining work is metadata that lives in App Store Connect and manual TestFlight steps.

---

## ✅ Code changes already in `app-store` branch

| Change | File | Notes |
|---|---|---|
| Privacy Manifest data types populated | [app.json](../app.json) under `expo.ios.privacyManifests` | Declares Name, Email, Phone, PreciseLocation, Photos, OtherUserContent (signatures), UserID, CrashData, PerformanceData. All linked-to-identity, none used for tracking. Matches what App Privacy Nutrition Labels must claim. Lives in `app.json` (not a hand-edited `ios/Sarke/PrivacyInfo.xcprivacy`) because `ios/` is gitignored — Expo prebuild generates the manifest from this block. |
| iOS permission strings bilingual + cleaned up | [app.json](../app.json) | Dropped unused `NSMicrophoneUsageDescription`, deprecated `NSLocationAlwaysUsageDescription`, unused `NSPhotoLibraryAddUsageDescription`. Camera / Photo Library / Location When In Use strings are now Georgian + English, with concrete purpose statements. |
| expo-image-picker plugin strings bilingual | [app.json](../app.json) | Plugin-level overrides aligned with the infoPlist strings. |
| `userInterfaceStyle: "light"` | [app.json](../app.json) | Locked to avoid reviewers hitting any unfinished dark-mode states. Re-enable when dark mode is verified. |
| Android `RECORD_AUDIO` permission dropped | [app.json](../app.json) | App doesn't record audio. Declaring unused permissions is itself a 5.1.1 risk. |
| Version aligned | [app.json](../app.json) + [package.json](../package.json) | Both `1.0.0` for first submission. |
| Sentry `sendDefaultPii: false` explicit | [lib/crashReporting.ts](../lib/crashReporting.ts) | Was implicit via `beforeSend` var-stripping; now declared so it matches the nutrition labels. |
| Privacy Policy page (public route) | [web-app/src/pages/Privacy.tsx](../web-app/src/pages/Privacy.tsx) + [web-app/src/lib/privacy.ts](../web-app/src/lib/privacy.ts) | Bilingual. Reachable at `https://gilavi.github.io/Sarke2.0/app/#/privacy` after web-app deploys to main. **Public route**, no login required. |
| `eas.json` submit profile template | [eas.json](../eas.json) | Has placeholders for `appleId`, `ascAppId`, `appleTeamId` — replace before running `eas submit`. |

---

## 🟡 Still to do BEFORE `eas build`

1. **Fill the three placeholders in [eas.json](../eas.json)** — `appleId`, `ascAppId`, `appleTeamId`. ASC App ID is the numeric ID assigned after you create the app shell in App Store Connect.

2. **Create the app shell in App Store Connect** if it doesn't exist yet (https://appstoreconnect.apple.com → My Apps → +). Bundle ID: `ge.sarke2.app`. Make sure this bundle ID is registered in the Apple Developer portal first.

3. **Generate an App-Specific Password** at https://appleid.apple.com → Sign-In and Security → App-Specific Passwords. EAS will prompt for it when you run `eas submit`, or set `EXPO_APPLE_APP_SPECIFIC_PASSWORD` in your shell.

4. **Deploy the web-app to main** so the `/privacy` route is live. The web-app auto-deploys on push to main via `.github/workflows/deploy-web-app.yml`. Test the URL: `https://gilavi.github.io/Sarke2.0/app/#/privacy` resolves without login.

5. **Create a dedicated demo Supabase account** for App Review:
   - Email: `apple-reviewer@hubble.ge` (or similar — keep it dedicated to reviewers; don't reuse a real test account)
   - Password: something easy but not personal
   - Seed: at least 1 project, 1 harness inspection (with photos + signature in a generated PDF), 1 scaffold inspection, 1 certificate. Reviewers click around — give them something to click.

---

## 🟡 Still to do BEFORE pressing "Submit for Review"

These all live in App Store Connect's web UI:

### App Information
- **Category:** Primary = Business · Secondary = Productivity
- **Subtitle (30 char max):** e.g. `სამშენებლო უსაფრთხოება`
- **Content rating:** Fill questionnaire → 4+ (no objectionable content)
- **Privacy Policy URL:** `https://gilavi.github.io/Sarke2.0/app/#/privacy` (or `https://hubble.ge/privacy` once that's mirrored)
- **Support URL:** `https://hubble.ge` (or your support page)

### App Privacy (the "nutrition labels")
Must match the Privacy Manifest exactly. From `expo.ios.privacyManifests` in [app.json](../app.json):

| Data type | Linked to identity | Used for tracking | Purpose |
|---|---|---|---|
| Name | YES | NO | App Functionality |
| Email Address | YES | NO | App Functionality, Account Management |
| Phone Number | YES | NO | App Functionality |
| Precise Location | YES | NO | App Functionality |
| Photos or Videos | YES | NO | App Functionality |
| Other User Content (signatures) | YES | NO | App Functionality |
| User ID | YES | NO | App Functionality |
| Crash Data | NO | NO | App Functionality |
| Performance Data | NO | NO | App Functionality |

Tracking: **None.** No third-party advertising SDKs.

### Screenshots (iPhone 6.9" — required)
Need 3–10 screenshots at 1320×2868 (iPhone 17 Pro Max class). Suggested set:
1. Home screen — project list with a couple of real-looking projects
2. Project detail — overdue badge, items list
3. Inspection wizard — mid-flow, harness or scaffold step
4. Photo annotator — photo with annotation overlay
5. Signature capture screen
6. Generated PDF preview
7. Calendar view with upcoming inspections
8. Account/profile screen showing delete-account option

Capture from the iPhone 17 Pro Max simulator running a production build. Use the demo account so the data is realistic.

### App Store Description (Georgian + English)
Draft both. Mention: inspection types covered (scaffolding, harnesses, bobcat, excavator, cargo platform, general equipment), photo + signature capture, PDF generation, project organization.

### Keywords (100 chars total, comma-separated)
Suggested: `construction,safety,inspection,scaffolding,harness,OSHA,ხარაჩო,ქამარი,უსაფრთხოება,საქართველო`

### App Review Information
- **Demo account credentials:** the one created above
- **Contact:** your phone + email
- **Notes for reviewer:** paste the block below.

---

## 📝 Reviewer Notes — paste this block into App Review Information → Notes

```
Thank you for reviewing Sarke 2.0.

LANGUAGE
The app's primary language is Georgian (ქართული). All on-screen text is in
Georgian; the demo account is configured the same way. If you need any
specific screen translated, please email support@hubble.ge.

DEMO ACCOUNT
Email: <fill in>
Password: <fill in>
The demo account is pre-seeded with 1 sample project, several inspections
(scaffolding + harness + equipment), 1 certificate, and 1 generated PDF.
Tap "შემოწმებები" / Inspections on the home screen to begin.

SIGNATURE CAPTURE (Guideline 4.2 pre-emption)
The signature capture screen at the end of an inspection uses an embedded
WebView for HTML5 canvas drawing. This is a small canvas component only —
the rest of the app is fully native React Native (Expo SDK 54). Captured
signatures are rasterized into the generated PDF immediately and are NOT
persisted to storage (this is a regulatory requirement for inspection
signatures).

SUBSCRIPTION MODEL (Guideline 3.1.1)
The iOS app is free and includes 30 free PDF generations. Higher PDF limits
require a Hubble web subscription that customers purchase via the Hubble
website (hubble.ge / Bank of Georgia, the local payment processor). The web
subscription is the primary product; the iOS app is a free companion that
honors the web subscription's higher limits. No subscriptions are sold from
within the iOS app and no in-app purchase is offered.

ACCOUNT DELETION (Guideline 5.1.1(v))
Reachable in ≤2 taps from the user's account screen:
More tab (მეტი) → Profile (პროფილი) → "ანგარიშის წაშლა" (Delete account).
Deletion is permanent: a Supabase Edge Function calls auth.admin.deleteUser
and Postgres CASCADE removes all user-owned data.

PERMISSIONS
- Camera: take photos of inspection subjects (scaffolding, harnesses, etc.)
- Photo Library: pick photos from gallery to attach to inspections
- Location (When In Use): geo-tag inspection photos in the PDF report

No microphone, no contacts, no background location, no tracking.

DATA HANDLING
- All data is stored on Supabase with Row-Level Security. Storage buckets
  are private; reads use short-lived signed URLs.
- EXIF metadata is stripped from every uploaded photo via
  expo-image-manipulator.
- Sentry crash reporting is enabled with sendDefaultPii: false and frame
  variables stripped before upload.
- Privacy policy: https://gilavi.github.io/Sarke2.0/app/#/privacy

Contact: support@hubble.ge
```

---

## Build + Submit Commands

Once the placeholders in `eas.json` are filled and the App Store Connect app shell exists:

```bash
# 1. Production build (uploads to EAS, then to App Store Connect TestFlight)
eas build --platform ios --profile production

# 2. After TestFlight processing finishes (10–30 min), submit to review
eas submit --platform ios --profile production

# Alternative: build + submit in one shot
eas build --platform ios --profile production --auto-submit
```

After upload, run **Xcode → Organizer → Validate App** as a sanity preflight before the App Store reviewer pulls the build.

---

## Known risk + fallback plan

**Apple Guideline 3.1.1 (in-app purchase)** is the open risk. The decision is to ship with the existing BOG flow on the basis that the web is the primary purchase channel and the iOS app is a free companion. If review rejects on this ground, the fastest path forward is:

1. Hide the "Subscribe" call-to-action behind `Platform.OS !== 'ios'` in [components/PaywallModal.tsx](../components/PaywallModal.tsx) and [app/(tabs)/more.tsx](../app/(tabs)/more.tsx) — iOS users still get the free 30 PDFs and their web subscription still unlocks higher limits, but the iOS app no longer surfaces *any* link to external payment.
2. Resubmit. The "no upsell inside the app" framing usually clears 3.1.1 in days.
