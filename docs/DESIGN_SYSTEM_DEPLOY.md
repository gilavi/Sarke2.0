# Design System Deploy

The design-system Storybook ([design-system/](../design-system/)) is published to
a **separate repo, `gilavi/hubble-ds`**, via GitHub Pages.

**Live now:** https://gilavi.github.io/hubble-ds/ (no DNS needed).
**Target vanity URL:** https://ds.hubble.ge (needs one DNS record — see below).

## Why a separate repo

GitHub Pages allows only one custom domain per repo, and this repo's Pages
already serves `hubble.ge` (the `web/` signing app) plus `/app/` and `/docs/`.
A subdomain needs its own Pages site, so the design system lives in its own repo.
This also isolates it from the live dashboard's `gh-pages` branch — deploying the
design system can never affect hubble.ge.

## Auto-deploy (already wired)

[.github/workflows/deploy-design-system.yml](../.github/workflows/deploy-design-system.yml)
runs on every push to **`develop`** that touches `design-system/`, `components/`,
or `lib/`. It builds the Storybook and publishes the static export to
`gilavi/hubble-ds`'s `gh-pages` branch using the `HUBBLE_DS_DEPLOY_KEY` secret
(an SSH deploy key with write access to that repo — already configured).

No Cloudflare account, API token, or manual steps are needed for ongoing updates.

## Turning on ds.hubble.ge (one-time, needs YOU)

The site already works at the github.io URL. To serve it at `ds.hubble.ge`:

1. **Add a DNS record** wherever `hubble.ge`'s DNS is managed (registrar or
   Cloudflare DNS):

   ```
   CNAME   ds   gilavi.github.io
   ```

   (This is the only step that can't be automated — it's domain config, not code.)

2. **Set the custom domain on the Pages site.** Either:
   - Repo `gilavi/hubble-ds` → Settings → Pages → Custom domain → `ds.hubble.ge` → Save; or
   - run: `gh api -X PUT repos/gilavi/hubble-ds/pages -f cname=ds.hubble.ge -F https_enforced=true`

   GitHub writes a `CNAME` file and auto-provisions HTTPS once DNS resolves.

3. **(Optional) make CI keep the CNAME.** In the workflow's publish step, add
   `cname: ds.hubble.ge` so re-deploys preserve the custom domain. The Storybook
   build uses relative asset paths, so it works at both the github.io subpath and
   the domain root with no rebuild.

Until step 1 propagates, keep using https://gilavi.github.io/hubble-ds/.

## Local preview

```sh
npm run storybook --prefix design-system   # http://localhost:6007
npm run build --prefix design-system        # static export to design-system/dist/
```
