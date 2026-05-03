# PDF Generation

Inspection certificates are rendered locally on the device — there is no server-side PDF service.

## Pipeline

```mermaid
flowchart LR
  A[Completed inspection] --> B[Build HTML in lib/pdf.ts]
  B --> C[Embed photos<br/>and signatures<br/>as base64 data URIs]
  C --> D[expo-print<br/>renders HTML → PDF]
  D --> E[Upload to<br/>pdfs bucket]
  E --> F[Insert certificates row]
  F --> G[Local file URI for share sheet]
```

## Why base64 data URIs

`expo-print` evaluates the HTML in a hidden WebView. On iOS / Hermes, fetching `https://` Supabase Storage URLs from inside that WebView was unreliable and intermittently produced PDFs with broken images. The fix (commit `23f3e89`) is to fetch each photo + signature as a `Uint8Array`, base64-encode, and inline it into the HTML. Adds upfront fetch time but eliminates the failure mode.

## Why FileSystem.uploadAsync for photos

The earlier upload path went through `Blob` → Supabase JS client. Hermes' `Blob` implementation is incomplete in the area Supabase uses — uploads silently produced 0-byte objects. The current path (commit `feb13af`) uses `expo-file-system`'s `uploadAsync`, which streams the file directly to Supabase Storage's REST endpoint and bypasses the Blob bug.

## Where to look

- HTML templates: `lib/pdf.ts`
- Image embedding: `lib/blob.ts`, `lib/imageUrl.ts`
- Sharing: `lib/sharePdf.ts`
- Certificate row insertion: `inspectionsApi` / `certificatesApi` in `lib/services.real.ts`

## Snapshotting

When a certificate is generated, `is_safe_for_use` and `conclusion_text` are **copied** from the inspection into the certificate row. Re-rendering the same inspection later (after a UI tweak that displays the conclusion differently, for example) will not change the visual content of an old certificate. `params jsonb` captures any additional template parameters used at generation time.
