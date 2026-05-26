# web-app — Comprehensive Testing Plan

> Scope: the **`web-app/` dashboard** (sarke-web) only. The root `TESTING.md`,
> `tests/`, `e2e/`, `__tests__/`, `vitest.config.ts`, `playwright.config.ts`
> belong to the **Expo mobile app** and are out of scope here.
> Plan only — no test code is written yet.

---

## 0. Premise corrections (read first)

The originating request made several assumptions that do **not** match this codebase.
Correcting them up front so the plan is grounded in reality:

| Assumption in request | Reality in `web-app/` |
|---|---|
| "Next.js app, base URL `:3000`" | **Vite 6 + React 19 + React Router 6 (HashRouter) + Zustand + TanStack Query + Mantine + Radix.** No Next.js. Dev server is `:5173`; preview is `:4173`. |
| "Set up Vitest + coverage (Week 1)" | **Already set up.** Vitest 4, `@vitest/coverage-v8`, Testing Library (react/user-event/jest-dom), jsdom, `@playwright/test` are installed. Scripts `test`, `test:watch`, `test:coverage`, `smoke` exist. `vitest.config.ts` + `src/test-setup.ts` + `src/test-utils.tsx` are in place. |
| "Use MSW to mock Supabase" | Established pattern here is **module-level `vi.mock('@/lib/supabase')` / `vi.mock('@/lib/data/*')`**, not network mocking. MSW would be a redundant second pattern — **not recommended** (see §5). |
| Test `inspectionNaming.ts`, `pdfSecurity.ts`, `location.ts`, `usePhotoWithLocation`, `useProjectPeoplePool`, `useSubscription`, `QuestionTable`, `VerdictSelector`, `useInspectionWizard` | **None of these exist in `web-app/`.** They are Expo mobile-app files. Web equivalents: `documentNames.ts`, print routes, `usePdfUsage`/`subscription.ts`, `HarnessChecklist`, the inline verdict `SegmentedControl`, `InspectionWizard.tsx`. |
| "Breathalyzer log (ჟურნალი): add 3 entries → close shift → PDF" | **No such feature on web.** Only a one-time *alcohol-control order* document. Journey dropped. |
| "Free tier: 3 PDFs → 4th blocked" | Free limit is **30** (`PDF_FREE_LIMIT`), and **the PDF gate is wired into nothing on web yet** — web PDFs are browser print (`openOrderPdfPreview` + `pages/print/*`), which never calls `checkAndIncrementPdfCount`. The paywall-after-N-PDFs journey is **not testable until the gate is wired** (see §4). |

Files that *do* exist and match the request: `SegmentedControl`, `SuccessModal`, `PhotoUploadZone`, `FloatingLabelInput`.

---

## 1. Current State

> **Progress update (2026-05-26):** Weeks 1–2 batch landed. Added a shared Supabase
> chain-mock helper (`src/__tests__/helpers/supabaseChain.ts`) plus suites for: the
> whole **`src/lib/data` layer** (inspections, orders, projects, incidents, reports,
> briefings, certificates, qualifications, account, projectFiles, templates,
> regulations, and the 4 equipment modules), **`lib/`** (orderPdf, db/storage,
> db/repository, photoUpload, printable, documentNames, subscription, animations,
> theme), shared **components** (SegmentedControl, SuccessModal, StatCard, charts,
> FloatingLabelInput, Button/Card, SkeletonCard), and **store/hooks**
> (useSafetySelectors, useConfetti). Then the **page layer**: a `renderPage` helper
> (MantineProvider + QueryClient + MemoryRouter) plus mount/interaction suites for
> auth (Login/Register/Forgot/Reset/VerifyEmail), list pages (Projects, Inspections,
> Incidents, Reports, Briefings, Orders, Certificates, Qualifications), dashboards
> (Home, History, Account), misc (Terms, NotFound, SafetyGuide, Subscribe family),
> forms (NewProject, NewReport, NewBriefing), and detail pages (OrderDetail + the
> not-found branches of Incident/Briefing/Harness detail). Then an expansion pass
> added: **Landing + sections** (full marketing render), **all 8 print pages**
> (Bobcat/Excavator/General/Cargo/Inspection/Incident/Briefing/Report — not-found
> + loaded), **list/edit pages** (Templates, Regulations, ProjectFiles, EditProject),
> **dashboards/New\*/forms** (Calendar, NewIncident, NewOrder, NewInspection, the
> 4 equipment-New pages, InspectionDetail), **detail-page loaded states**
> (IncidentDetail, BriefingDetail, HarnessInspectionDetail, ReportDetail,
> ProjectDetail with sections mocked), **all 11 ProjectDetail sections**,
> additional **components** (SubscriptionCard 4 states, PaywallModal, ProjectAvatar,
> AppShell, navItems, ListRow, ExpandableRow, FieldInput, ProjectActivityWidget,
> Sidebar, ProjectModal, ProjectMap, WelcomeModal, QuickWinChecklist, PhotoGallery,
> AddressInput, SettingsModal, DeleteButton, WizardHeader/Footer, useWizardFlow,
> HarnessChecklist), and **i18n** init. Two **bugs fixed**:
> `photoUpload`/`incidents`×2/`reports`/`certificates` all had a `split('.').pop() ??
> fallback` dead-code pattern (a dotless filename used the whole name as the
> extension — would upload `photo.image` as `…/{uuid}.image`); now uses
> `lastIndexOf('.') > 0`. And `useSafetyActions` was missing `useShallow`, which
> would infinite-loop any component that consumed it; now wrapped. Also added an
> `IntersectionObserver` mock to `test-setup.ts` for `framer-motion`'s `whileInView`.
> A final expansion round added: **InspectionWizard** mount (the 940-LOC wizard,
> open + preset + edit variants), **InspectionInfoView**, **PhotoUploadZone**,
> **PhotoUploadWidget**, **InspectionSignatures**, **WizardSidebar**,
> **CommandPalette**, **SidebarNavList/SidebarFooter**, **InspectionDetail loaded
> view** (draft + completed), **EntityForm** + `useEntityForm`, **AsyncBoundary**
> (loading/error/empty/data variants), **usePdfUsage** hook (all status branches),
> a proper **AuthProvider/useAuth** suite (persisted-session read, profile fetch,
> signIn/signUp/signOut/sendPasswordReset/updatePassword — previously the
> `auth.tsx` module sat at 1.6% because the page tests mock the whole module),
> plus a batch of small components (ErrorBoundary, ProtectedRoute, WizardSteps,
> ChipSelect, ResultPills, VirtualList, SignatureCanvas, SidePanel, PrintLayout,
> `routes`).
>
> **Final state: 70 files / 520 tests, coverage 9.4% → 51.0% statements / 55.0%
> lines / 44.6% branches / 39.3% functions. Typecheck clean.** The remaining ~19
> points to reach a 70% statement bar are dominated by interactive multi-step
> flows that need integration-style tests, not mount-only: `pages/InspectionDetail`
> (945 LOC, 17%), `pages/NewOrder` (736, 21%), `components/InspectionWizard`
> (940, 48%) step transitions, and the four equipment-detail edit flows
> (`features/inspections/equipment/*`, ~30–50% each). Pushing those past 70%
> requires walking each wizard's steps with state changes — a meaningful next
> milestone, but a different shape of work than the mount-test scaffolding here.

