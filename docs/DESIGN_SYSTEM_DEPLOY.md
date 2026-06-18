# Design System Deploy — `ds.hubble.ge`

The design-system Storybook ([design-system/](../design-system/)) is built and
deployed by [.github/workflows/deploy-design-system.yml](../.github/workflows/deploy-design-system.yml)
on every push to `main` that touches `design-system/`, `components/primitives/`,
or `lib/`.

**Why Cloudflare Pages (not GitHub Pages):** GitHub Pages allows only one custom
domain per repo, and that's already `hubble.ge` (the `web/` signing app on the
`gh-pages` branch). `ds.hubble.ge` is a separate subdomain, so it needs a
separate host. Cloudflare Pages is free and makes custom subdomains trivial.

Until the steps below are done, the workflow still runs as a **build check** — it
compiles the Storybook on every relevant push but skips the upload (the deploy
step is gated on the `CLOUDFLARE_API_TOKEN` secret).

## External steps (Luka — one time)

1. **Create a Cloudflare Pages project**
   - Cloudflare dashboard → Workers & Pages → Create → Pages → *Direct Upload* (CI
     uploads the build; no Git connection needed).
   - Project name: **`hubble-ds`** (must match `--project-name=hubble-ds` in the workflow).

2. **Create an API token** (Cloudflare → My Profile → API Tokens → Create Token)
   - Template: *Edit Cloudflare Workers* — or a custom token with permission
     **Account → Cloudflare Pages → Edit**.
   - Copy the token value, and note your **Account ID** (Workers & Pages → right sidebar).

3. **Add the two GitHub repo secrets** (repo → Settings → Secrets and variables → Actions)
   - `CLOUDFLARE_API_TOKEN` = the token from step 2
   - `CLOUDFLARE_ACCOUNT_ID` = your account ID

4. **Point the subdomain at the project**
   - First deploy: re-run the workflow (Actions → *Deploy design system* →
     *Run workflow*) or push any change under the watched paths. It publishes to
     `https://hubble-ds.pages.dev`.
   - Cloudflare → the `hubble-ds` project → *Custom domains* → add **`ds.hubble.ge`**.
   - DNS: if `hubble.ge` is on Cloudflare DNS, the custom-domain flow adds the
     `CNAME ds → hubble-ds.pages.dev` automatically. If DNS is elsewhere (e.g. the
     same registrar serving the GitHub Pages `hubble.ge`), add a `CNAME` record:
     `ds` → `hubble-ds.pages.dev`.

That's it — subsequent pushes auto-deploy. The existing `hubble.ge`,
`hubble.ge/app/`, and `hubble.ge/docs/` on GitHub Pages are untouched (this is a
different host and a different subdomain).

## Local preview

```sh
npm run storybook --prefix design-system   # http://localhost:6007
npm run build --prefix design-system        # static export to design-system/dist/
```
