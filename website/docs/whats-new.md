---
sidebar_position: 2
---

# What's New

**Last updated:** May 14, 2026  
**Current branch:** `main`

---

## May 2026 — Cargo Platform, Orders, Enterprise Fire Safety, Skeleton Loading

### Cargo Platform Inspection

New specialized inspection type: **ტვირთის მიმღები პლატფორმის შემოწმების აქტი**.

- 6-step mobile wizard: info → platform ID → cargo table → 9-item checklist → verdict → dual signatures
- 3-result checklist: ✓ good / ✗ fix / N/A (amber for fixable, not red)
- Dynamic cargo table with auto-summed total weight
- `cargo_platform_inspections` table (migration `0040`), template UUID `77777777-…`
- Full web support: `NewCargoPlatformInspection`, `CargoPlatformInspectionDetail`, print page
- Category: `cargo_platform` → routes to `app/inspections/cargo-platform/[id].tsx`

### Mobile Scaffold Templates

- **N1** — `mobile_scaffold` category (migration `0041`)
- **N3** — `mobile_scaffold_n3` category (migration `0042`)
- Both use the generic `inspections` table and template picker

### Orders / ბრძანებები System

New module for generating legally formatted appointment orders.

- Migration `0038`: single `orders` table with `document_type text` and `form_data jsonb`
- No per-type tables or CHECK constraints — flexible by design

| Document type | Label | Signing flow |
|---|---|---|
| `labor_safety_specialist` | შრომის უსაფრთხოების სპეციალისტის დანიშვნა | None |
| `alcohol_control` | ალკოჰოლური და ნარკოტიკული თრობის კონტროლი | None |
| `fire_safety_order` | სახანძრო უსაფრთხოებაზე პასუხისმგებელი პირის დანიშვნა | Director → appointed (2-sig) |
| `fire_safety_order_enterprise` | საწარმოს სახანძრო უსაფრთხოებაზე… | 2-sig + `appointedPosition` + `appointedIdNumber`; 5-clause document |

Mobile: `app/orders/new.tsx` (4–6 step wizard) + `app/orders/[id].tsx` (success screen)  
Web: `NewOrder.tsx` + `OrderDetail.tsx` at `/orders/new` and `/orders/:id`  
Signatures stored as base64 PNG inside `form_data` (not in the `signatures` table)

See [Orders](./orders) for the full reference.

### Web Skeleton Loading

- `SkeletonCard.tsx` extended with `SkeletonStatCard`, `SkeletonGrid`, `SkeletonDetailPage`
- Home stat cards pulse on load instead of showing `0`
- All detail and list pages return correct skeleton variants while `isLoading`

---

## May 2026 — TestFlight Build + Web Performance — Luka

**Build fixes for TestFlight:**
- Disable Sentry auto-upload to fix Xcode cloud build (`4e0e17e`)
- Regenerate `package-lock.json` for EAS sync (`4c812e8`)
- Update `projectId`, remove stale owner, add `RECORD_AUDIO` permission (`468242f`)

**Web dashboard performance (`2f812f3`):**
- Vite `manualChunks` — threejs, leaflet, radix-ui, supabase, icons split into separate JS chunks
- `staleTime` / `gcTime` on all React Query hooks; `.limit(50)` on all list queries
- `VirtualList.tsx` using `react-window` + `react-virtualized-auto-sizer` for long lists
- Memoized `AppShell`, `Sidebar`, `Landing`, `InspectionCard` via `React.memo()`
- `RoutePrefetcher` for early data loading
- `Scene3D`: DPR capped at 1.5, shadow map 1024, memoized lighting
- Fine-grained Zustand selectors in `useSafetySelectors.ts`

---

## April 2026 — BOG Payments, 3D Safety Guide, PDF Security, Specialized Inspections

### BOG Recurring Payments

Georgian payment processor — mobile + web parity.

- Edge functions: `create-bog-order` + `bog-webhook`
- `payment_records` table (migration `0031`); subscription fields on `users` (migration `0028`)
- Free tier: 30 PDFs; unlimited for active subscribers
- Web: `/subscribe`, `/subscribe/success`, `/subscribe/fail`, `SubscriptionCard` on home

See [`docs/payments.md`](https://github.com/gilavi/Sarke2.0/blob/main/docs/payments.md).

### 3D Interactive Safety Guide

React Three Fiber 3D model of a construction site — 6 clickable parts with safety checklists and regulation references. Loaded as WebView on mobile; native `/safety` route in the web dashboard.

### PDF Security

- SHA-256 hash of each generated PDF stored in `pdf_hash` column (migration `0039`)
- PDF metadata embedded: title, author, creation date

### Specialized Inspection Types

| Type | Category | Table | Migration |
|---|---|---|---|
| Bobcat | `bobcat` | `bobcat_inspections` | `0024` |
| Large Loader | `bobcat` | `bobcat_inspections` | `0025` |
| Excavator | `excavator` | `excavator_inspections` | `0026` |
| General equipment | `general_equipment` | `general_equipment_inspections` | `0027` |

### Project Photos + Geo

- Photos attachable to projects (`project-files` bucket)
- Photo taken >500 m from project location triggers mismatch alert
- `answer_photos.latitude/longitude/address` — migration `0023`

---

## Known Issues

| Issue | Status |
|---|---|
| Signature canvas breaks on phone rotation | 🔄 Roadmap |
| Web build (`expo start --web`) crashes at boot | ⚠️ Worklets shim — use native only |
| Storage RLS gap on 4 core buckets | 🔍 Open — see `BUG_REPORT.md` |
| TypeScript typecheck failures | ✅ Accepted — note new failures, don't add |
