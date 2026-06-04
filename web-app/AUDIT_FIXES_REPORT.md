# Web dashboard audit — fixes report (2026-06-04)

Branch: **`web/audit-2026-06-04`** (off latest `main`). Scope: **`web-app/` only** (plus
ONE corrective SQL migration in `supabase/migrations/`, created for review — **not applied**).
Nothing pushed. Review with `git diff main...web/audit-2026-06-04`.

---

## ▶ Supabase steps for Luka (run these yourself, top to bottom)

You have full SQL-editor access; I only have the anon key, so the DB steps are yours. The
slide-photo RLS bug (P0-1) is a **migration-drift** problem: the deployed `report-photos`
policies differ from git, and the fix lives in the shared DB. Run these in order.

### 1. Diagnose (paste into the SQL editor, read the result)

```sql
-- a) report-photos storage policies
select policyname, cmd, qual, with_check from pg_policies
 where schemaname='storage' and tablename='objects'
   and (coalesce(qual,'') ilike '%report-photos%' or coalesce(with_check,'') ilike '%report-photos%');

-- b) reports table policies
select policyname, cmd, qual, with_check from pg_policies
 where schemaname='public' and tablename='reports';

-- c) the bucket
select id, name, public from storage.buckets where id='report-photos';

-- d) BONUS — same check for incident-photos (likely the same drift; see "New findings")
select policyname, cmd, qual, with_check from pg_policies
 where schemaname='storage' and tablename='objects'
   and (coalesce(qual,'') ilike '%incident-photos%' or coalesce(with_check,'') ilike '%incident-photos%');
```

**What to look for** in result (a), the **INSERT** row (`cmd = 'INSERT'`):

- If its `with_check` mentions **`owner`** (e.g. `owner = auth.uid()`) or **`foldername`**
  (e.g. `(storage.foldername(name))[1] = auth.uid()::text`) → **that is the bug.** On a
  storage INSERT the `owner` column is NULL when `WITH CHECK` runs, so an owner check
  rejects every upload; and our upload path is `${project_id}/${report_id}/…` (starts with
  the project id, not the uid), so a path/`foldername` check fails too.
- The **correct** INSERT `with_check` is auth-only: `(bucket_id = 'report-photos' AND auth.uid() IS NOT NULL)`.
- Note the **exact `policyname`** of the INSERT row — you may need it in step 2.

In result (b), the **UPDATE** row should already be `with_check: (user_id = auth.uid())`
(that's migration `0045`). If it still uses an `exists (select … from projects …)` sub-query,
step 2 re-asserts the correct one.

### 2. Apply the fix

This is the content of **`supabase/migrations/0054_report_photos_insert_authonly.sql`**
(already in the repo on this branch — applying it here keeps repo and DB in sync):

```sql
-- storage: report-photos INSERT -> auth-only
drop policy if exists "report-photos insert"       on storage.objects;
drop policy if exists "report-photos auth insert"  on storage.objects;
drop policy if exists "report-photos owner insert" on storage.objects;

create policy "report-photos insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'report-photos' and auth.uid() is not null);

-- reports table: UPDATE -> owner-based (re-assert 0045)
drop policy if exists "reports owner update" on reports;

create policy "reports owner update" on reports
  for update to authenticated
  using      (user_id = auth.uid())
  with check (user_id = auth.uid());
```

> **If the diagnostic showed the INSERT policy under a different name** than the three
> dropped above, add `drop policy if exists "<that exact name>" on storage.objects;` before
> the `create`. (The three names cover the git name from `0019` plus the owner/auth naming
> `0020`/`0053` used for the other buckets.)

Repo file this corresponds to: `supabase/migrations/0054_report_photos_insert_authonly.sql`.

### 3. Verify

```sql
-- Re-run diagnostic (a); the report-photos INSERT with_check should now read exactly:
--   (bucket_id = 'report-photos'::text AND auth.uid() IS NOT NULL)
select policyname, cmd, with_check from pg_policies
 where schemaname='storage' and tablename='objects'
   and cmd='INSERT' and coalesce(with_check,'') ilike '%report-photos%';
```

Then the **app check**: open a draft report → add a slide **with a photo** → it should save
with no "row-level security" error. (The code now also rolls back the uploaded photo if the
row write fails, so a failure won't leave an orphan blob either.)

### 4. Reconcile drift (P0-2) — after you paste me the diagnostic output

`0020_storage_rls_and_timestamps.sql` is a **one-line stub** ("applied via Management API")
and `0053` was also applied out-of-band, so the deployed `storage.objects` policies for
`incident-photos` / `report-photos` (and possibly others) live only in prod. To make the
repo able to rebuild prod:

1. Paste me the full output of diagnostic (a) **and** (d) (and, if you want a complete
   reconciliation, the equivalent `pg_policies` rows for `certificates`, `answer-photos`,
   `pdfs`, `signatures`).
2. I'll turn `0020` from a stub into the **actual deployed DDL** (idempotent `drop policy if
   exists … ; create policy …`), matching what's live, so a fresh `supabase db push` rebuilds
   the same policies. `0054` then layers the corrective change on top.
3. **Standardize on ONE deploy path: the Supabase CLI (`supabase db push`).** Stop using the
   Management API SQL endpoint for schema/policy changes — that's exactly what created this
   drift (changes that never landed in git). Keep every future policy change as a numbered
   migration file and push it via the CLI.

### 5. Rollback (if anything regresses)

```sql
-- Revert the report-photos INSERT policy to auth-only is already the safe state; to undo
-- the reports UPDATE re-assert (unlikely needed), restore the pre-0054 form you captured
-- in step 1's diagnostic. The INSERT policy has no safe "more restrictive" rollback — the
-- auth-only form IS the correct one. If you must fully revert 0054:
drop policy if exists "report-photos insert" on storage.objects;
create policy "report-photos insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'report-photos' and auth.uid() is not null);
-- (i.e. there is no reason to revert the INSERT change; it only ever rejected valid uploads.)
```

---

## 1. Bugs fixed

| ID | Bug | Fix | Files |
|----|-----|-----|-------|
| **P0-1** | Adding a slide with a photo → `new row violates row-level security policy`. Migration drift: deployed `report-photos` storage policies differ from git. | (a) Corrective migration `0054` (review-only, see runbook). (b) Code: `addReportSlide` now rolls back the uploaded blob if the row write fails. | `supabase/migrations/0054_*.sql`, `src/lib/data/reports.ts` |
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
| **High** | **`incident-photos` likely has the same RLS drift as `report-photos`** (`0053` says `0020` owner-scoped both buckets out-of-band). If so, incident photo upload (`addIncidentPhoto`, `createIncident`) is broken by the same root cause. Diagnostic (d) in the runbook checks it; if its INSERT `with_check` mentions `owner`/`foldername`, add an `incident-photos` block to `0054` (same shape). |
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

See **▶ Supabase steps for Luka** at the top of this file (diagnose → apply → verify →
reconcile → rollback). The DB steps are yours to run; I cannot reach the DB with the anon key.

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
