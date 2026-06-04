# Web dashboard audit — fixes report (2026-06-04)

Branch: **`web/audit-2026-06-04`** (off latest `main`). Scope: **`web-app/` only** (plus
ONE corrective SQL migration in `supabase/migrations/`). Review with
`git diff main...web/audit-2026-06-04`.

---

## ▶ Supabase steps for P0-1 — ✅ APPLIED & VERIFIED (2026-06-04)

**Status: done.** Luka applied the fix on prod via the SQL editor and verified it: adding a
slide with a photo saves with no RLS error, photos display, and delete works. This section is
the canonical record of what was run; `supabase/migrations/0054_report_photos_authonly.sql`
matches it exactly.

### Root cause — path/folder mismatch (not just INSERT)

The deployed `report-photos` **INSERT, SELECT and DELETE** policies all required the
**report id** to be the **first folder** in the object path (a `storage.foldername(name)[1]`
path check). But the app uploads to `${project_id}/${report_id}/file` — the first segment is
the **project id**, never the report id — so the id never matched and every insert/read/delete
was rejected. (`0019` created auth-only policies in git, but `0020`/`0053` were applied
out-of-band via the Management API and replaced them with the path-scoped versions that only
lived in prod — migration drift.)

### The fix that was run (all three report-photos policies → auth-only)

```sql
drop policy if exists "report-photos insert" on storage.objects;
drop policy if exists "report-photos select" on storage.objects;
drop policy if exists "report-photos delete" on storage.objects;

create policy "report-photos insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'report-photos' and auth.uid() is not null);
create policy "report-photos select" on storage.objects
  for select to authenticated
  using (bucket_id = 'report-photos' and auth.uid() is not null);
create policy "report-photos delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'report-photos' and auth.uid() is not null);
```

Notes on scope:
- The reports **table** policies were **not** touched — `0044`/`0045`/`0046` already make them
  owner-based (`user_id = auth.uid()`).
- **`incident-photos` was not touched** — its INSERT was already auth-only (verified). The
  earlier "High" incident-photos suspicion was a **false alarm** (see New findings).

### Repo record

`supabase/migrations/0054_report_photos_authonly.sql` contains exactly the SQL above. It is
idempotent (safe to re-run) and documented as already applied to prod.

### Reconcile drift (P0-2) — still open, optional

`0020_storage_rls_and_timestamps.sql` is a one-line stub ("applied via Management API") and
`0053` was also applied out-of-band, so the deployed `storage.objects` policies for the other
buckets (`certificates`, `answer-photos`, `pdfs`, `signatures`) still live only in prod. To
let the repo rebuild prod: paste me their `pg_policies` rows and I'll turn `0020` from a stub
into the actual deployed DDL. **Recommendation:** standardize on the Supabase CLI
(`supabase db push`) for all future policy changes — the Management API path is what created
this drift.

### Verify / rollback

```sql
-- Verify: the three report-photos with_check/qual should all read auth-only:
select policyname, cmd, qual, with_check from pg_policies
 where schemaname='storage' and tablename='objects'
   and (coalesce(qual,'') ilike '%report-photos%' or coalesce(with_check,'') ilike '%report-photos%');
-- Each should be: (bucket_id = 'report-photos'::text AND auth.uid() IS NOT NULL)
```

There is no reason to roll back — the auth-only policies only ever *allowed* valid access; the
prior path-scoped ones rejected everything. (To fully re-run, just re-paste the fix block above.)

---

## 1. Bugs fixed

