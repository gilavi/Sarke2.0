# `lib/inspection` — schema-driven inspection PDF engine (web-app)

## What this module does
Turns a structured inspection row into a print-ready HTML document, using one
data-driven engine instead of per-type hand-written builders. It is a **hand
mirror** of the Expo app's `lib/inspection/` — importing the mobile engine via
`@root/lib/inspection` is **blocked** by `npm run lint:inspection-guard`
(`scripts/check-inspection-mirror.mjs`), a required step in `ci-web-app.yml` and
`deploy-web-app.yml` — so the web-generated PDF is byte-faithful to the mobile
one and rows round-trip. (The broad `@root` allowlist rule in `eslint.config.js`
is only a warning, because a few other shared imports are accepted; this one
engine reach is the hard-fail.)

## Public API
- `buildInspectionPdf(schema, { inspection, projectName, signaturesSession }, photos)`
  → full HTML string (`pdf.ts`). `photos` is a `PhotoMap` of `storagePath → https URL`
  (signed by the caller). `signaturesSession` is the in-memory captured-signature
  payload (never read from storage).
- `getInspectionSchema(category)` / `INSPECTION_SCHEMAS` (`registry.ts`) — look up a
  schema by category tag (= `templates.category` = `inspections.type`).
- `InspectionSchema<T>` + `PdfBlock<T>` DSL (`schema.ts`); `AnyInspectionSchema` is the
  variance escape-hatch for heterogeneous collections (the registry).
- `renderSignaturesSection(data)` + `SignaturesSectionData` (`renderSignaturesSection.ts`).
- `BASE_PDF_CSS` (`pdfStyles.ts`), `escapeHtml` / `fmtDate` (`escape.ts`).

## Internal files
- `schema.ts` — the DSL (block union: machineSpecs / infoFields / checklist /
  maintenance / verdict / signatures / custom). `custom` is the per-act escape hatch.
- `pdf.ts` — one renderer per block `kind`; assembles header + body + signatures + footer.
- `pdfStyles.ts` — `BASE_PDF_CSS`; per-act deltas live in each schema's `extraCss`.
- `escape.ts`, `renderSignaturesSection.ts` — shared helpers (mirrors of Expo files).
- `registry.ts` — category → schema map.
- `schemas/<type>.ts` — one schema per act (currently `bobcat`, `safetyNet`).

## Gotchas
- **Keep in sync with Expo by hand.** When the mobile `lib/inspection/schemas/<type>.ts`
  or `pdfStyles.ts` changes, port the change here. Do **not** add an
  `@root/lib/inspection` import — `npm run lint:inspection-guard` fails the build
  (CI + prod deploy) if you do.
- **Signatures are never persisted** (regulatory). Schemas deliberately OMIT the
  persisted signature section the mobile schema renders; the captured signature is
  appended by `buildInspectionPdf` from the in-memory `signaturesSession`.
- The interactive wizard catalogs and these PDF schemas both read from
  `@/lib/types/<type>.ts` — that shared source keeps screen + PDF in sync.

## Canonical helpers consumed
- `@/lib/types/<type>.ts` (item catalogs + vocab + model shapes).
- Signed photo URLs come from `@/lib/photoUpload` (`signedInspectionPhotoUrl`), resolved
  by the print route (`pages/print/StructuredInspectionPrint.tsx`) before calling the engine.