**Existing test files (pre-batch): 11** (10 unit/component via Vitest + 1 Playwright smoke).

| File | Tests | Running? | What it covers |
|---|---|---|---|
| `src/__tests__/lib/utils.test.ts` | ✅ | yes | `cn()` class-merge helper — **100%** |
| `src/__tests__/lib/pdfGate.test.ts` | ✅ | yes | `PDF_FREE_LIMIT`, `PdfLimitReachedError`, `checkAndIncrementPdfCount` (rpc mock) — strong |
| `src/__tests__/lib/usePendingCreate.test.ts` | ✅ | yes | draft-commit hook — **87%** |
| `src/__tests__/store/safetyStore.test.ts` | ✅ | yes | Zustand store (select/hover/panel/camera) — strong |
| `src/__tests__/store/commandStore.test.ts` | ✅ | yes | command-palette store |
| `src/__tests__/components/StatusBadge.test.tsx` | ✅ | yes | status → label/color mapping |
| `src/__tests__/components/inspectionWizardPreset.test.tsx` | ✅ | yes | harness preset wiring |
| `src/__tests__/components/charts/TrendIndicator.test.tsx` | ✅ | yes | up/down/flat arrow + color |
| `src/__tests__/features/equipmentDetail.test.tsx` | ✅ | yes | **mount/smoke** for all 4 equipment detail flows (bobcat/excavator/general/cargo) — walks wizard steps on a completed act. Mocks data fns, keeps real catalogs. |
| `src/__tests__/documentName.test.ts` | ✅ | yes | `@root/lib/shared/documentName` naming rules (cross-platform) |
| `e2e-smoke/smoke.spec.ts` | ✅ | `npm run smoke` | Prod build mounts at `/app/#/home` with no uncaught JS errors. Does **not** log in. |

**Current coverage (`npm run test:coverage`, v8):**

```
Statements : 9.36%  (556/5934)
Branches   : 8.32%  (451/5417)
Functions  : 6.17%  (136/2202)
Lines      : 10.26% (511/4977)
```

By area: `src/store` ~69% · `src/lib/query` ~29% · `src/lib/db` ~15% · `src/lib/data` ~7%
(only the 4 equipment modules partially hit via the mount test) · `src/pages` **0%** across the board ·
most of `src/lib` (orderPdf, photoUpload, printable, subscription, usePdfUsage, theme, i18n, terms, animations) **0%**.

**Files with effectively zero coverage: ~180 of ~195 source files.** No thresholds are enforced yet
(`vitest.config.ts` leaves coverage thresholds commented out).

**CI today:**
- `.github/workflows/ci-web-app.yml` — on any `web-app/**` change: `typecheck` + `npm test` (Vitest, blocking) + `lint` (informational). **Coverage is not gated; the smoke test is not run in CI.**
- `.github/workflows/test.yml` — the **Expo** suite (lint, `test:unit`, `test:integration` against a real Supabase, `test:e2e` via `expo export -p web` + root `e2e/`). Unrelated to `web-app/`.

---

## 2. Files Requiring Tests

Priority rules applied: **critical** = business logic / data mutations / auth / payment / PDF;
**high** = shared components, hooks, query plumbing; **medium** = page components & wizards;
**low** = pure UI primitives & static content.

### Critical (business logic, mutations, auth, PDF, payment)

