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
- `template.ts` — the main `buildInspectionPdfTemplate` (now ~280
  lines, almost entirely HTML structure since the stylesheet moved
  to `template.css.ts`).
- `template.css.ts` — `getInspectionPdfCss({ isPdf })`. Holds the
  ~550-line stylesheet as a tagged template literal. The only
  dynamic value is `isPdf` (widens body padding + enables
  `page-break-inside: avoid` for the structural cards).
- `_shared.ts` — `tPdf` (Georgian-locked translator against
  `locales/ka.json`), `formatDate`, `pad2`, `escapeHtml`.
- `renderQuestion.ts` — `renderQuestion` + private `isProblemValue` /
  `classifyCell` for grid-cell verdict colouring.
- `renderPhoto.ts` — `renderPhoto`; handles data URIs, local
  `file://`/`content://`/`ph://`/`asset://`, and remote URLs, plus a
  fallback placeholder for unrenderable refs.
- `renderSignaturesSection.ts` — `renderSignaturesSection`; takes a
  `SignaturesSectionData` snapshot from the wizard's
  `features/signatures/sessionStore` and emits the unified section
  (heading + creator capture + N labeled empty hand-sign slots).
  Returns an empty string when neither part is populated, so the
  section is omitted entirely from the PDF.
- `renderProjectBrand.ts` — `renderProjectBrand` (logo or initials).

## Gotchas / non-obvious things
- All locale lookups go through `tPdf(key)`, not the user-facing
  `i18next` instance. PDFs are always Georgian regardless of UI
  language.
- Photo paths are not fetched here — callers must pre-resolve
  `photosByAnswer[id][*].storage_path` to renderable URLs. See
  `lib/inspection/photos.ts` and `lib/inspection/renderMobile.ts`.
- The stylesheet lives in a separate `template.css.ts` so the
  structure file reads as plain HTML. Only `isPdf` flows from the
  template into the CSS (via the function argument); any other
  dynamic CSS values should land in the structure file as inline
  styles, not new args to `getInspectionPdfCss`.

## Canonical helpers used
- `locales/ka.json` — strings.
- `types/models` — Answer, AnswerPhoto, Inspection,
  InspectionAttachment, Project, Question, SignatureRecord,
  SignerRole, Template, SIGNER_ROLE_LABEL.
