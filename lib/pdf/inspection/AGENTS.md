# lib/pdf/inspection

## What this module does
Single-source HTML builder for generic inspection PDFs (harness,
bobcat-generic, etc.). Pure synchronous — zero platform-specific deps.
Accepts pre-resolved photo URLs/data-URIs so the same template renders
on both mobile (expo-print, base64 embeds) and web (Supabase signed
HTTPS URLs).

Called by:
- `lib/pdf.ts` — mobile wrapper (async, embeds photos as base64)
- `web-app/src/pages/print/InspectionPrint.tsx` — web wrapper (React
  Query, signed URLs, iframe)

## Public API (from index.ts)
- `buildInspectionPdfTemplate(args)` — main function; returns a
  complete HTML doc.
- `PdfTemplateArgs`, `PdfAttachment` — argument types.

`lib/inspectionPdfTemplate.ts` is a one-line barrel re-exporting all
of the above so existing callers don't need to change paths.

## Internal files
- `template.ts` — the main `buildInspectionPdfTemplate` (still large:
  ~810 lines, mostly inline CSS + page structure).
- `_shared.ts` — `tPdf` (Georgian-locked translator against
  `locales/ka.json`), `formatDate`, `pad2`, `escapeHtml`.
- `renderQuestion.ts` — `renderQuestion` + private `isProblemValue` /
  `classifyCell` for grid-cell verdict colouring.
- `renderPhoto.ts` — `renderPhoto`; handles data URIs, local
  `file://`/`content://`/`ph://`/`asset://`, and remote URLs, plus a
  fallback placeholder for unrenderable refs.
- `renderSignatures.ts` — `renderSignatures`; orders expert first,
  filters to status==='signed' with a valid base64 PNG.
- `renderProjectBrand.ts` — `renderProjectBrand` (logo or initials).

## Gotchas / non-obvious things
- All locale lookups go through `tPdf(key)`, not the user-facing
  `i18next` instance. PDFs are always Georgian regardless of UI
  language.
- Photo paths are not fetched here — callers must pre-resolve
  `photosByAnswer[id][*].storage_path` to renderable URLs. See
  `lib/inspection/photos.ts` and `lib/inspection/renderMobile.ts`.
- `template.ts` still owns several hundred lines of inline CSS. A
  follow-up could split that into `template.css.ts` exporting a
  template literal — left as-is for byte-for-byte parity.

## Canonical helpers used
- `locales/ka.json` — strings.
- `types/models` — Answer, AnswerPhoto, Inspection,
  InspectionAttachment, Project, Question, SignatureRecord,
  SignerRole, Template, SIGNER_ROLE_LABEL.