| File | Type | Cplx | Cov | Est. tests |
|---|---|---|---|---|
| `lib/orderPdf.ts` | util (PDF/HTML) | high | 0% | 18 |
| `lib/db/repository.ts` | util (CRUD factory) | high | 16% | 16 |
| `lib/db/storage.ts` | util (storage) | med | 10% | 12 |
| `lib/data/inspections.ts` | api | high | 0% | 22 |
| `lib/data/orders.ts` | api | med | 0% | 12 |
| `lib/data/projects.ts` | api | med | 0% | 14 |
| `lib/data/incidents.ts` | api | med | 0% | 10 |
| `lib/data/reports.ts` | api | med | 0% | 10 |
| `lib/data/briefings.ts` | api | med | 0% | 8 |
| `lib/data/{bobcat,excavator,generalEquipment,cargoPlatform}.ts` | api | med | ~35% | 10 each (40) |
| `lib/data/{certificates,qualifications,projectFiles,account,regulations,templates}.ts` | api | low–med | 0–11% | 5 each (30) |
| `lib/auth.tsx` | hook/ctx | high | 0% | 14 |
| `lib/pdfGate.ts` | util | low | ✅ done | — |
| `lib/usePdfUsage.ts` | hook | med | 0% | 9 |
| `lib/subscription.ts` | hook/api | low | 0% | 6 |
| `lib/photoUpload.ts` | util | low | 0% | 7 |

### High (shared components, hooks, query plumbing)

| File | Type | Cplx | Cov | Est. tests |
|---|---|---|---|---|
| `lib/query/useEntityMutation.ts` | hook | med | 23% | 10 |
| `lib/query/useEntityQuery.ts` | hook | low | ~30% | 4 |
| `lib/usePendingCreate.ts` | hook | low | ✅ 87% | +2 |
| `features/inspections/equipment/useEquipmentDetail.ts` | hook | high | partial | 12 |
| `lib/documentNames.ts` | util/hook | low | partial | 6 |
| `lib/printable.ts` | util | low | 0% | 6 |
| `components/wizard/SegmentedControl.tsx` | component | low | 0% | 8 |
| `components/web/SuccessModal/index.tsx` | component | med | 0% | 9 |
| `components/PhotoUploadZone.tsx` | component | med | 0% | 10 |
| `components/PhotoUploadWidget.tsx` | component | med | 0% | 8 |
| `components/inspections/HarnessChecklist.tsx` | component | med | 0% | 8 |
| `components/PaywallModal.tsx` | component | low | 0% | 5 |
| `components/SubscriptionCard.tsx` | component | med | 0% | 7 |
| `components/ui/floating-label-input.tsx` | component | low | partial | 5 |
| `components/SignatureCanvas.tsx` | component | med | 0% | 6 |
| `components/form/EntityForm.tsx` | component | med | 0% | 8 |
| `components/charts/{StatCard,Sparkline,ProgressRing,HeatmapCalendar}.tsx` | component | low | partial | 12 |
| `store/useSafetySelectors.ts` | util | low | 0% | 3 |
| `hooks/useConfetti.ts` | hook | low | 0% | 2 |

### Medium (pages & wizards) — tested as render/interaction suites

`src/pages/**` (≈45 files, all 0%): auth (`Login/Register/Forgot/Reset/VerifyEmail`),
`Projects` + `ProjectDetail/*` (12 section files), `Inspections`, `InspectionDetail` (945 lines),
`HarnessInspectionDetail`, the 5 `New*Inspection` pages, `NewOrder` (736) + `OrderDetail`,
`Incidents`/`NewIncident`/`IncidentDetail`, `Reports`/`NewReport`/`ReportDetail`,
`Briefings`/`NewBriefing`/`BriefingDetail`, `Certificates`, `Qualifications`, `Calendar`, `History`,
`Home`, `Account`, `Subscribe`/`SubscribeSuccess`/`SubscribeFail`, `Templates`, `Regulations`, `NotFound`.
Plus `components/InspectionWizard.tsx` (940) and the equipment detail pages (already mount-smoked).
**Est. ~120 tests** (≈2–4 per page: mount + happy-path + one empty/error state).

### Low (pure UI / static / 3D) — minimal or skip

`components/ui/*` primitives (button, card, select, dropdown, alert-dialog, etc.),
`pages/landing/*` + `pages/print/*` (snapshot-only), `data/safetyTips.ts`, `lib/terms.ts`,
`lib/animations.ts`, `lib/theme.tsx`, `lib/i18n.ts`. **Skip** `Scene3D.tsx`/`ConstructionModel.tsx`
(react-three-fiber — exclude from coverage, cover via the smoke test instead).
**Est. ~30 tests** (primitives variants) + coverage-exclude the 3D + generated `types/`.

---

## 3. Unit Test Plan (detailed)

> Conventions for every entry below: import the SUT, `vi.mock('@/lib/supabase', …)` or
> `vi.mock('@/lib/data/*', importOriginal)` as the existing tests do, `beforeEach(vi.clearAllMocks)`.
> Component tests use `render` from `@/test-utils` (wraps `MantineProvider`); add
> `QueryClientProvider` + `MemoryRouter` when the component reads them (pattern already in
> `equipmentDetail.test.tsx`). Assertions use the real Georgian UI strings.

### CRITICAL

