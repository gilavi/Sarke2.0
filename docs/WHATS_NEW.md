# What's New — Sarke 2.0 Changelog

**Updated:** 2026-05-22 | Branch: `main`

---

## 2026-05-22 — Full beta-report audit: 13 verified fixes (mobile)

### Fixes — triaged every remaining report item, fixed the real ones
Audited all ~156 detailed entries in the 10-agent beta report against current source and fixed the 13 that were genuinely broken and safely fixable:
- **Data integrity:** project-signer signatures no longer upload as 0-byte files (canonical `uploadSignature`, §1.10); offline photos are no longer dropped when compression fails (§2.18); bobcat no longer shows "success" when completion fails (§1.21).
- **Correctness:** order success screen shows the right document type + order number instead of a hardcoded label (§1.15/1.24); MapPreview recenters when the location pin changes (§2.33); `deleteInspection` guards against double-trigger (§2.41).
- **UX/polish:** Kamari detail input no longer hidden by the keyboard (§2.11); scaffold help tour resets to the first slide on re-open (§2.13); conclusion-step "required" errors only appear after interaction (§2.25); annotated photos save as JPEG not PNG (§2.16); RoleSlotSheet respects dark mode (§3.16); fixed an English word in a Georgian screen-reader label (§3.48); capped an unbounded Set (§4.1).

