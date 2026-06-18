# Step 4 — GitHub Environments + secrets (repo-admin task)

Hey — this is the GitHub side of standing up the **staging** tier. It needs
repo **admin** access (Luka only has write), so it's on you. It's safe:
**just creating Environments and secrets runs nothing** — no workflow fires
from adding a secret, and the prod web workflows keep their inline fallback
until we deliberately rewire them later (§6 in `docs/ENVIRONMENTS.md`), which we
are **not** doing here. The `production` environment's required-reviewer rule
below only makes prod deploys *safer*.

Repo: **`gilavi/Sarke2.0`** → **Settings → Environments**.

---

## 4a. Create environment `staging`

1. **New environment** → name it exactly `staging` → no protection rules.
2. Add these **Environment secrets**:

| Secret name | Value |
|---|---|
| `SUPABASE_PROJECT_REF` | `oiwkfzadftmgmshidyqx` |
| `SUPABASE_DB_PASSWORD` | *(staging Supabase DB password — Luka has it)* |
| `VITE_SUPABASE_URL` | `https://oiwkfzadftmgmshidyqx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_if2XIf1WB03rHEC0PQKNSg_eJ4frwNu` |

(ref / URL / anon key are non-secret and already live in the repo. The DB
password is the only secret value here — get it from Luka via a password
manager / secure channel, not plain chat.)

---

## 4b. Create environment `production`

1. **New environment** → name it exactly `production`.
2. **Add protection rules:**
   - Check **Required reviewers** → add yourself (and/or Luka).
   - Under **Deployment branches and tags**, restrict to **`main`** only.
   - *(This is the gate that makes any production DB migration pause for manual
     approval. It's a safety feature.)*
3. Add these **Environment secrets**:

| Secret name | Value |
|---|---|
| `SUPABASE_PROJECT_REF` | `seskuthiopywrgntsgfw` |
| `SUPABASE_DB_PASSWORD` | *(prod Supabase DB password — you have it)* |
| `VITE_SUPABASE_URL` | `https://seskuthiopywrgntsgfw.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_OF_L2E27-Uv8MMw87fWfSA_znD7moYY` |

(The prod URL + anon key are already public in `app.config.ts` — safe. Only the
DB password is secret.)

---

## 4c. Repo-level (shared) secrets

Settings → **Secrets and variables → Actions → Repository secrets** → **New repository secret**:

| Secret name | Where to get it |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | Supabase dashboard → account menu (top-right) → **Access Tokens** → generate one |
| `EXPO_TOKEN` | expo.dev → the `hubble-ge` org → **Settings → Access Tokens** → create one |

These are shared across both environments (the Supabase CLI is scoped per run by
`--project-ref`, so one access token is fine for both projects).

---

## When done

Ping Luka. After this exists, the staging CI (`db-and-functions.yml` on push to
`develop`, `deploy-web-app-staging.yml`) can run against the staging project, and
the prod path stays gated behind the `production` environment's approval.

> Optional, recommended later: move the repo into a GitHub **Organization** and
> add Luka as **Admin** so repo-settings tasks like this aren't blocked on you
> next time (GitHub personal repos can only have one admin). Same pattern as the
> `hubble-ge` Expo org. Repo Settings → Danger Zone → **Transfer ownership**.