---
**FILE:** `lib/orderPdf.ts`
**TYPE:** utility (pure HTML builders) — highest ROI, legal-document fidelity + XSS surface
**MOCK NEEDED:** none for builders; stub `window.open` for `openOrderPdfPreview`
**WHAT TO TEST:**
- `escHtml`: escapes `& < > "`; returns `''` for null/undefined; leaves safe text intact.
- **XSS regression:** a `companyName`/`objectName` containing `<script>`/`"` is escaped in the output of every builder (legal docs render untrusted user input into HTML).
- `fmtDate`: valid ISO → `dd.mm.yyyy` ka-GE; null/undefined → `'___________'`.
- `buildFireSafetyOrderHtml`: contains company/appointed/object fields; renders `<img src=…>` when `directorSignature`/`appointedSignature` present, `<span class="sig-underline">` when null; order number in footer.
- `buildFireSafetyOrderEnterpriseHtml`: includes the extra `appointedPosition`/`appointedIdNumber` + the №477/№457 legal clauses.
- `buildLaborSafetyOrderHtml`: certificate number/date, specialist personal id, 4 legal-basis bullets.
- `buildAlcoholControlOrderHtml`: responsible-person fields, zero-tolerance clause.
- Each builder returns a well-formed `<!DOCTYPE html>…</html>` string (snapshot the structure).
- `openOrderPdfPreview`: calls `window.open` + `document.write` + `document.close`; no throw when `window.open` returns null.
**EDGE/ERROR:** empty optional `objectAddress` omits the `, address` suffix; null signatures everywhere.
**ESTIMATED TESTS:** 18 · **PRIORITY:** critical

---
**FILE:** `lib/db/repository.ts`
**TYPE:** utility (generic CRUD factory + `mapDefined`)
**MOCK NEEDED:** `@/lib/supabase` (chainable `from().select().order().limit().eq()`, `.maybeSingle()`, `.insert().select().single()`, `.update().eq()`, `.delete().eq()`, `auth.getUser`)
**WHAT TO TEST:**
- `mapDefined`: copies only `!== undefined` keys; remaps camel→snake per `map`; ignores keys not in `map`; `null` is copied (only `undefined` skipped); empty patch → `{}`.
- `makeRepository.list`: applies `order`, `limit` (default 50; `null` → no limit), `.eq(projectColumn, …)` only when `projectId` truthy; maps rows via `toModel`; throws on error; `[]` on null data.
- `.get`: uses `maybeSingle`; returns `null` for no row; `toModel` on hit; throws on error.
- `.create`: calls `auth.getUser`; throws `NOT_AUTHENTICATED` ('არაავტორიზებული') when no user / on userErr; passes `toInsert(input, userId)`; returns `toModel(row)`.
- `.update`: **no-op (no Supabase call) when `toUpdate` yields `{}`**; otherwise `.update().eq('id')`; throws on error.
- `.remove`: `.delete().eq('id')`; throws on error.
- Honors `projectColumn` / `orderColumn` / `orderAscending` / `listLimit` overrides.
**ESTIMATED TESTS:** 16 · **PRIORITY:** critical

---
**FILE:** `lib/db/storage.ts`
**TYPE:** utility (canonical storage primitive)
**MOCK NEEDED:** `@/lib/supabase` → `storage.from().createSignedUrl/upload/remove`
**WHAT TO TEST:**
- `STORAGE_BUCKETS` registry shape (8 buckets, exact names) — guards against typos.
- `signedUrl`: default TTL 600s; custom TTL passed through; returns `data.signedUrl`; throws `error.message`.
- `upload`: derives `contentType` from `File.type` when not given; omits it for `Blob` with no type; `upsert` default false; returns `path`; throws on error.
- `removeObjects`: returns early on empty array (no call); **best-effort** swallows error by default; **throws** when `{ throwOnError: true }`.
**ESTIMATED TESTS:** 12 · **PRIORITY:** critical

---
**FILE:** `lib/data/inspections.ts`
**TYPE:** api (the harness/generic inspection data layer — most surface area)
**MOCK NEEDED:** `@/lib/supabase`; spy on `@/lib/db/storage` (`signedUrl`, `removeObjects`) for the photo/PDF helpers
**WHAT TO TEST:**
- `listInspections`: order desc, limit 50, optional `.eq('project_id')`; `[]` on null; throws on error.
- `countInspections`: head+exact count; `0` on null.
- `getInspection`: `maybeSingle`; `null` + `console.warn` when no row; `console.error` + throw on error.
- `createInspection`: auth-guard (throws 'არაავტორიზებული' with no user); inserts with `status:'draft'` and null-coalesced optionals; returns row.
- `updateInspection`: **sets `completed_at` only when `status==='completed'`**; passes through patch; throws on error.
- `upsertAnswer`: `onConflict:'inspection_id,question_id'`; null-coalesces all value_* fields.
- `listAnswers` / `listQuestions` (section then order sort) / `listAnswerPhotos`.
- `listAllAnswerPhotos`: returns `{}` for empty ids; groups rows into `answerId → photo[]` map.
- `addAnswerPhoto`: passes geo lat/long/address; null defaults.
- `removeAnswerPhoto`: deletes row **then** best-effort `removeObjects(answer-photos)`.
- `getSavedSignatureUrl`: `null` when not authed; reads `users.saved_signature_url`.
- `signedPdfUrl` delegates to `storage.signedUrl(pdfs, …)`.
**ESTIMATED TESTS:** 22 · **PRIORITY:** critical

