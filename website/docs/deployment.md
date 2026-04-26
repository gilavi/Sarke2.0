---
sidebar_position: 11
---

# Deployment

## App (EAS Build)

The app ships through Expo Application Services (EAS Build). The project ID is wired into `app.json` → `expo.extra.eas.projectId`.

```sh
npx eas build --platform ios
npx eas build --platform android
```

Bumping a release: increment **all three** versions in `app.json`:

- `expo.version` (semver, both stores)
- `expo.ios.buildNumber` (App Store)
- `expo.android.versionCode` (Play Store, integer)

See commit `85f565d` for the convention.

## Docs (this site)

This Docusaurus site lives under `website/` and is deployed to **GitHub Pages** at `https://gilavi.github.io/Sarke2.0/` by `.github/workflows/docs.yml`.

The workflow runs on push to `main` when any of these change:

- `website/**`
- `lib/**`, `types/**`, `app/**`, `components/**`
- `supabase/migrations/**`
- the workflow file itself

Build → publish flow:

1. Checkout, `npm ci` inside `website/`.
2. `npm run build` produces `website/build`.
3. [`peaceiris/actions-gh-pages@v3`](https://github.com/peaceiris/actions-gh-pages) pushes `website/build` to the `gh-pages` branch.

## One-time GitHub setup

When this is set up for the first time, in the repo's GitHub UI:

1. **Settings → Pages → Build and deployment**
   - Source: **Deploy from a branch**
   - Branch: **`gh-pages`** / **`/ (root)`**
2. **Settings → Actions → General → Workflow permissions**
   - Allow **Read and write permissions** (so the workflow can push to `gh-pages`).

The first run of the workflow creates the `gh-pages` branch automatically; subsequent runs fast-forward it.

## Local preview

```sh
cd website
npm install
npm run start    # http://localhost:3000/Sarke2.0/
npm run build    # produces website/build
npm run serve    # serves the production build locally
```
