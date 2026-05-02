# Sarke 2.0 — Now With 47% More Bugs™

> *"შრომის უსაფრთხოების ექსპერტები ეძებენ აპს. ჩვენ კი აპს ვეძებთ ექსპერტებს."*

Expo (React Native) app for people who climb scaffolding and pretend it's safe. Lets an expert create a project, fill a checklist-style questionnaire on their phone, collect signatures from terrified workers, and generate a PDF report that nobody reads.

**📰 [What's New](docs/WHATS_NEW.md)** — Latest updates, recent commits, and current focus areas. _Read this first to get up to speed._

---

## 🏗️ MVP Scope (a.k.a. "What Actually Works")

Two seeded templates, both in ქართული, because Google Translate doesn't know what a ხარაჩო is:

- **ფასადის ხარაჩოს შემოწმების აქტი** — faÇade scaffolding inspection (yes, the Ç is intentional, we fancy now)
- **დამცავი ქამრების შემოწმების აქტი** — fall-protection harness inspection. If this fails, you're already dead.

**Contextual help (ხარაჩო tour):** the first time a user starts a scaffold questionnaire they see a 9‑card swipeable tour explaining each component. Dismissal is persisted in `AsyncStorage` under `haraco_tour_seen`. Every Section 2 row also shows a "?" icon that opens a bottom sheet with the component illustration + one‑line guidance.

---

## 🧪 Stack (a.k.a. "Why Is My Laptop Fan Crying?")

- **Expo SDK 54** + expo-router (file-based routing, because config files are for cowards)
- **React Native 0.81**, React 19 — the bleeding edge where we all bleed
- **Supabase** (Postgres + Auth + Storage) — same backend as v1, because why fix what barely works?
- `expo-image-picker` for photos of broken things — multi-select enabled in the project documents flow
- `expo-document-picker` for non-image uploads (PDF, docs) in the project documents flow
- `expo-print` + `expo-sharing` for PDFs that sit in Downloads folders forever
- `qrcode` for the inspection QR embedded in the PDF header (SVG data URL, no Canvas needed)
- `react-native-signature-canvas` for signatures that look like a seismograph during an earthquake
- `react-native-keyboard-controller` for keyboard avoidance that actually works — wired in at the root via `<KeyboardProvider>`. Import `KeyboardAvoidingView` (and `KeyboardAwareScrollView` for screens with multiline inputs) from `react-native-keyboard-controller`, not from `react-native`.

The native SwiftUI port lives on the [`ios-legacy`](https://github.com/gilavi/Sarke2.0/tree/ios-legacy) branch, where it rots in peace. RIP.

### 🌐 Web

There are **two** web codebases in this repo, both static sites deployed to GitHub Pages off the `gh-pages` branch:

| Path | Purpose | URL |
|---|---|---|
| `web/` (sarke-sign) | Tokenized signing page that recipients open from an SMS link | `https://gilavi.github.io/Sarke2.0/` |
| `web-app/` (new dashboard) | Public dashboard webapp — same Supabase project as mobile | `https://gilavi.github.io/Sarke2.0/app/` |

Both are Vite + React (no Expo, no React Native). They share Supabase but **no code** with the mobile app — features are reimplemented in real HTML/CSS so desktop UX isn't fighting React Native Web. Mobile parity is not a goal.

Local dev for the dashboard:

```sh
cd web-app
npm install
cp .env.example .env   # already has the public anon credentials
npm run dev            # http://localhost:5173/Sarke2.0/app/
```

---

## 🚀 Running Locally

```sh
npm install --legacy-peer-deps   # peer conflicts around Radix/React 19
                                 # (yes, we know. no, we won't fix it.)
npx expo start                   # opens dev server, your RAM weeps
```

Scan the QR in the terminal with **Expo Go** on your phone. If it crashes, restart your phone. Then your life. Then try again.

The Supabase URL and anon key are baked into `app.json` → `expo.extra`. Security through obscurity, baby.

### Typecheck

```sh
npm run typecheck
```

Spoiler: it will fail. We ignore it. It's a lifestyle choice.

---

## 🐘 Supabase

Schema + seed already applied to the hosted project. Relevant files preserved here for reference, mostly so we can blame the DB when things break:

- `supabase/migrations/0001_init.sql` — tables + RLS
- `supabase/migrations/0015_project_logo.sql` — optional `projects.logo` (base64 data URL)
- `supabase/migrations/0016_signer_role_other.sql` — adds `'other'` to the `signer_role` enum so freeform crew members flow into `signatures`
- `supabase/migrations/0020_storage_rls_and_timestamps.sql` — tightens `incident-photos` and `report-photos` storage RLS to the row owner; adds `updated_at` + audit trigger to mutable user-data tables; adds composite indexes for project-signer lookup and certificate pagination
- `supabase/migrations/0021_inspection_attachments.sql` — `inspection_attachments` table for equipment certificates uploaded against an inspection (type chip + №number + 16:9 photo). Distinct from `qualifications` (expert credentials) and `certificates` (generated PDFs). Photos live in the existing `certificates` bucket.
- `supabase/seed/01_system_templates.sql` — system templates

Storage buckets: `certificates`, `answer-photos`, `pdfs`, `signatures`, `incident-photos`, `report-photos`, `project-files`, `remote-signatures`. 

> Fun fact: 90% of `answer-photos` are blurry pictures of rust taken with a shaking hand at 7 AM.

---

## 📁 Directory Layout

```
app/                  expo-router routes (the magic folder)
  (auth)/             login + register + existential dread
  (tabs)/             home, projects, regulations, more
  projects/           create + detail + signer
  questionnaire/      wizard + signing (where dreams go to die)
  template/           quick-start (not that quick)
  inspections/[id].tsx
                      Inspection result screen — full-screen WebView
                      PDF preview with a 3-button bottom bar
                      (სერტიფიკატები / ხელმოწერები / გადმოწერა).
                      Live preview rebuilds when sheets save changes.
                      Replaces the old tabs + done.tsx + certificates/new
                      wizard. Signatures and equipment certs are now
                      captured here, not in the wizard.
  history.tsx         because you will need therapy
  +not-found.tsx      catch-all 404 for unmatched routes (back-to-home)
customer_support/     just kidding, we don't have that
components/ProjectAvatar.tsx
                      Single source of truth for how a project is shown
                      visually — logo thumbnail when `project.logo` is
                      set, otherwise initials block on `#1D9E75`. Used
                      on the projects list, home cards, project header,
                      picker sheets, and (via `lib/pdf.ts`) the PDF.
                      Pass `editable` + `onEdit` to overlay a + or
                      pencil badge that opens `pickProjectLogo`.
components/ui.tsx     Button, Card, Input, Chip, Screen, A11yText,
                      SectionHeader, FormField, ButtonGroup,
                      ActionSheet, ActionSheetItem
                      (glorified `<View>` wrappers, but consistent ones)
components/BackButton.tsx
                      Shared back button — accepts a `label` prop
                      with the destination screen name (e.g.
                      "მთავარი") instead of a generic "უკან".
components/ActionSheet.tsx
                      Standard action sheet built on BottomSheet
                      (the "აირჩიეთ შაბლონი" pattern). Use this for
                      all option pickers — title at top, list of
                      ActionSheetItems, "გაუქმება" button at bottom.
components/SheetLayout.tsx
                      Shared layout for form/action sheets — pinned
                      header + scrollable body + pinned footer. Use
                      inside any sheet (Modal-based or BottomSheet
                      `content`) so the title and primary action stay
                      visible when the body grows tall enough to scroll.
components/FormField.tsx
                      Wraps any form input with a consistent label
                      (sm, semibold), required asterisk, and
                      error/helper text below.
components/ButtonGroup.tsx
                      Vertical or horizontal button stack — auto-
                      picks variants (primary for last, secondary
                      for the rest), used in modals + form footers.
components/SectionHeader.tsx
                      Consistent section title (lg, semibold) with
                      optional right-aligned action button.
                      Replaces ad-hoc section titles.
components/QuickActions.tsx
components/QuickActionButton.tsx
                      BOG-style horizontal row of pastel circular
                      action shortcuts (inspection, incident,
                      briefing, report, participant, file). Driven
                      by `theme.colors.actionColors[colorKey]`
                      semantic tokens — no inline styles.
                      Mounted on the project detail screen between
                      hero card and section list (replaces the FAB).
components/wizard/kamari/
                      ქამარი (harness) inspection flow — count screen,
                      overview grid (green/amber/red cards), and
                      per-belt detail modal with accordion problem
                      reporting. Persists into the existing
                      component_grid Answer.grid_values shape.
lib/
  supabase.ts         Supabase client (our digital frenemy)
  session.tsx         Auth provider (remembers you, judges you)
  services.ts         Data layer (lies, mostly)
  theme.ts            Design tokens (shades of "why is this blue?")
  pdf.ts              HTML -> PDF template (black magic)
  offline.tsx         "Works offline" they said. They lied.
  photoLocationAlert.ts
                      Project-location prompt logic: auto-set when
                      project has no coords, mismatch alert when photo
                      is taken >500 m from the project. Shared by
                      wizard, incidents, and any future flows.
hooks/
  usePhotoWithLocation.ts
                      Hook for direct ImagePicker flows (incidents,
                      certs, qualifications). Returns { uri, timestamp,
                      location } — mirrors the camera path without the
                      photo-picker bus.
utils/
  location.ts         GPS helpers: getCurrentLocation() (5 s timeout,
                      returns null on denial/failure), reverseGeocode(),
                      getDistanceMeters(). Used by photo flows and the
                      location alert.
types/models.ts       DB types (TypeScript's greatest hits)
supabase/             SQL incantations
```

---

## 🎯 Follow-ups (a.k.a. "Things We'll Never Do")

- [ ] Signature capture that doesn't look like a toddler's crayon drawing
- [ ] Comment sheet on wizard steps (for writing "HELP" in all caps)
- [ ] Profile/settings screen (beyond sign-out, because who needs settings anyway)
- [ ] Bundle Noto Sans Georgian for the PDF so it stops rendering as hieroglyphics
- [ ] World peace
- [ ] Fix that one bug where the app crashes if you look at it wrong
- [ ] Buy Luka a coffee for dealing with this codebase

---

## ⚠️ Known Issues

1. **Crash reporting**: Crashes are reported to Sentry (via `lib/crashReporting.ts`). To enable: set `EXPO_PUBLIC_SENTRY_DSN` in your `.env` or build config. In dev mode and without a DSN, crashes log to console instead. See [Sentry docs](https://docs.sentry.io/platforms/react-native/) to create a project and get a DSN.
2. If you rotate your phone during signature capture, the canvas rotates but your sanity doesn't.
3. PDF export of multi-photo reports is now ~10× faster after the resize+cache pipeline landed (2026-04-30) — but a 30-photo inspection still takes a beat.
4. `npm install` downloads the entire internet. Twice.
5. Offline photo capture is queued under `documentDirectory/offline-photos/` and flushes on reconnect; if the user uninstalls the app before reconnecting, the queue is gone with it.
6. **Web build (`expo start --web`)**: `react-native-worklets@0.5.x` reads `globalThis.__RUNTIME_KIND` at module-init to decide native vs web mode, but seeds that global *later* in a different module — so on web the native path runs and crashes at boot ([reanimated#8285](https://github.com/software-mansion/react-native-reanimated/issues/8285)). We work around it via Metro `resolveRequest` aliases in [metro.config.js](metro.config.js) that redirect `react-native-worklets/.../PlatformChecker` and `react-native-keyboard-controller` to web stubs in [shims/](shims/). Auth on the web bundle is currently unable to log in with the iOS-simulator credentials — investigate before relying on web for QA.
7. **Storage RLS gap (open):** dashboard-created policies named `sarke_*_authenticated` on the `certificates`, `answer-photos`, `pdfs`, and `signatures` buckets gate only on `bucket_id = ANY(...)`. Any authenticated user can read or delete files in those buckets. They aren't in version control because they were created via the Supabase dashboard. `incident-photos` and `report-photos` were tightened in `0020`; the rest still need owner-scoped policies (see BUG_REPORT.md).
8. This README is 60% jokes, 40% cries for help.

---

## ✍️ Copy Style Guide (Georgian UI)

All in-app strings are inline (no i18n file). Keep the voice consistent:

| Rule | Decision |
|---|---|
| You-form | Polite `თქვენ` everywhere: `შეიყვანეთ`, `აირჩიეთ`, `დააჭირეთ`, `დაამატეთ`, `შეამოწმეთ`. Never `შეიყვანე` / `აირჩიე` / `დააჭირე` / `დაამატე` / `შეამოწმე`. |
| Email | `ელ-ფოსტა` (never `იმეილი`). |
| Inspection (noun) | `ინსპექცია` (never `შემოწმება` / `ინსპექტირება` as the artifact noun). |
| To inspect (verb) | `შემოწმება` allowed only as the verbal action, not as the noun for the artifact. |
| PDF artifact | `PDF რეპორტი` (not `PDF ანგარიში`). |
| Qualification credential | `კვალიფიკაციის სერტიფიკატი`; short form `სერტიფიკატი` only inside qualifications screens. |
| Project / Template / Signature / Scaffold / Harness | `პროექტი` / `შაბლონი` / `ხელმოწერა` / `ხარაჩო` / `ქამარი`. |
| No abbreviations | Don't shorten Georgian words (`გამოტოვ.` → `გამოტოვილი`). Weekday abbreviations may stay. |
| No English UI words | Inside Georgian copy, use Georgian (`Share` → `გაზიარება`). |
| `გთხოვთ` | OK for the formal register; don't sprinkle on every line, but don't strip either. |

Grep guard for regressions:
```
git grep -nE "იმეილი|გაიცანი |სცადე[^თ]|შეიყვანე[^თ]|აირჩიე[^თ]|დააჭირე[^თ]|დაამატე[^თ]|შეამოწმე[^თ]|არ ხარ\b" -- 'app/**' 'components/**'
```

---

*Built with ❤️, ☕, and an unhealthy amount of `console.log` by a team of people who definitely read the docs (we didn't).*

**© 2026 Sarke Industries** *(not a real industry)*