---
**FILE:** `lib/data/orders.ts`
**TYPE:** api (legal order documents)
**MOCK NEEDED:** `@/lib/supabase`
**WHAT TO TEST:**
- `toModel`: snake→camel mapping; `updatedAt` falls back to `created_at` when null; `documentType`/`status`/`formData` cast.
- `ORDER_DOCUMENT_TYPE_LABEL` has a Georgian label for all 4 `OrderDocumentType`s.
- `listOrders` / `listOrdersByProject` (filter + order desc) / `getOrder` (`null` on no row).
- `createOrder`: auth-guard ('Not signed in'); inserts form_data JSONB; returns model.
- `updateOrder`: only includes provided patch keys (formData/status/pdfUrl/pdfHash); `pdfHash ?? null`; returns model.
- `deleteOrder`.
**ESTIMATED TESTS:** 12 · **PRIORITY:** critical

---
**FILE:** `lib/data/projects.ts`
**TYPE:** api
**MOCK NEEDED:** `@/lib/supabase`; spy `@/lib/db/storage.removeObjects`
**WHAT TO TEST:**
- `createProject`/`updateProject`/`updateProjectLogo`/`getProject`/`listProjects` (limit 50, order desc)/`countProjects`.
- `deleteProject`: **fetches `project_files.storage_path` first, removes blobs from `project-files` bucket, then deletes the row**; skips `removeObjects` when no paths; filters falsy paths.
- `setProjectCrew` (crew JSONB), `addProjectSigner`/`listProjectSigners` (order asc)/`deleteProjectSigner`.
- error propagation on each.
**ESTIMATED TESTS:** 14 · **PRIORITY:** critical

---
**FILES:** `lib/data/incidents.ts`, `reports.ts`, `briefings.ts`
**TYPE:** api · **MOCK:** `@/lib/supabase` + storage spies
**WHAT TO TEST (each):** list/get/create/update/delete CRUD; row↔model mapping; photo-bucket cleanup on delete (incidents→incident-photos, reports→report-photos); signed-URL helpers; auth-guard on create; error propagation. **EST:** 10/10/8 · **PRIORITY:** critical (incidents/reports), high (briefings)

---
**FILES:** `lib/data/{bobcat,excavator,generalEquipment,cargoPlatform}.ts`
**TYPE:** api (partly covered today via mount test) · **MOCK:** `@/lib/supabase`
**WHAT TO TEST:** the row↔model mappers (snake↔camel, JSONB `items`/`signatories`/`cargo` round-trip), verdict/label maps, `*_TEMPLATE_ID` constants, list/get/create/update/delete, photo path persistence inside `items`. Pull the data-fn logic out of the mount test into focused unit tests. **EST:** 10 each · **PRIORITY:** critical

---
**FILES:** `lib/data/{certificates,qualifications,projectFiles,account,regulations,templates}.ts`
**TYPE:** api · **MOCK:** `@/lib/supabase`
**WHAT TO TEST:** CRUD + mapping + error paths; `projectFiles` storage upload/remove; `templates`/`regulations` list+cache shape; `account` profile read/update. **EST:** ~5 each · **PRIORITY:** medium

---
**FILE:** `lib/auth.tsx`
**TYPE:** hook / context provider
**MOCK NEEDED:** `@/lib/supabase` (`auth.getSession/onAuthStateChange/signInWithPassword/signUp/signOut/resetPasswordForEmail/updateUser`, `from('users').…maybeSingle`); `localStorage`
**WHAT TO TEST:**
- `readPersistedSession`: returns session from a `sb-*-auth-token` localStorage key when `access_token`+`user` present; `null` when absent; **swallows corrupt JSON** (try/catch) and returns null.
- `AuthProvider`: subscribes to `onAuthStateChange`, updates session; unsubscribes on unmount.
- profile effect: fetches `users` row on session, clears profile on logout, cancels on unmount (no setState after unmount).
- `signIn`/`signUp`/`signOut`/`sendPasswordReset`/`updatePassword`: call the right Supabase method, **throw on `error`**; `signUp` passes `first_name`/`last_name` metadata; `sendPasswordReset` uses `passwordResetRedirect()`.
- `useAuth` throws when used outside provider.
**ESTIMATED TESTS:** 14 · **PRIORITY:** critical

---
**FILE:** `lib/usePdfUsage.ts`
**TYPE:** hook (subscription/limit status)
**MOCK NEEDED:** `@/lib/supabase`, `./auth` (`useAuth`), `QueryClientProvider`
**WHAT TO TEST:**
- query `enabled` only when `userId` present.
- `isLocked` = `count >= 30 && status !== 'active'` (true at 30/free, false when active).
- **expiry mirror:** `status==='active'` with past `expires_at` → coerced to `'expired'`.
- defaults: `count` 0, `status` 'free' when columns null.
- `useInvalidatePdfUsage` invalidates the right key.
**ESTIMATED TESTS:** 9 · **PRIORITY:** critical

---
**FILE:** `lib/subscription.ts`
**TYPE:** hook/api · **MOCK:** `@/lib/supabase`, `./auth`
**WHAT TO TEST:** `cancelSubscription` rpc('cancel_subscription') happy/throw; `usePaymentHistory` enabled-gating, order desc limit 50, maps rows, throws on error. **EST:** 6 · **PRIORITY:** critical

---
**FILE:** `lib/photoUpload.ts`
**TYPE:** utility · **MOCK:** `@/lib/db/storage` (`upload`/`signedUrl`/`removeObjects`), `crypto.randomUUID`
**WHAT TO TEST:** `uploadInspectionPhoto` path = `{prefix}/{inspectionId}/{itemId}/{uuid}.{ext}`; ext from filename, `jpg` fallback when no dot; contentType `file.type || image/jpeg`; `signedInspectionPhotoUrl` delegates; `deleteInspectionPhoto` best-effort. **EST:** 7 · **PRIORITY:** critical

