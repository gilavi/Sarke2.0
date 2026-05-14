# PDF Generation

PDFs are rendered locally on the device (mobile) or opened in a new browser tab (web). There is no server-side PDF service.

## Two PDF systems

### 1. Inspection certificates (mobile only)

For the generic inspection flow. Single HTML template in `lib/pdf.ts`.

```mermaid
flowchart LR
  A[Completed inspection] --> B[Build HTML\nlib/pdf.ts]
  B --> C[Embed photos + signatures\nas base64 data URIs]
  C --> D[expo-print\nHTML → PDF]
  D --> E[Upload to\npdfs bucket]
  E --> F[Insert certificates row]
  F --> G[Share sheet]
```

### 2. Specialized inspection PDFs (mobile + web)

Each specialized inspection type has its own PDF builder:

| Type | Mobile builder | Web |
|---|---|---|
| Bobcat | `lib/bobcatPdf.ts` | `web-app/src/pages/print/BobcatPrint.tsx` |
| Excavator | `lib/excavatorPdf.ts` | `web-app/src/pages/print/ExcavatorPrint.tsx` |
| General equipment | `lib/generalEquipmentPdf.ts` | `web-app/src/pages/print/GeneralEquipmentPrint.tsx` |
| Cargo platform | `lib/cargoPlatformPdf.ts` | `web-app/src/pages/print/CargoPlatformPrint.tsx` |

All builders share utilities from `lib/pdfShared.ts`:
- `embedInspectionPhotos(paths)` — fetches storage URLs, resizes, base64-encodes
- `escHtml(s)` — escapes user content
- `fmtDate(iso)` — formats dates in `ka-GE` locale

Mobile entry point: `generateAndSharePdf(html)` in `lib/pdfOpen.ts` → `expo-print` + `expo-sharing`.

### 3. Order PDFs (mobile + web)

Appointment orders (ბრძანებები) have their own builder per document type.

**Mobile:** `lib/orderPdf.ts`
- `buildLaborSafetyOrderHtml(f)`
- `buildAlcoholControlOrderHtml(f)`
- `buildFireSafetyOrderHtml(f)`
- `buildFireSafetyOrderEnterpriseHtml(f)`

**Web:** `web-app/src/lib/orderPdf.ts` — same builders, opens via `openOrderPdfPreview(html)` in a new tab.

## PDF security

Migration `0039` adds a `pdf_hash` column. After generating a PDF, a SHA-256 hash is computed and stored alongside the file URL. Implemented in `lib/pdfSecurity.ts`.

## PDF paywall

`lib/pdfGate.ts` (mobile) and `web-app/src/lib/pdfGate.ts` (web) call `checkAndIncrementPdfCount(userId)` before allowing generation. The `increment_pdf_count` Supabase RPC enforces a 30-PDF free-tier cap; active subscribers get unlimited. Defined in migration `0028` + `0029`.

## Why base64 data URIs

`expo-print` evaluates the HTML in a hidden WebView. On iOS / Hermes, fetching `https://` Supabase Storage URLs from inside that WebView was unreliable and intermittently produced PDFs with broken images. The fix (commit `23f3e89`) is to fetch each photo + signature as a `Uint8Array`, base64-encode it, and inline it into the HTML. Adds upfront fetch time but eliminates the failure mode entirely.

## Why `FileSystem.uploadAsync` for photos

The earlier upload path went through `Blob` → Supabase JS client. Hermes' `Blob` implementation is incomplete in the area Supabase uses — uploads silently produced 0-byte objects. The current path (commit `feb13af`) uses `expo-file-system`'s `uploadAsync`, which streams directly to Supabase Storage's REST endpoint, bypassing the Blob bug.

## Snapshotting

When a certificate is generated, key fields are **copied** from the inspection into the certificate row. Re-rendering the same inspection later will not retroactively change the visual content of an old certificate. `params jsonb` captures any additional template parameters used at generation time.
