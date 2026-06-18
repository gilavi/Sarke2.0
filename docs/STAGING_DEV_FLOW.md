# Hubble — staging dev flow (hard rules)

Read this before working on the app. It keeps our **staging** work isolated from
the **live App Store** app. Full background: [ENVIRONMENTS.md](ENVIRONMENTS.md) and
[STAGING_SETUP_LOG.md](STAGING_SETUP_LOG.md).

**Two tiers:**
- `develop` branch + **staging** Supabase = our test playground (`Hubble (Staging)`, bundle id `ge.sarke2.app.staging`).
- `main` branch + **prod** Supabase = the **LIVE App Store** app (`Hubble`, bundle id `ge.sarke2.app`).

Keep them apart.

---

## 1. Branches
- Work on feature branches → merge into **`develop`**. `develop` is staging.
- **Never commit/merge to `main`** without a review — `main` ships to real App Store users.

## 2. Which backend the app talks to — `APP_ENV` decides, NOT the branch
- ⚠️ **Never run a bare `npx expo start`.** With no `APP_ENV` it defaults to **PRODUCTION** (the live database).
- For local dev run **`npm run start:staging`**, and create a local **`.env`** file (git-ignored — not in the repo) with the staging publishable values (safe to share):
  ```
  APP_ENV=staging
  STAGING_SUPABASE_URL=https://oiwkfzadftmgmshidyqx.supabase.co
  STAGING_SUPABASE_ANON_KEY=sb_publishable_if2XIf1WB03rHEC0PQKNSg_eJ4frwNu
  ```
  With this `.env`, even a plain `expo start` is pinned to staging on your machine.

## 3. Seeing changes on our phones
- **JS / design / logic change (almost always):** `npm run update:staging`
  → lands on **every** installed phone in **seconds**, no reinstall. ⚡ This is the daily loop.
- **Native change** (new native package, `app.config.ts` native settings, Expo SDK bump):
  `npm run build:staging` → share the new install link → reinstall.

> Rule of thumb: changed only `.ts/.tsx`/styles/images? → `update:staging`.
> Added a native package or touched `app.config.ts` native bits? → `build:staging`.

## 4. Never touch prod
- **Never** run a bare `eas update` — always `npm run update:staging` (it pins the channel; a bare update could ship to prod users).
- Don't run `build:production` / `update:production` / `supabase db push` against prod.
- Don't merge `develop` → `main` without a review.

---

## Onboarding a new device (friend / tester)

Apple requires each device to be pre-registered before a build can install on it.

1. **Owner runs:** `npx eas device:create` → choose **"Website"** → get a **registration link + QR**.
2. **Share that registration link** with the person. They open it **on their iPhone in Safari** → install the profile (Settings → Profile Downloaded → Install). The same link works for many people. (Already-registered devices don't need to redo this.)
3. **After everyone has registered, the owner runs:** `npm run build:staging` → the new build includes all registered devices.
4. **Share the INSTALL link** (printed at the end of the build — different from the registration link) → everyone installs `Hubble (Staging)`.
5. Each person enables **Developer Mode** once: Settings → Privacy & Security → Developer Mode → restart.

After that we're synced: **edit → `npm run update:staging` → it lands on everyone's phone in seconds.** Rebuild only when something native changes.