| ID | Bug | Fix | Files |
|----|-----|-----|-------|
| **P0-1** ✅ | Report slide photos broke on save/read/delete. **Path/folder mismatch (migration drift):** the deployed `report-photos` INSERT/SELECT/DELETE policies all required the **report id** to be the first path folder, but uploads use `${project_id}/${report_id}/file` (project id is first), so the id never matched. | (a) Migration `0054_report_photos_authonly.sql` — all three `report-photos` policies switched to **auth-only** (applied to prod & verified 2026-06-04). (b) Code: `addReportSlide` rolls back the uploaded blob if the row write fails. | `supabase/migrations/0054_report_photos_authonly.sql`, `src/lib/data/reports.ts` |
| **P1-1** | "Upload to storage, then write row" with no rollback → orphaned blobs on failure (a whole class). | `try/catch` + best-effort `removeObjects(...)` before re-throw at every site. | `reports.ts` (addReportSlide), `incidents.ts` (addIncidentPhoto, createIncident), `certificates.ts` (uploadCertificate), `projectFiles.ts` (uploadProjectFile), `pages/InspectionDetail.tsx` (answer-photo loop) + rollback unit tests |
| **P0-3** | Raw English Postgres/Supabase errors shown to Georgian-speaking users (~37 files). | New `lib/errors.ts` (`humanizeError`, `toastError`, `rawErrorMessage`, `isTransientError`) + i18n `errors.*` namespace. Routed through the central chokepoints (`useEntityMutation`, `AsyncBoundary`/`ErrorView`) and swept ~35 inline sites. Raw error still logged to console. | `lib/errors.ts` (new), `lib/i18n.ts`, `lib/query/useEntityMutation.ts`, `components/async/AsyncBoundary.tsx`, + ~35 pages/components |
| **P0-4** | ReportDetail add-slide failure showed BOTH a toast and an inline `<ErrorMessage>`. | App-wide rule adopted: **form-submission errors → inline**, **standalone actions (delete/complete/row) → toast**. Add-slide is now inline-only. | `src/pages/ReportDetail.tsx` |
| **P1-2** | Slide title/desc used `defaultValue`+`onBlur`: a failed save kept the new text (silent divergence) and `defaultValue` never resynced on refetch. | Extracted controlled `SlideCard`: edits resync from the server value and **revert on failed save**. Swept other sites: `InspectionDetail` info fields now `.catch(toastError)`+resync (were a silent unhandled rejection); `BriefingDetail` got `key=` resync. | `src/components/reports/SlideCard.tsx` (new), `src/pages/ReportDetail.tsx`, `src/pages/InspectionDetail.tsx`, `src/pages/BriefingDetail.tsx` |
| **P1-3** | `useEffect(…, [item])` re-opened the add-slide form whenever a draft had 0 slides (fires on every refetch). | One-shot gate keyed by `item.id` + ref. | `src/pages/ReportDetail.tsx` |
| **P1-4** | `Button size="icon"` → wide pill (mapped to `'md'`); `buttonVariants` was a `()=>''` stub. | `icon` now renders a 36×36 square. **`buttonVariants` was NOT dead** — 4 list pages used it to style their "+ new" `<Link>` CTAs, which therefore rendered with **no styling at all**. Removed the stub; converted those to `<Button component={Link}>` (Button now accepts polymorphic `component`/`to`). | `src/components/ui/button.tsx`, `Orders/Briefings/Reports/Incidents.tsx` |
| **P1-5** | Mutations had no retry; one Wi-Fi blip lost a write. | QueryClient retries mutations on **transient network errors only** (new `isTransientError`), max 2× with backoff — never RLS/duplicate/validation (pointless + double-write risk). | `src/App.tsx`, `src/lib/errors.ts` |
| **P2** | Two ambiguous PDF buttons; popup-blocked `window.open` had no fallback; signed-URL query keyed on a fresh array ref (churn); blank slide submittable; icon delete button missing `aria-label`; no focus into the add-slide form. | All fixed in ReportDetail: buttons relabelled ("ბეჭდვა / PDF" vs "შენახული PDF") with popup fallbacks; signed-URL query keyed on a stable path string; "at least one of {title, photo}" inline validation; `aria-label` on the delete button (in `SlideCard`); focus moves to the title field on open. | `src/pages/ReportDetail.tsx`, `src/components/reports/SlideCard.tsx` |
| **Tooling** | `npm run lint` crashed on Windows (`check-no-shadows.mjs` produced `C:\C:\…`). | `fileURLToPath` instead of `new URL(..).pathname`. The lint gate now runs on Windows. | `web-app/scripts/check-no-shadows.mjs` |

## 2. Animations / interactions added

All gated on `prefers-reduced-motion` via a single app-root `<MotionConfig reducedMotion="user">`
(previously only 2 places honored it).

| § | What | Files |
|---|------|-------|
| **foundation** | `<MotionConfig reducedMotion="user">` at the app root — every framer-motion animation now respects the OS reduced-motion setting. | `src/App.tsx` |
| **5.1** | Report slide list `<AnimatePresence>` + `SlideCard` as a `layout` motion item with spring entrance/exit. | `ReportDetail.tsx`, `SlideCard.tsx` |
| **5.5** | Home quick-action tiles: `hoverLift` spring + icon scale (was a flat color swap). | `src/pages/Home.tsx` |
| **5.6** | Optimistic add (shimmer placeholder card while saving) + **undo on delete** via a sonner action toast (the destructive delete + blob removal only commits when the undo window elapses). | `ReportDetail.tsx` |
| **5.7** | cmdk palette: added "new report / inspection / incident / briefing / order / project" action commands (it was already mounted + ⌘K-bound, but nav-only). | `src/components/cmdk/CommandPalette.tsx` |
| **5.8** | Animated dashboard stat counters (`<AnimatedNumber>` spring count-up; static under reduced motion). | `src/components/AnimatedNumber.tsx` (new), `Home.tsx` |
| **5.9** | Route crossfade: the protected `Outlet` fades/slides in, keyed on pathname. | `src/app/router.tsx` |

This also put the previously-unused `animations.ts` exports `hoverLift` (and `SPRING.counter`) to work.

## 3. New findings from my own investigation