### HIGH

---
**FILE:** `lib/query/useEntityMutation.ts`
**TYPE:** hook · **MOCK:** `sonner` (`toast.success/error`), `QueryClientProvider` (spy `invalidateQueries`)
**WHAT TO TEST:**
- `errorMessage`: `Error` → `.message`; non-Error → `String(x)`.
- on success: invalidates each key (array form **and** function form `(args,data)=>keys`); `successToast` string vs builder vs omitted; `onDone(data,args)` runs after invalidation.
- on error: `toast.error` shown by default; **suppressed when `errorToast:false`**; `onFail(error,args)` runs.
**ESTIMATED TESTS:** 10 · **PRIORITY:** high

---
**FILE:** `features/inspections/equipment/useEquipmentDetail.ts`
**TYPE:** hook (shared equipment lifecycle) · **MOCK:** `react-router-dom` (`useParams`/`useNavigate`), `@/lib/data/projects.getProject`, cfg fns, `QueryClientProvider`
**WHAT TO TEST:**
- `isPending` when `id==='draft'`; **redirects to inspections list when pending with no `pendingCreate`**.
- item query disabled while pending; project query enabled only when `getProjectId(item)` truthy.
- `goStep` sets `direction` +1 forward / −1 back.
- `save` is a **no-op while pending**; otherwise mutates.
- update mutation sets `justCompleted` only when patch `status==='completed'`; invalidates detail+list keys.
- `del` navigates to list on success.
**ESTIMATED TESTS:** 12 · **PRIORITY:** high

---
**FILE:** `components/wizard/SegmentedControl.tsx`
**TYPE:** component (named in request) · **MOCK:** none
**WHAT TO TEST:** renders N buttons from options; clicking calls `onSelect(value)`; selected button gets `selectedBg`+white text, others `#F5F4F1`/`#6B7280`; **nothing looks selected when `selected===null`** (2-option verdict and 3-option checklist cases); `fullWidth` flex vs fixed 56px; height/fontSize props applied. **EST:** 8 · **PRIORITY:** high

---
**FILE:** `components/web/SuccessModal/index.tsx`
**TYPE:** component (named) · **MOCK:** none (portal renders to `document.body`)
**WHAT TO TEST:** renders nothing when `isOpen:false`; shows total/safe/problem counts + inspectionName·projectName + itemLabel; "PDF გენერირება" calls `onGeneratePDF`; "დახურვა" + backdrop click + **Escape key** call `onClose`; clicking the sheet does not close (stopPropagation); `role="dialog"`/`aria-modal`. **EST:** 9 · **PRIORITY:** high

---
**FILE:** `components/PhotoUploadZone.tsx`
**TYPE:** component (named) · **MOCK:** upload helper / object URLs
**WHAT TO TEST:** file selection → preview; rejects non-image / oversize (per its validation); multiple files; remove a pending photo; disabled/empty states; calls upload handler with the File. **EST:** 10 · **PRIORITY:** high
*(`PhotoUploadWidget.tsx` — analogous, 8 tests.)*

---
**FILE:** `components/inspections/HarnessChecklist.tsx`
**TYPE:** component · **MOCK:** none
**WHAT TO TEST:** renders question rows; verdict selection per row via `SegmentedControl`; comment entry; safe/problem tally reflects selections; empty catalog. **EST:** 8 · **PRIORITY:** high

---
**FILES:** `components/PaywallModal.tsx`, `components/SubscriptionCard.tsx`
**TYPE:** component · **MOCK:** `usePdfUsage`, `subscription` hooks
**WHAT TO TEST:** paywall content shows the 30-PDF messaging + CTA → `Subscribe`; SubscriptionCard renders free/active/expired states, cancel button calls `cancelSubscription`, renders `PaywallModal` when locked. **EST:** 5 + 7 · **PRIORITY:** high

---
**FILES:** `lib/documentNames.ts`, `lib/printable.ts`, `lib/query/useEntityQuery.ts`, `store/useSafetySelectors.ts`, `hooks/useConfetti.ts`, `components/ui/floating-label-input.tsx`, `components/SignatureCanvas.tsx`, `components/form/EntityForm.tsx`, `components/charts/*`
**WHAT TO TEST (summary):** `documentNames` — `equipmentInspectionName` map + `useInspectionName` resolver fallback; `printable` — print-window assembly (stub `window.open`); `useEntityQuery` — passes options through; `useSafetySelectors` — derived selectors; `useConfetti` — fires canvas-confetti; `FloatingLabelInput` — focus/blur/value-driven label float; `SignatureCanvas` — draw/clear/onChange (mock `signature_pad` or canvas); `EntityForm` — validation + submit; charts — value→render. **EST:** ~50 total · **PRIORITY:** high

### MEDIUM / LOW — see §2 (page render suites ~120 tests; UI primitives ~30). Detail these per-page as each is implemented; keep to mount + happy-path + one empty/error state per page.

---

## 4. E2E Test Plan (Playwright)

`@playwright/test` is already installed; `e2e-smoke/` + `playwright.smoke.config.ts` exist (build smoke).
Add a **second** config `playwright.config.ts` (full journeys) and an `e2e/` dir, run against
`vite preview` at **`:4173`** with **hash routing** (`/app/#/...`), mirroring the smoke setup.

