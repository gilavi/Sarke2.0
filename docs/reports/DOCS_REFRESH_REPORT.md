# Docs Refresh — Final Report

Surgical doc-refresh pass after the v1 feature-sliced refactor (2026-05-24) and the v2 polish pass (2026-05-25). Paired with a New Architecture diagnosis. Local-only; no `git push`. The pre-pass state can be restored with `git reset --hard pre-newarch-and-docs`.

---

## Files edited

| File | Before | After | Δ | Change summary |
|---|---:|---:|---:|---|
| `NEWARCH_REPORT.md` | — | 78 | new | Full diagnosis report: New Arch is ON via `app.json` + reanimated 4.x runtime requirement; per-package compat check; manual verification steps; rollback recipe. |
| `README.md` | 276 | 278 | +2 | Repository Layout: `app/` row notes orchestrator pattern, `components/` row updated for the `ui.tsx` → `ui/` folder split + per-folder `AGENTS.md`, `lib/` row updated for `services/` and `pdf/` domain splits + re-export barrels, new `features/` row added. Stack: New Architecture bullet added. |
| `CLAUDE.md` | 86 | 98 | +12 | New "File-size targets" section (Component < 200, Hook < 150, Route < 300, Service < 500) with reference to `REFACTOR_SUMMARY_V2.md` for current residues. One bullet added under "Things to Avoid" about not re-consolidating the domain splits. |
| `docs/AI_BRIEFING.md` | 213 | 215 | +2 | Updated date + last-sync date to 2026-05-25. Core Facts: added `**Architecture:** Feature-sliced.` line. Technology Stack: added `New Architecture (Fabric + TurboModules) — enabled` line to the Mobile stack. |
| `docs/WHATS_NEW.md` | 468 | 522 | +54 | Updated date to 2026-05-25. Prepended two entries: 2026-05-25 (v2 polish pass) with subsections for GridRowStep fix, project-detail extraction, template CSS split, useWizardState partial split, dead useMemo removal, and the New Arch verification; 2026-05-24 (v1 feature-sliced refactor) with subsections for `features/` folder + per-module AGENTS.md, `lib/services/` split, `lib/pdf/` split, `components/` god-file splits, repo-root cruft removal, and bugs spotted but carried into v2. |
| `BUG_REPORT.md` | 533 | 565 | +32 | Three new resolved entries logged for the refactor pass: P3 GridRowStep conditional hook calls (FIXED v2, commit `584fb17`), P4 MeasureInput dead `useMemo(getstyles)` (FIXED v2, commit `4247d48`), P4 dead step components in `app/orders/new.tsx` (dropped during v1, commit `c794f9f`). No existing entries deleted. |
| `ONBOARDING.md` | 368 | 353 | -15 | Updated date + branch note. Mobile stack: SDK 55 → SDK 54 (factual correction), New Arch line added. Web-App stack: React 18 → React 19 (factual correction). Migrations count 42 → 52. Branch State section (commit hashes from 2026-05-14, plus the two "what's only on X" lists for a now-merged branch) replaced with a short generic note pointing to `git log` and `docs/WHATS_NEW.md`. PDF Generation Pipeline updated to reflect the unified `lib/inspection/` engine, the domain-split `lib/pdf/order/` + `lib/pdf/inspection/`, and `pdfShared.ts`'s legacy status. "Add a new inspection type" recipe gained a header pointing to `docs/primitives.md` and the schema-engine step replacing the legacy `lib/<name>Pdf.ts` + `lib/<name>Service.ts` instructions. |
| `DOCS_REFRESH_REPORT.md` | — | (this file) | new | This report. |

Total: **7 files touched, 1 new report file added**, all in 7 commits (one per file).

---

## Files already accurate — not changed

