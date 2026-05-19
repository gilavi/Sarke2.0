# What's New — Sarke 2.0 Changelog

**Updated:** 2026-05-19 | Branch: `gio/web-2.0-ux`

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