The vast majority of report items were false, already-handled, or device-only; a few of its proposed fixes would have regressed working code. Deferred (real but larger): incident edit-mode duplicate (§1.16), harness PDF preview (§3.13), annotator coord clamp (§2.43), tappable order rows (§3.17 — needs an order-detail screen that doesn't exist yet). Per-item evidence in [BUG_REPORT.md](../BUG_REPORT.md).

---

## 2026-05-22 — Auth keyboard & autofill UX (mobile)

### Improvement — return-key flow + password-manager autofill on auth screens
Login, register, forgot-password, and reset-password inputs now support return-key field chaining (email→password→submit, name→name→email→password on register), submit-on-return, and iOS/Android autofill hints (`textContentType` / `autoComplete`) for email, current/new password, and name fields. `FloatingLabelInput` now forwards those props (plus `blurOnSubmit`) to the underlying `TextInput`. ([components/inputs/FloatingLabelInput.tsx](../components/inputs/FloatingLabelInput.tsx), [app/(auth)/login.tsx](../app/(auth)/login.tsx), [forgot.tsx](../app/(auth)/forgot.tsx), [reset.tsx](../app/(auth)/reset.tsx))

This was §2.1–2.3 of the 10-agent beta report (Sprint 3). Other Sprint-3 items were assessed: AuthGate redirect oscillation (§1.18) is already prevented by expo-router segment guards (not a bug); SignatureBlock's index keys (§2.21) are genuinely fragile but need stable ids threaded through callers (deferred); photo/OOM items (§2.15–2.19) need on-device profiling. See [BUG_REPORT.md](../BUG_REPORT.md) for details.

---

## 2026-05-21 — Single-flight guard on the PDF upload queue (mobile)

### Fix — no more duplicate certificate rows
`flushPendingPdfUploads()` is called from three places that can fire near-simultaneously on app start (app mount + the NetInfo seed and reconnect listener). With no concurrency guard, two flushes could both pass the check-then-create dedup before either inserted — and `certificates` has no DB unique constraint — producing duplicate certificate rows. Added a module-level single-flight guard so concurrent calls are no-ops while one flush runs. ([lib/pdfUploadQueue.ts](../lib/pdfUploadQueue.ts))

This was §1.14 of the 10-agent beta report (Sprint 2). The other Sprint-2 items — offline photo-queue "FK violation / permanent loss" (§1.12), AsyncStorage "queue corruption" (§1.13), wizard `patchAnswer` "race" (§1.20), and GridRowStep comment "keyboard regression" (§2.4) — were verified against source and found to be already-handled or non-existent; no code change. See [BUG_REPORT.md](../BUG_REPORT.md) for per-item evidence.

---

## 2026-05-21 — Fix new-inspection-from-template project association (mobile)

### Fix — inspection now created under the right project
The project-detail template picker passed the selected **template** id where `createInspectionForTemplate` expects the **project** id (a shadowed `id` callback param). Picking a template on a project with 2+ system templates created the inspection against the wrong `project_id`. Renamed the callback param to `templateId` and pass the route project `id`. ([app/projects/[id].tsx](../app/projects/[id].tsx))

This was §1.4 of the 10-agent beta report (Sprint 1). The other Sprint-1 items in that report — BottomSheet/SheetLayout keyboard "double handling" (§1.1–1.2), three "missing done screens" (§1.5–1.7), and fall-protection/forklift "undefined `inspectionRef`" (§1.8–1.9) — were verified against source and found to be already-fixed or non-existent; no code change. See [BUG_REPORT.md](../BUG_REPORT.md) for the per-item evidence.

---

## 2026-05-21 — Align web-app React types with the React 19 runtime (web-app)

### Fix — types now match runtime
Bumped `@types/react` / `@types/react-dom` from `^18` to `^19` (web-app runs React 19.2). Typecheck, build, tests, and smoke stay green — the prior `@types@18` was a latent type-safety hole (types lagged the runtime by a major version).

Note: the install confirmed `react-leaflet@4` peer-requires React 18 (web-app is installed with `--legacy-peer-deps`). It works under React 19 at runtime and typechecks, but a future `react-leaflet@5` bump would make that peer dependency honest.

---

## 2026-05-21 — Split the Landing + Sidebar god-components (web-app)

### Internal refactor — no behavior change
- **`Landing.tsx` 799 → ~35 lines:** extracted into `pages/landing/` — `marketing-data.ts` (content), `shared.tsx` (animation variants + store badges + phone mockup), `sections.tsx` (the 9 page sections), `overlays.tsx` (sticky bar, exit-intent, cookie banner). `Landing.tsx` is now a thin composition. Verified rendering identically via preview screenshot.
- **`Sidebar.tsx` 532 → ~140 lines:** nav config → `layout/navItems.ts`; `Tooltip`/`RailNavItem`/`MoreGroup` + shared `SidebarNavList` + `SidebarFooter` → `layout/SidebarNav.tsx`. The mobile drawer (which had re-declared the nav markup + account/sign-out) now reuses `SidebarNavList`/`SidebarFooter` in always-expanded mode — the drawer is just the expanded rail.
- Verified: typecheck + build + tests (71) + smoke green.

---

## 2026-05-21 — Enforced the no-shadow rule across the web-app (web-app)

### Internal cleanup — border-based separation, with a guard
Removed all 25 Tailwind `shadow-*` / `drop-shadow-*` utility violations across the dashboard (cards, modals, popovers, map chips, sidebar + logo, toggles, the marketing hero). Separation now comes from borders/backgrounds per the project rule.

- **Guard added:** [`web-app/scripts/check-no-shadows.mjs`](../web-app/scripts/check-no-shadows.mjs), wired into `npm run lint`, fails on any `shadow-` utility in `src/` (three.js light props in `Scene3D.tsx` are exempt). Documented in [primitives.md](primitives.md#web-dashboard-separation--no-shadows-web-app).
- Modals (Welcome, CommandPalette, Calendar) and map chips gained a `border`; the PDF-overlay toolbar a bottom border; hover affordance uses a border-color change.
- Decorative removals worth a look: the dark-mode brand glow on the logo (Sidebar/AppShell) and the hero `drop-shadow-2xl` (Landing). The `glow-*` tokens in `tailwind.config.ts` remain available if you want a sanctioned glow back.

---

## 2026-05-21 — Harness create flow folded into the shared InspectionWizard (web-app)

### Internal refactor — one inspection create wizard; legal record unchanged
The dedicated `HarnessInspectionModal` (504 lines) and the orphaned `/harness/new` page (`NewHarnessInspection`) are gone. Harness inspections are now created through the shared `InspectionWizard` via a `WizardPreset`.

- **`InspectionWizard` gained a `preset` prop** — locks the template, streamlines the info step to a project picker, prefills the inspector from the signed-in profile, requires a conclusion, and navigates to the harness detail on success. Harness config lives in [`components/inspections/harnessPreset.ts`](../web-app/src/components/inspections/harnessPreset.ts).
- **Grid summary generalized:** the ok/bad "შეჯამება" counts + success badges are computed from any `component_grid` answer, not harness-specific code.
- **Call sites repointed:** Home, Inspections, ProjectDetail mount `InspectionWizard` with `harnessWizardPreset` (the generic new-inspection wizard was already there).
- **Dead code removed:** `HarnessInspectionModal.tsx`, `pages/NewHarnessInspection.tsx`, the `/harness/new` route, and the never-triggered completion `Modal` in `HarnessInspectionDetail.tsx`.
- **Fidelity:** harness acts still go through the same `createInspection` / `upsertAnswer` / `updateInspection` data path, so the saved record + PDF are unchanged. Verified by typecheck, lint, build, and tests (added an `InspectionWizard` harness-preset mount test; suite 70 → 71).

---

## 2026-05-21 — Equipment inspection detail pages cut over to the shared engine (web-app)

### Internal refactor — no user-facing change; legal PDFs byte-identical
The four equipment inspection **detail pages** (bobcat, excavator, general-equipment, cargo-platform) now render through the shared `features/inspections/equipment/` engine instead of five hand-cloned 500–940-line `pages/<Type>InspectionDetail.tsx` pages (~70% duplicated lifecycle / banner / PDF-overlay / checklist code).

- **Per-type detail components → `features/inspections/equipment/<Type>Detail.tsx`:** each is a thin component composing `useEquipmentDetail` (draft/query/mutation/delete/step/pdf lifecycle) + the shared `ResultPills` / `ChecklistItemRow` / `CompletedBanner` / `InspectionPdfOverlay` widgets. The transitional `BobcatDetailEngine.tsx` is now `BobcatDetail.tsx`.
- **Router repointed** ([`app/router.tsx`](../web-app/src/app/router.tsx)); the four old `pages/*InspectionDetail.tsx` deleted (~2,370 LOC removed).
- **Fidelity:** every `update<Type>Inspection(id, patch)` save call is preserved verbatim, so the saved row — and the legal PDF rendered by the untouched `pages/print/<Type>Print.tsx` — is byte-identical. Verified by typecheck, ESLint (new files clean), production build (4 new chunks emitted), and the smoke test.
- **Out of scope (unchanged):** the generic template/question path (`pages/InspectionDetail.tsx`) and the harness flow — those are DB-schema-driven, not equipment-catalog-driven. New canonical owner documented in [`primitives.md`](primitives.md#web-dashboard-equipment-inspection-detail-web-app).

---

## 2026-05-21 — web-app architecture refactor + best-practices hardening (web-app)

### Internal refactor — no user-facing change
A kernel of shared primitives plus tooling/CI groundwork for the dashboard. All
additive or behavior-preserving; the page-layer migrations that build on this
are deferred until the in-flight query-key migration is committed. Full design,
conventions, and roadmap in [`web-app-architecture.md`](web-app-architecture.md).

- **Kernel primitives — `web-app/src/lib/db`, `lib/query`, `components/{async,form,print}`:** `makeRepository` (generic CRUD + `mapDefined`), a storage primitive (`STORAGE_BUCKETS` + `signedUrl`/`upload`/`removeObjects`), `useEntityQuery`/`useEntityMutation`, `AsyncBoundary`, `EntityForm` (react-hook-form + zod, previously installed but unused), `PrintLayout`.
- **Equipment data layer → `makeRepository`:** bobcat/excavator/generalEquipment/cargoPlatform now build a repo via the factory (one CRUD impl, not five); public exports/behavior unchanged so pages are untouched.
- **Storage consolidated:** every data-layer Supabase Storage callsite routes through the primitive — killed the 4× duplicated `signedPdfUrl` helpers and the stringly-typed bucket names.
- **Inspection engine (started):** `features/inspections/equipment/` — shared `useEquipmentDetail` hook + `ResultPills`/`ChecklistItemRow`/`CompletedBanner`/`InspectionPdfOverlay`; bobcat detail rebuilt on it as the proof. (Route cutover for all four equipment types completed 2026-05-21 — see the entry above.)
- **Tooling/CI:** ESLint (flat) + Prettier added (the app previously had no linting); zod env validation in `supabase.ts`; generated Supabase schema types (`npm run gen:types` → `src/types/database.ts`); CI workflow gating web-app on typecheck + unit tests (PR + pre-deploy); Vitest made runnable (excluded the Playwright spec, added `@testing-library/dom`) and a stale `StatusBadge` test fixed — suite now 66/66 green.

---

## 2026-05-20 — Landing page full redesign (web-app)

### Visible change — pre-login marketing page
- **`web-app/src/pages/Landing.tsx`** — complete rewrite. Replaced the minimal hero + 4-card layout with a full marketing site: sticky navbar with smooth-scroll anchors; full-viewport hero with animated SVG phone mockup (Framer Motion float); pain-point section (dark bg, 3 cards); "How It Works" 3-step section; 6-card features grid; pricing (Free / PRO ₾19 cards); FAQ accordion (6 questions); dark-green final CTA with App Store + Play Store badges; sticky mobile bar (visible after scrolling 75% of viewport); exit-intent email capture popup (desktop only). All copy is Georgian. Zero new TypeScript errors.

---

## 2026-05-20 — Fix: lifting-accessories PDF result pills (mobile · visible change)

### Bug fix — changes rendered PDF
- **`lib/inspection/schemas/liftingAccessories.ts`** — the Section III (visual) and Section IV (functional) checklist result columns always rendered the null "—" pill instead of the green ✓ გამართულია / red ✗ გაუმართავია pill. `buildChecklistRows` passed the Georgian display string (`LA_RESULT_TO_CHIP[result]`) into `checklistPill`, which only matches the enum values `'ok'`/`'fail'`, so nothing ever matched. Now passes the raw `result` enum. (The failed-row red left-border already worked — it keys off `result === 'fail'`.) This was a pre-existing bug carried over verbatim during the PDF-engine migration; the fix changes the rendered output. Covered by `tests/unit/inspectionPdf.test.ts`.

---

## 2026-05-20 — Equipment inspection PDFs unified on a schema-driven engine (mobile)

### Internal refactor — inspection PDF bodies unchanged
All 9 equipment inspection types (excavator, forklift, bobcat, cargo-platform, safety-net, mobile-ladder, fall-protection, lifting-accessories, general-equipment) now render their PDFs through one shared, schema-driven engine instead of 9 hand-cloned `lib/<type>Pdf.ts` builders (~9.7K LOC of near-duplicated CSS + scaffolding).

- **New engine — `lib/inspection/`:** `schema.ts` (the `InspectionSchema<T>` language), `pdf.ts` (one synchronous, platform-free renderer), `pdfStyles.ts` (`BASE_PDF_CSS` — the ~180 CSS lines every type used to copy), `escape.ts`, `photos.ts` (`resolveInspectionPhotos`), `renderMobile.ts` (`renderInspectionPdf`), `service.ts` (`makeInspectionService`), `registry.ts`, and `schemas/<type>.ts` per type. The 9 `lib/<type>Pdf.ts` builders were deleted.
- **Web PDF photos fixed:** the old builders embedded photos via the mobile-only `embedInspectionPhotos`, so equipment PDFs rendered blank images on the web dashboard. The engine resolves photos by platform (signed HTTPS URLs on web, base64 on mobile) — fixing this for every type at once.
- **Service factory:** the 9 `lib/<type>Service.ts` files now wrap `makeInspectionService(...)` (shared create/getById/patch/complete/listByProject/photo CRUD); each keeps only its column map + create defaults. Persistence is isolated behind the factory, so collapsing the per-type tables later is a config change, not a screen change.
- **Dispatch unified:** `app/projects/[id].tsx` and `app/template/[id]/start.tsx` now dispatch through `lib/inspection/registry.ts` (keyed by each schema's `category`), replacing two hand-maintained switches — fixing a latent bug where the template-start screen silently created a generic questionnaire for 6 of the 9 types.
- **Guardrail + test:** `scripts/check-primitives.mjs` bans `embedInspectionPhotos` outside its definition (new inspection PDFs must use the engine); `tests/unit/inspectionPdf.test.ts` renders the excavator PDF and asserts structure.
- **Faithfulness:** inspection bodies (checklist data, verdicts, signatures, photos) are byte-faithful. Unifying header/footer relocated a few types' centered regulation badges into a body block and standardized the footer; bobcat's per-variant (large-loader) title and general-equipment's act number are preserved via schema hooks (`docTitle` function, `headerMetaLines`).
- **Out of scope (unchanged):** `breathalyzerLog` (a log, not a checklist inspection); the non-equipment PDFs (order, incident, report, briefing); the generic harness/questionnaire path; and the per-type form *screens* (a separate, deferred phase).

---

## 2026-05-20 — Signing flow on all equipment inspection detail pages (web)

### Signing flow — equipment pages (web-app)
- **`InspectionSignatures` component** — prop renamed `isDraft` → `canEdit`; inspector signature bug fixed (bare base64 now gets `data:image/png;base64,` prefix before rendering); prop type changed from `Inspection` to generic `SignableInspection` interface so all equipment types can use it.
- **`HarnessInspectionDetail`** — `canEdit` now `inspection.status === 'completed'` (was `isDraft`), so the "+ პირის დამატება" button appears only after the inspection is completed.
- **`BobcatInspectionDetail`, `ExcavatorInspectionDetail`, `CargoPlatformInspectionDetail`, `GeneralEquipmentInspectionDetail`** — `InspectionSignatures` wired below the page header; `canEdit={status === 'completed'}`.
- **Migration 0051** — `signatories JSONB NOT NULL DEFAULT '[]'` column added to `bobcat_inspections`, `excavator_inspections`, `cargo_platform_inspections`, `general_equipment_inspections`. Apply via `supabase db push`.
- **Data layer** — `signatories: SignatoryEntry[]` field + SELECT + mapper + patch added to `bobcat.ts`, `excavator.ts`, `cargoPlatform.ts`, `generalEquipment.ts`; types updated in `lib/types/bobcat.ts` and `lib/types/excavator.ts`.

---

## 2026-05-20 — Harness detail page redesign + signatories (web)

### `HarnessInspectionDetail` redesign (web-app)
- **Removed 3-tab wizard** from the detail page (`/harness/:id`) — replaced with a single scrollable page.
- **Signatures section** (`InspectionSignatures.tsx`) — shows existing `inspector_signature` as a pinned row; "+ პირის დამატება" opens a Mantine modal with name/role inputs and `SignatureCanvas`. Additional signatories saved to new `signatories` JSONB column.
- **Info section** (`InspectionInfoView.tsx`) — card-based layout with 4 sub-sections: ზოგადი ინფო (editable when draft), ქამრების შედეგები (read-only grid table), შეფასება (safety chip + notes), ფოტოები (signed photo grid).
- **Migration 0050** — `signatories JSONB NOT NULL DEFAULT '[]'` on `inspections`. Apply via `supabase db push`.
- **Data layer** — `SignatoryEntry` type, `signatories` in select strings, `getSavedSignatureUrl()` helper, `signatories` in `updateInspection` patch.

---

## 2026-05-20 — Dedicated harness inspection screens (web)

### Harness flow (web-app)
- **`/harness/new`** — dedicated creation page: project selector + harness name + inspector + department. No template selector.
- **`/harness/:id`** — dedicated detail/wizard page with `WizardSteps` (ინფო → ქამრები → დასკვნა). Embeds existing `HarnessWizard` component directly; conclusion step has safe/unsafe chips + notes textarea + save/complete buttons.
- **Routing** — `Inspections.tsx` dropdown "დამცავი ქამრები" now navigates to `/harness/new` instead of opening the generic `InspectionWizard` modal. Harness rows in the list link to `/harness/:id`. `ProjectActivityWidget` also routes harness items to `/harness/:id`.
- **Routes** added to `app/routes.ts` (`harnessNew`, `harnessDetail`, `routes.harness`) and `app/router.tsx`.

---

## 2026-05-20 — `main` — Web regulations tab fixes

### Regulations tab (web-app)
- **Amendment dates now load on web:** matsne.gov.ge has no CORS headers, so the browser was silently dropping every fetch and showing the list with no dates. Added a `fetch-regulation-dates` Supabase Edge Function that proxies the requests server-side; the web dashboard now calls this instead of fetching matsne.gov.ge directly.
- **Auto-refresh on tab return:** added a `visibilitychange` listener (mirror of mobile's `useFocusEffect`) so the page re-checks for updates when the user returns from reading a regulation in a new tab.
- Removed dead duplicate `web-app/src/lib/regulations.ts` (nothing imported it; canonical copy is `web-app/src/lib/data/regulations.ts`).
- **Deploy note:** run `supabase functions deploy fetch-regulation-dates` to activate the proxy.

---

## 2026-05-20 — Dedicated harness (ქამრები) inspection screen

- **New screen** `app/inspections/harness/[id].tsx` — replaces the generic wizard for harness-category inspections.
  - Step 0 (ინფო): harness name/ID field. No inspection-type selector — type is already determined from the home-page dropdown.
  - Step 1 (ქამრები): `HarnessListFlow` (count picker → per-harness component grid with photos).
  - Step 2 (დასკვნა): shared `ConclusionStep` with "უსაფრთხოა" / "არ არის უსაფრთხო" verdict chips.
- **Routing** — `lib/inspectionRouting.ts` now routes harness drafts to `/inspections/harness/:id`; completed harness still opens the PDF result screen.
- **Shared components** — `InspectionShell`, `ConclusionStep` (from `components/inspections/`) and `HarnessListFlow` are reused unchanged, matching the bobcat/excavator/general-equipment pattern.

---

## 2026-05-19 — `gio/web-2.0-ux` — Web dashboard UX 2.0

### Home page overhaul
- New layout: greeting + button row → subscription banner → 4 quick-action tiles → combined stats+heatmap widget → project activity widgets
- Stats + heatmap merged into one full-width `Card` (2-column grid on desktop, stacked on mobile)
- Quick-action tiles link to new incident / briefing / report / order creation flows
- Per-project activity widget replaces the generic recent-activity list (shows last 3 acts + project summary)

### Sidebar redesign
- Collapsed icon-rail by default; hover expands with labels (tooltip on hover, full labels when open)
- Click pins/unpins the expanded state — persisted in `localStorage`
- Framer Motion spring animations for expand/collapse

### Project cards (Projects page)
- OSM map tile as card background (auto-fetched from lat/lng if coordinates stored)
- Logo badge overlaid on gradient at card foot; initials fallback using `var(--brand-50/500)` tokens
- Hover-reveal edit/delete buttons

### Project detail refactor
- `ProjectDetail.tsx` (1 068 lines) split into `pages/ProjectDetail/` with 11 focused section files: `ProjectHeader`, `ProjectDetailsCard`, `CrewSection`, `SignersSection`, `InspectionsSection`, `IncidentsSection`, `BriefingsSection`, `ReportsSection`, `FilesSection`, `OrdersSection`, `DangerZoneSection`
- Each section owns its own data fetches and mutations — no prop-drilling of refetch callbacks

### New components
- `ProjectModal` — unified create/edit modal for projects (replaces `NewProject` + `EditProject` route pair)
- `AddressInput` — geocoding-backed address field used in `ProjectModal`

### Design system / dark mode fixes
- `Sparkline`, `ProgressRing` default colors changed from `#147A4F` → `var(--brand-500)` (auto-adapts: `#47AF87` in dark mode)
- Project avatar `backgroundColor`/`color` changed from hardcoded hex → `var(--brand-50)` / `var(--brand-500)`
- `SafetyGuidePage` loading label changed from `color: #4a4a4a` → Tailwind `text-neutral-600 dark:text-neutral-400`
- Unused `color` prop removed from `HeatmapCalendar` interface

### React key fixes
- `WizardSteps` — `key={i}` → `key={step.label}`
- `PhotoGallery` — `key={i}` → `key={url}` / `key={\`placeholder-\${i}\`}`

---

**Updated:** 2026-05-19 | Branch: `main`

---

## 2026-05-19 (3)

### Bug fixes — new inspection flows

- **Saves now work**: root cause was `canGoNext` at INFO_STEP requiring `company.trim() && address.trim()`; projects without `company_name`/`address` silently produced empty strings and permanently blocked step advancement. Eliminated by removing INFO_STEP (see below).
- **INFO_STEP removed** from safety-net, mobile-ladder, lifting-accessories: flows now start directly at the identification step. `TOTAL_STEPS` reduced by 1 in each; `FlowHeader` step offset corrected.
- **Forklift INFO_STEP cleaned**: removed company, address, inspector name, and inspection date from `IdentificationGrid`; only inventory #, brand/model, and engine type remain (the fields that require manual entry).
- **Fall-protection REGISTRY_STEP cleaned**: removed company and address `FloatingLabelInput` blocks; `canGoNext` no longer requires them.
- **Bobcat large-loader questionnaire fixed**: deleted `renderChecklistList()` (no photo/comment support); replaced with `ChecklistSection` + `KeyboardAwareScrollView` — tap ⚠/✗ on any item to expand the accordion showing comment field and photo upload button.

## 2026-05-19 (2)

### crane_technical_order — ამწის ტექ. გამართულობაზე პასუხისმგებელი პირის ბრძანება
- New `crane_technical_order` document type (`CraneTechnicalOrderFormData` in `types/models.ts`).
- `buildCraneTechnicalOrderHtml` in `lib/orderPdf.ts` — mirrors crane_operator_order layout; differs in title, single-paragraph 429-decree legal basis, and 7 Georgian-letter sub-clauses (ა–ზ) + 3 bullet duties for technical maintenance.
- `app/orders/new.tsx`: added to `DOC_TYPES` (construct-outline icon, directly below crane_operator_order); `Step3CraneOperator` now accepts `positionLabel`/`positionField`/`stepTitle` props; `StepSignCraneOperator` accepts `stepTitle`/`personLabel`; `isCraneVariant` helper covers both crane types for all step routing.
- No new migration — reuses existing `orders` table (migration 0038).

## 2026-05-19

### Breathalyzer Log — ალკოტესტერის შემოწმების ჟურნალი (migration 0048)
- New **ჟურნალები** (Logs) section on the project screen (`app/projects/[id].tsx`), showing recent breathalyzer logs with date, test count, status, and FAIL badges.
- Journal screen at `app/projects/[id]/logs/breathalyzer.tsx`:
  - Header with date and editable device S/N field; green "დასრულებული" badge when closed.
  - "Start today's log" empty state when no log exists for today.
  - Entry list with # / Name·Position / time / result badge (SAFE/WARNING/FAIL pill) / signature icon.
  - Indent + "↩ განმეორებითი" label for repeat-test rows.
  - Red FAIL card prompting a 15-minute repeat test after a ≥0.20 result.
  - "ცვლის დასრულება" outlined button → close-shift modal with summary + responsible-person signature → PDF generation.
  - "+ ჩანაწერის დამატება" green FAB always visible.
- **4-step Add Entry bottom sheet** (full-screen modal):
  1. Person — autofocus search, filtered suggestions from ProjectPeoplePool + project crew, initials avatar, last-tested distance.
  2. Test type — large chips (პირველადი / განმეორებითი); pre-selects repeat when launched from FAIL card.
  3. Result — large centered numeric input, real-time background color (green/amber/red), SAFE/WARNING/FAIL label, FAIL warning card.
  4. Signature — tappable placeholder → `SignatureCanvas` modal; "ხელმოწერაზე უარი" checkbox bypass.
- **ProjectPeoplePool**: per-project, AsyncStorage key `people_pool_{projectId}`. Upserted on every entry save (most-recently-tested first). Suggestions combine pool + project crew; never crosses project boundaries.
- PDF (`lib/breathalyzerLogPdf.ts`): company/object/S/N header, bilingual title, SAFE/WARNING/FAIL instruction row, color-coded result table with signatures, summary block, responsible-person signature block.
- `breathalyzer_logs` table (Supabase), `types/breathalyzerLog.ts`, `lib/breathalyzerLogService.ts`, `lib/breathalyzerLogPdf.ts`, `useBreathalizerLogsByProject` hook.

### Lifting Accessories Inspection (migration 0049)
- New template: **სამაგრი მოწყობილობების შემოწმების აქტი** (`lifting_accessories_inspection`, UUID `aaaaaaaa-…`)
- Multi-device wizard (same pattern as safety-net / mobile-ladder); `lifting_accessories_inspections` table
- `types/liftingAccessories.ts`, `lib/liftingAccessoriesService.ts`, `lib/liftingAccessoriesPdf.ts`

### Forklift Inspection (migration 0047)
- New template: **ჩანგლიანი დამტვირთველის შემოწმების აქტი** (`forklift_inspection`, UUID `dddddddd-…`)
- 3-step wizard (identification → checklist → conclusion); 10-day scheduling cycle
- 39 checklist items across 3 sections (A/B/C); `type="three_state"` (კარგი ✓ / ნაკლი ⚠ / გამოუსადეგ. ✗)
- Engine type chips (ელექტრო / ბენზინი / დიზელი / გაზი) in identification step and PDF header
- Component diagram card (A–K labels) in checklist step
- 13-row summary table with fine-grained subcategories before verdict
- Extended signature: name + position + phone + signature columns
- `forklift_inspections` table, `types/forklift.ts`, `lib/forkliftService.ts`, `lib/forkliftPdf.ts`

### Fall Protection Inspection (migration 0046)
- New template: **დამჭერი მოწყობილობების შემოწმების აქტი** (`fall_protection_inspection`, UUID `cccccccc-…`)
- Same multi-device registry-→-tabs pattern as safety net / mobile ladder
- **4-state ChecklistItem** (`type="four_state"`): ✓ safe (green) · ✗ critical (red) · Z minor (amber) · N not checked (gray)
  - Extends `ChecklistItemOptions` with optional `d` chip; adds `'four_state'` type to `ChecklistItem.tsx`
  - Auto-verdict suggestion: any ✗ → banned, any Z → minor, else safe
- 12 standard checklist items + 1 custom (editable label per device)
- Per-device: VerdictSelector (safe/minor/banned) + SignatureBlock (1 signatory) + PhotoSection
- Tab state `'warning'` (amber) introduced for devices with only minor findings
- `fall_protection_inspections` table, `types/fallProtection.ts`, `lib/fallProtectionService.ts`, `lib/fallProtectionPdf.ts`
- PDF footer: EN 363:2008 · EN 795:2012 · EN 354:2010 · EN 355:2002 · EN 1891:2020 · EN 361:2002

### Safety Net Inspection (migration 0044)
- New template: safety net inspection (`safety_net_inspection`, UUID `88888888-…`)
- Multi-device wizard; `safety_net_inspections` table + `types/safetyNet.ts` + `lib/safetyNetService.ts` + `lib/safetyNetPdf.ts`

### Mobile Ladder Inspection (migration 0045)
- New template: mobile ladder inspection (`mobile_ladder_inspection`, UUID `bbbbbbbb-…`)
- Multi-device wizard; `mobile_ladder_inspections` table + `types/mobileLadder.ts` + `lib/mobileLadderService.ts` + `lib/mobileLadderPdf.ts`

### Rename: "დოკუმენტები" → "ბრძანებები"
- Tour step title/body in `locales/ka.json` and `locales/en.json` updated to reflect the section's true purpose (orders + files)

### New order template: კოშკურა ამწის ოპერატორის დანიშვნა (`crane_operator_order`)
- 7-step wizard: type → company → operator info → crane specs → director sig → operator sig → summary
- Form fields: company (auto-fill), appointed operator (name/ID/position/cert/expiry/phone + optional cert photo), crane specs (model/number/max load + optional inspection cert photo)
- Fixed 10-clause duties list (ა–კ) in the PDF body — not editable
- Sequential dual-signature flow: director signs first, then operator
- PDF: same layout as fire_safety_order (company header, order title, info tables, duties, signature block)
- No DB migration required — stored as a new `document_type` value in the existing `orders` table

---

## 2026-05 — `after-testflight` + session work

### Cargo Platform Inspection (f80a372)
- New specialized inspection type: ტვირთის მიმღები პლატფორმის შემოწმების აქტი
- 6-step mobile wizard: info → platform ID → cargo table → 9-item checklist → verdict → dual signatures
- 3-result checklist (good / fix / n/a — amber for fixable, not red)
- Dynamic cargo table with auto-summing total weight
- `cargo_platform_inspections` table (migration 0040), template UUID `77777777-…`
- Web: full CRUD — `NewCargoPlatformInspection.tsx` + `CargoPlatformInspectionDetail.tsx`
- Web: print page at `/cargo-platform/:id/print`

### Mobile Scaffold Templates (f80a372)
- Mobile Scaffold N1 (`mobile_scaffold` category) — migration 0041
- Mobile Scaffold N3 (`mobile_scaffold_n3` category) — migration 0042
- Both use generic `inspections` table + template picker routing
- Web: category labels added to `Templates.tsx`

### Skeleton Loading System (f80a372)
- `web-app/src/components/SkeletonCard.tsx` extended with `SkeletonStatCard`, `SkeletonGrid`, `SkeletonDetailPage`
- All web detail pages now return skeleton on `isLoading`
- Home stat cards pulse instead of showing `0` during load
- Projects/Templates show grid skeleton; list pages show row skeletons
- `PageFallback` (Suspense boundary) shows pulse instead of plain text

### Fire Safety Order Templates (session work — uncommitted)
- `fire_safety_order`: სახანძრო უსაფრთხოებაზე პასუხისმგებელი პირის დანიშვნა
  - 3-clause document, 2-signatory signing flow (director → appointed)
  - Builds full A4 PDF with embedded signatures
- `fire_safety_order_enterprise`: საწარმოს სახანძრო უსაფრთხოებაზე პასუხისმგებელი პირის დანიშვნა
  - Adds `appointedPosition` + `appointedIdNumber` fields
  - 5-clause document: extended sub-clauses (№457 decree, Permit to Work, briefing journal, evacuation drills, compressed gases)
  - 4 legal basis bullets (adds №477 construction sites decree)
  - Same 2-signatory flow
- Both available on mobile (`app/orders/new.tsx`) and web (`web-app/src/pages/NewOrder.tsx`, `OrderDetail.tsx`)
- No migration needed — `document_type` is plain text, `form_data` is jsonb

---

## 2026-05 — `main`

### Orders / ბრძანებები (720b502)
- New `orders` table (migration 0038): `document_type text`, `form_data jsonb`, `status`
- 4 document templates: labor safety specialist, alcohol control, fire safety order, fire safety enterprise order
- Mobile wizard (`app/orders/new.tsx`): 4–6 step flow based on document type
- Web wizard (`NewOrder.tsx`) + detail page (`OrderDetail.tsx`)
- Web routes: `/orders/new`, `/orders/:id`

### PDF Security & Hashing (de5ee55)
- SHA-256 hash of each PDF stored in `orders.pdf_hash` / `pdf_hash` column (migration 0039)
- PDF metadata embedded (title, author, creation date)
- `lib/pdfSecurity.ts`

### BOG Recurring Payments (c1e3ef0 → d19059e)
- Georgian BOG payment processor integration — mobile + web parity
- `create-bog-order` Edge Function + `bog-webhook` callback handler
- Mobile: `lib/bogPayment.ts` + `useBogPayment()` hook
- Web: `/subscribe`, `/subscribe/success`, `/subscribe/fail` routes
- `cancel_subscription` RPC (idempotent; access continues until expiry)
- `payment_records` table for audit history (migration 0031)
- See `docs/payments.md` for full flow

### 3D Interactive Safety Guide (2d3bf9a → 12ea1a7)
- React Three Fiber 3D model of a construction site
- 6 clickable building parts → safety checklists + regulation references
- Loaded as WebView on mobile (`/app/safety-standalone`), native page on web dashboard (`/safety`)
- Responsive: side-by-side desktop, stacked mobile

### Project Photos + Geo-Location (68deef4)
- Photos can be attached to projects (multi-select, `project-files` bucket)
- Project location stored as lat/lng; photo taken >500m away triggers mismatch alert
- `photoLocationAlert.ts` shared across wizard, incidents, and future flows
- `answer_photos` extended with `latitude`, `longitude`, `address` (migration 0023)

### Tab Bar + FAB Polish (faefeec)
- Opaque dark-mode tab bar
- Smooth label clipping
- FAB positioned correctly above tab bar

### Web Bundle Splitting + Error Boundary (f8b9877)
- Vite chunk splitting for faster initial load
- Error boundary wrapping all lazy routes
- Security headers via `_headers` file

---

## 2026-04 — Earlier `main` work

### Department Field (0034–0036)
- `department` column added to `bobcat_inspections`, `general_equipment_inspections`, `inspections`
- Shown in info step of respective wizards

### Summary Photos for Bobcat + Excavator (0037)
- `summary_photos` jsonb column added to both tables
- Photo strip in final step of wizard

### Inspector Name Field (0033)
- `inspector_name` column added to `inspections` (generic) table

### PDF Export Speed (2026-04-30)
- Resize + cache pipeline: ~10× faster for multi-photo reports

---

## Known Issues (Current)

1. Signature canvas breaks on phone rotation
2. Web build (`expo start --web`) crashes at boot — worklets shim issue (see README Known Issues #6)
3. Storage RLS gap: `certificates`, `answer-photos`, `pdfs`, `signatures` buckets allow any authenticated user to read/delete (see BUG_REPORT.md)
4. Typecheck fails — expected; note new failures but don't block on them

---

_For detailed context: [`ONBOARDING.md`](../ONBOARDING.md) | [`AI_BRIEFING.md`](AI_BRIEFING.md)_