- `docs/primitives.md` — current as of 2026-05-22; the inspection-engine, web-equipment-detail, no-shadows, image-helpers, keyboard, and PDF security/gate entries all match the post-refactor reality.
- `docs/payments.md` — BOG flow unchanged by the refactor.
- `REFACTOR_SUMMARY.md`, `REFACTOR_SUMMARY_V2.md`, `REFACTOR_NOTES.md` — these are the source-of-truth records for the refactor passes themselves; they were not edited (only referenced from other docs).
- `QA_REPORT_*.md` — historical reports per the CLAUDE.md rule "do not edit historical QA reports."
- All per-module `AGENTS.md` files — they were updated during the v1 and v2 commits themselves (see [`CLAUDE.md`](CLAUDE.md#per-module-context) and [`REFACTOR_SUMMARY_V2.md`](REFACTOR_SUMMARY_V2.md)); no fresh patches needed here.

---

## Surfaced for human review — too stale to safely patch

### `docs/AI_BRIEFING.md` — Directory Structure ASCII tree (lines ~52–122)
The brief in B3 said "Do not change anything else in this file" so the tree was left as-is, but it shows the pre-refactor `lib/` layout (lists `lib/bobcatService.ts` etc. without `lib/services/`, `lib/pdf/`, or `features/`). The lib-level service files do still exist on disk, so the tree is incomplete rather than wrong, but a future contributor reading it cold would miss the domain splits. Suggested fix: re-issue the tree with `features/`, `lib/services/{real,mock}/`, `lib/pdf/{order,inspection}/` shown.

### `ONBOARDING.md` — Feature Inventory → "Inspection Types" + "Web Dashboard Pages" tables
The Inspection Types table lists template UUIDs but uses values that conflict with the README's templates table (e.g. ONBOARDING shows bobcat as `33333333-…` and large-loader as `44444444-…`, while README has only one bobcat row pointing to `33333333-…` and a distinct mobile-scaffold at `33333333-…`). Some of this is two-templates-share-one-row vs one-template-per-row presentation, but the UUIDs need a single reconciliation pass against `supabase/seed/01_system_templates.sql` + the migrations. The Web Dashboard Pages table appears to predate the dashboard routing refactor (`/orders/:id`, `/cargo-platform/:id`, `/safety` etc. are listed but the page-file names may have drifted to `features/inspections/equipment/<Type>Detail.tsx` per the 2026-05-21 entry in `docs/WHATS_NEW.md`). Verifying this needs a walk through `web-app/src/app/router.tsx` — out of scope for a surgical pass.

### `ONBOARDING.md` — "For AI — Where to Find Things" table (final rows)
The "See how mobile inspection data is fetched" row points at `lib/<feature>Service.ts` (e.g. `lib/bobcatService.ts`) — those files still exist but most types now go through `makeInspectionService(...)` (the file is a thin wrapper). Could be patched but the row is still directionally correct.

### `ONBOARDING.md` — PDF Generation Pipeline → "Web" subsection
References `web-app/src/lib/orderPdf.ts` and `web-app/src/pages/print/` — still accurate, but the recent web-dashboard refactor (2026-05-21) added `web-app/src/features/inspections/equipment/` which is the canonical owner for equipment inspection detail pages now. Not patched because the section is about PDF generation specifically and the print pages remain in `pages/print/`.

### README → Repository Layout → `ios/` row
The row says "Native iOS scaffold (legacy reference; primary native port is on `ios-legacy` branch)." There is no `ios/` folder on `main` (the NEWARCH_REPORT.md confirms this) — the row exists either by historical inertia or because someone expected it to be there. Either delete the row or update it to "(not present on `main`; native port lives on `ios-legacy`)." Left alone per the "surgical patches only" constraint; flagged here for the next maintainer.

### `BUG_REPORT.md` — overall date stamp
The file title says "Tester: Claude … Date: 2026-04-25 … Build: main @ `1ebe2f8`" but the latest entries are from 2026-05-22 and now 2026-05-24. The header has become a misnomer (it's now a rolling bug log, not a single test-pass report). Renaming would be a non-surgical change; left alone.

---

## Commits from this session

```
4ff9589 docs(newarch): verify New Architecture is ON; record diagnosis
d5c0d98 docs(readme): refresh Repository Layout and Stack post-refactor
a994d0a docs(claude): add file-size targets and consolidation-avoid rule
17c7f05 docs(ai-briefing): note feature-sliced architecture and New Arch status
235a8ba docs(whats-new): log feature-sliced refactor v1+v2 and New Arch status
b67e0b0 docs(bugs): log refactor-resolved entries (GridRowStep, MeasureInput, dead order steps)
bd8de09 docs(onboarding): refresh stack versions, branch state, PDF pipeline, new-type recipe
```

7 commits on `main`, ahead of `origin/main`. Review with:

```sh
git log --oneline pre-newarch-and-docs..HEAD
git diff pre-newarch-and-docs..HEAD --stat
```

Rollback (if any change is unwanted):

```sh
git reset --hard pre-newarch-and-docs
```

Remote untouched; no `git push` performed.