**The hard constraint:** the dashboard talks to **real Supabase** (no local Supabase wired for
`web-app/`, unlike the Expo `test.yml`). Two viable strategies — pick one in §5:
- **(A) Seeded test account** in a non-prod Supabase project; log in once, reuse `storageState`. Realistic, but needs seed/cleanup + secrets.
- **(B) Network interception** (`page.route('**/rest/v1/**' / '/auth/v1/**')`) returning fixtures. Deterministic, no backend, but couples tests to API shapes. **Recommended to start** — keeps CI hermetic.

> ⚠️ **Not testable yet (feature gap, not a test gap):** any "generate PDF → count increments →
> 4th/paywall" journey. `checkAndIncrementPdfCount` is wired into nothing on web; PDFs are browser
> print. Defer these E2Es until the gate is wired into the print/order flows. The breathalyzer/ჟურნალი
> journey does not exist on web at all.

### AUTH
**JOURNEY: Successful login → home**
PRECONDITION: logged out · STEPS: goto `/app/#/login` → fill email+password → submit → ASSERT redirected to `/app/#/home`, sidebar visible. DATA: test user / mocked auth. ~4s.

**JOURNEY: Failed login → error**
STEPS: submit wrong creds → ASSERT Georgian error toast/message, stays on login. ~3s.

**JOURNEY: Logged-out guard → redirect**
STEPS: goto `/app/#/projects` while logged out (`ProtectedRoute`) → ASSERT redirected to login. ~2s.

**JOURNEY: Session persists on refresh**
STEPS: log in → reload → ASSERT still on home (covers `readPersistedSession` localStorage path). ~4s.

### INSPECTIONS
**JOURNEY: Complete a harness inspection end-to-end**
PRECONDITION: logged in, ≥1 project · STEPS: Inspections → new harness → select project → answer checklist (verdict per row via SegmentedControl) → conclusion (safe/notes/signature) → complete → ASSERT SuccessModal shows correct total/safe/problem counts → "PDF გენერირება" opens print view. DATA: project + template fixtures. ~12s.

**JOURNEY: Complete an equipment inspection (bobcat/excavator)**
STEPS: new bobcat → fill info → checklist → verdict/notes → complete → ASSERT SuccessModal + read-only act renders (the mount test already guards the read-only render). ~10s.

**JOURNEY: Save draft → resume → complete**
STEPS: start inspection, leave at step 1 → navigate away → reopen from Inspections list (status draft) → ASSERT prior answers restored → complete. ~10s.

**JOURNEY: Multiple harnesses → navigate between items → complete all**
STEPS: add 3 harness items → switch between them → ASSERT per-item state isolated → complete all. ~12s.

### PROJECTS
**JOURNEY: Create project → appears in list** (`NewProject` → `Projects`). ~5s.
**JOURNEY: Open project → all sections render** (`ProjectDetail` index + Crew/Signers/Files/Inspections/Orders/Incidents/Reports/Briefings sections). ~5s.
**JOURNEY: Add participant/signer → appears in list** (`CrewSection`/`SignersSection` → `addProjectSigner`). ~5s.

### ORDERS (ბრძანება)
**JOURNEY: Create fire-safety order → fill → preview PDF**
STEPS: NewOrder → pick `fire_safety_order` → fill company/appointed/object → (sign if web signing available) → save → OrderDetail → "PDF" → ASSERT new tab/print window opens with company + order number (validate against `buildFireSafetyOrderHtml`). NB: "sign" on web may be limited to stored signatures; assert the underline placeholder otherwise. ~10s.

### SUBSCRIPTION (limited)
**JOURNEY: Subscribe page renders correct plan/paywall content**
STEPS: goto `/app/#/subscribe` (and open PaywallModal from SubscriptionCard when `isLocked`) → ASSERT 30-PDF messaging + CTA. (The *enforcement* journey is deferred — see warning above.) ~4s.

### NAVIGATION
**JOURNEY: Sidebar items navigate** — click each `SidebarNav` item → ASSERT route + heading. ~6s.
**JOURNEY: Browser back works** — navigate A→B→back → ASSERT on A (hash history). ~3s.
**JOURNEY: Deep link to project** — goto `/app/#/projects/:id` directly → ASSERT detail renders. ~3s.
**JOURNEY: Unknown route → NotFound** — goto `/app/#/zzz` → ASSERT `NotFound` (not a blank/crash). ~2s.

---

## 5. Infrastructure Needed

**Already present (do NOT re-add):** vitest 4, @vitest/coverage-v8, @testing-library/{react,user-event,jest-dom,dom}, jsdom, @playwright/test, `vitest.config.ts`, `src/test-setup.ts` (matchMedia + ResizeObserver mocks for Mantine), `src/test-utils.tsx` (MantineProvider render), `playwright.smoke.config.ts`.

**To add:**
- **Coverage thresholds** in `vitest.config.ts` (currently commented out) — ratchet, don't big-bang. Start at the current floor and raise each PR: `lines/functions/statements/branches: 15` → 40 → 60.
- **Test fixtures module** `src/__tests__/fixtures/` — typed factory builders (`makeProject`, `makeInspection`, `makeOrder`, `makeBobcatInspection`, …) so each test isn't a 30-line literal (the equipment mount test shows how verbose these get). Reuse the existing `stubProject` shape.
- **A shared Supabase mock helper** `src/__tests__/helpers/supabaseMock.ts` — a chainable query-builder stub (`from().select().eq().order().limit().maybeSingle()/single()` + `.rpc` + `.auth.*` + `.storage.from().*`) so data-layer tests stop hand-rolling chains. This standardizes the existing `vi.mock('@/lib/supabase')` pattern.
- **Full Playwright config** `playwright.config.ts` (separate from the smoke config) + `e2e/` dir, plus either a `storageState` auth fixture (strategy A) or a `routeFixtures.ts` interception helper (strategy B).
- **`test:e2e` script** in `web-app/package.json`.