| Severity | Finding |
|----------|---------|
| ~~High~~ → **False alarm (confirmed)** | I suspected `incident-photos` had the same RLS drift as `report-photos`. **Checked on prod 2026-06-04: its INSERT was already auth-only**, so incident photo upload was never affected. No change made to `incident-photos`. |
| **Med** | **Deploy-path drift (P0-2)** is systemic: `0020` + `0053` were applied via the Management API and never landed as real DDL in git, so the repo can't rebuild prod's storage policies. Runbook §4 has the reconciliation plan; recommend standardizing on `supabase db push`. |
| **Low** | **cmdk palette is mounted and ⌘K-bound** (contradicts the original audit's worry) — `router.tsx:147`. It just lacked action commands (now added) and has no *visible* trigger (a discoverability gap; I left it rather than restyle the sidebar without approval). |
| **Low** | **`EditProject` resets form state in `useEffect(…, [project])`** (whole-object dep) — same class as P1-3; a background refetch could reset an in-progress edit. Low risk (loads once), left as-is and noted. |
| **Low** | **`useEntityMutation`'s exported `errorMessage`** is a raw extractor still used by `StructuredInspectionWizard`; left intact (it's the raw path; `humanizeError` is the user-facing path). |
| **Info** | **Bundle health** (3.3 MB JS total): `threejs-*.js` **896 KB** (decorative `Scene3D`), `vendor-*.js` **1.1 MB** (Mantine + Radix + framer), `leaflet` 152 KB. Dual icon libs (`lucide-react` + `@phosphor-icons/react`) and dual UI systems (Mantine + Radix dialogs/dropdowns). Recommendations below — **not acted on** (touches visuals/deps → out of scope until branding). |

### Bundle recommendations (do not act without approval — touches visuals/deps)

1. **three.js / @react-three (896 KB)** is the biggest win. It is already code-split (only loads with `Scene3D`), but if `Scene3D` is decorative, consider dropping it or replacing with a static asset — that removes ~900 KB from any route that mounts it.
2. **Consolidate icons** to one library (lucide is used app-wide; phosphor only for nav gems).
3. **Mantine + Radix overlap** (both provide dialog/dropdown/popover). Long-term, pick one to shrink `vendor`.

## 4. Supabase runbook

See **▶ Supabase steps for P0-1 — ✅ APPLIED & VERIFIED** at the top of this file. The fix
(all three `report-photos` policies → auth-only) is live on prod and verified; the only
remaining open item there is the optional drift reconciliation (P0-2) for the other buckets.

## 5. Deferred / blocked

| Item | Why | Suggested next step |
|------|-----|---------------------|
| **§5.2 drag-to-reorder slides** | Framer `Reorder` conflicts with the inline-editable title/description (drag vs text selection) — it needs a dedicated drag handle, and it must coexist with the existing `AnimatePresence` (add/remove) + undo flow in the same list. Shipping it rushed risked a janky list. | Add a `reorderReportSlides(report, orderedIds)` data fn (single JSONB `UPDATE` — the `0019` migration is designed for this) + `Reorder.Group`/`Reorder.Item` with a `GripVertical` drag handle (`dragListener={false}` + `useDragControls`). |
| **§5.3 add-slide bottom sheet + drag-drop/paste** | Net-new UI (a drawer + drop zone + clipboard-paste handler). Larger than an audit-fix; the inline form works and was hardened (validation, focus, inline errors). | Build on the Radix Dialog already in use, or add one small drawer lib **after your approval** (new dep). |
| **§5.4 confetti + success modal on report completion / first PDF export** | The confetti + `SuccessModal` infra exists and **already fires for inspection completion**. Reports have **no draft→completed action in `ReportDetail`** (completion isn't surfaced on this page), and "first PDF export" needs persisted "first" tracking. No clean in-page hook. | Wire once a report-completion action exists on the page, or fire `useConfetti` on the first `openPrintView` per report (needs a per-report "seen" flag). |
| **Auth-page error copy** | `Login/Forgot/Register/Reset` use their own Georgian fallbacks (and `VerifyEmail` has a `friendlyMessage` mapper). Left as-is — they handle auth-specific errors and aren't the raw-backend-error class P0-3 targeted. | Optional: route them through `humanizeError` too for consistency. |
| **Structured-wizard row inputs** (`GeneralEquipmentList`, `ChecklistItemRow`, etc.) `defaultValue`+`onBlur` | These edit **local draft state** (persisted on explicit wizard save), not remote per-field writes — so they are not the silent-divergence class P1-2 targeted. | None needed; noted for completeness. |

## 6. Check results (run from `web-app/`)

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` (typecheck) | ✅ clean |
| `npm run test` (vitest) | ✅ **111 files / 713 tests pass** (was 110/693 at baseline; +20 new tests, +1 file) |
| `npm run lint` | ✅ runs (Windows path bug fixed); **54 problems (34 errors, 20 warnings)** — **2 fewer than the 56 baseline**, **0 introduced**. All remaining are pre-existing (`no-explicit-any` ×17, `set-state-in-effect` ×12, `only-export-components` ×9, `no-restricted-imports` ×8, …). |
| `npx vite build` | ✅ clean |
| `npm run smoke` (Playwright) | ✅ passes (needed `npx playwright install chromium` once) |

## 7. md files updated

- `web-app/REDESIGN_NOTES.md` — corrected the `check-no-shadows.mjs` Windows-path gotcha (now fixed); added the error-handling + reduced-motion conventions.
- `web-app/src/components/reports/AGENTS.md` — **new**, for the extracted `SlideCard`.
- `web-app/AUDIT_FIXES_REPORT.md` — **this file**.
