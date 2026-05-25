# Push pre-flight record — 2026-05-25 (session push)

## C1 — Local checks

- `git status --porcelain` → empty
- `git branch --show-current` → `main`
- `npm run typecheck` → pass (`tsc --noEmit` clean)
- `npm run check:primitives` → `check-primitives: ok`

## C2 — Sync safety

- `git fetch origin` → only `gh-pages` advanced (`05ba5b0..a006e1e`); `origin/main` unchanged at `43fb31e`.
- `git log HEAD..origin/main --oneline` → empty (origin has no commits ahead of HEAD).
- Push is a clean fast-forward.

## Scope to be pushed

```
5843788 docs: multi-task session report artifact
55beec9 docs: session report for 2026-05-25
db9889a docs(claude): record search_path requirement on new public functions
6dc5527 docs(readme): mark resolved issues from session 2026-05-25
07819be docs(ai-briefing): note account deletion compliance and search_path pattern
2761790 docs(whats-new): log 2026-05-25 multi-task session and database compliance
0a7c778 docs(bugs): mark session 2026-05-25 entries as resolved
a6ac294 chore(db): drop duplicate FK constraints from cascade migration
37a1c20 feat(db): cascade user deletion through all user-owned tables (App Store 5.1.1(v))
d29aa3b chore(db): pin search_path on all public functions for cross-context safety
b6f5212 refactor(more): remove duplicate password change row; access is now via Profile screen
8486713 fix(inspections): wire project_id from project-page create flow; add service-level guard
6172f31 refactor(slings-wizard): simplify step 1 layout; type selector → sheet; fix duplicate label
db0ec1a feat(profile): add in-app profile editing and account deletion
442aa65 feat(ui): shorten inspection display names; PDFs unchanged
```

15 commits, 38 files changed, +1,476 / −114.