**Do NOT add:** MSW. The codebase mocks at the module/data-fn boundary; MSW would duplicate that with a second mental model. (Reconsider only if/when many tests need true network-shape realism.)

**Test file layout (matches the existing `src/__tests__/` convention — keep it, don't move to a top-level `__tests__/unit/...`):**
```
src/__tests__/
  fixtures/            factories
  helpers/             supabaseMock, renderWithProviders
  lib/                 utils, pdfGate(✓), usePendingCreate(✓), orderPdf, auth, usePdfUsage, subscription, photoUpload …
  lib/db/              repository, storage
  lib/data/            inspections, orders, projects, incidents, reports, briefings, equipment …
  lib/query/           useEntityMutation, useEntityQuery
  components/          SegmentedControl, SuccessModal, PhotoUploadZone, HarnessChecklist, Paywall … (+ existing)
  features/            equipmentDetail(✓), useEquipmentDetail
  pages/               render suites
  store/               (✓ safetyStore, commandStore), useSafetySelectors
e2e/                   auth/  inspections/  projects/  orders/  navigation/
e2e-smoke/             smoke.spec.ts (✓ existing)
```

**Coverage targets:** `lib/` (utils/db/data/query) 90%+ · hooks 85% · shared components 80% · pages 60% · UI primitives 50% · exclude `types/`, `main.tsx`, `Scene3D`/`ConstructionModel`, `pages/landing/*`, `pages/print/*` from the *gating* number (cover the latter two by snapshot). **Realistic overall target: 70–75%** (the request's 85% is unrealistic given the 3D + heavy page surface; chasing it forces brittle tests).

**CI integration (extend `ci-web-app.yml`):**
- Switch `npm test` → `npm run test:coverage`; upload `coverage/` artifact; fail under thresholds.
- Add a job step: `npm run build && npm run smoke` (currently smoke runs nowhere in CI).
- Add E2E as a **separate job on push to `main`** (and `workflow_dispatch`), not every PR (slower; needs the auth fixture/secrets).
- Post coverage summary as a PR comment (e.g. `davelosert/vitest-coverage-report-action`).
- Promote `lint` from `continue-on-error` to blocking once the tree is clean.

---

## 6. Implementation Timeline

The harness exists, so Week 1 is **not** setup — it's the high-ROI pure utilities.

**Week 1 — Critical utilities & data layer (biggest coverage jump per hour)**
1. `helpers/supabaseMock.ts` + `fixtures/` factories.
2. `lib/orderPdf.ts` (18), `lib/db/repository.ts` (16), `lib/db/storage.ts` (12), `lib/photoUpload.ts` (7).
3. `lib/data/inspections.ts` (22), `orders.ts` (12), `projects.ts` (14).
4. Turn on coverage thresholds at the new floor.

**Week 2 — Auth, subscription, remaining data, query hooks**
5. `lib/auth.tsx` (14), `lib/usePdfUsage.ts` (9), `lib/subscription.ts` (6).
6. `lib/data/{incidents,reports,briefings,equipment×4,certificates,…}` (~110).
7. `lib/query/useEntityMutation.ts` (10), `useEntityQuery.ts` (4), `useEquipmentDetail.ts` (12).
8. Raise thresholds (~40%).

**Week 3 — Shared components**
9. `SegmentedControl` (8), `SuccessModal` (9), `PhotoUploadZone`/`Widget` (18), `HarnessChecklist` (8).
10. `PaywallModal`/`SubscriptionCard` (12), `FloatingLabelInput`/`SignatureCanvas`/`EntityForm`/charts (~40).
11. Page render suites for auth + projects + orders.
12. Raise thresholds (~60%).

**Week 4 — E2E + remaining pages**
13. Full `playwright.config.ts` + auth fixture (strategy B interception first).
14. Auth + navigation journeys.
15. Inspection (harness + equipment + draft-resume + multi-item) journeys.
16. Project + order journeys; subscribe render journey. Wire E2E into CI (main only).

---

## 7. Coverage Projection

| Milestone | Statements (from 9.4%) | Notes |
|---|---|---|
| After Week 1 | **~35%** | utils + db + 3 biggest data modules are dense, high-statement files |
| After Week 2 | **~55%** | auth + all data layer + query hooks |
| After Week 3 | **~68%** | shared components + first page suites |
| After Week 4 | **~73%** | remaining page suites; E2E adds confidence, not unit-coverage % |

Realistic steady state **70–75%** with the gating set excluding 3D/landing/print/generated types.
Within the gated set, `lib/` should reach **90%+**. E2E gives the confidence the % can't:
the auth guard, the wizard step progression, and the order-PDF output are the three places a regression
would hurt most.

---

### Appendix — open questions before implementation
1. **E2E backend:** interception (B) or a seeded non-prod Supabase account (A)? (Recommend B to start.)
2. **Web PDF gate:** is wiring `checkAndIncrementPdfCount` into the print/order flow planned? It changes whether the subscription-enforcement E2E is in scope.
3. **Coverage gate aggressiveness:** ratchet per-PR (recommended) vs. set a single 70% bar now (will fail CI until Week 3).
