# lib/pdf/order

## What this module does
Builds the HTML for the six "ბრძანება" (workplace order) PDFs.
Each `build*OrderHtml({ formData, projectName })` function returns a
self-contained HTML document that's then rendered to PDF via
`generateAndSharePdf` in `features/order-new/NewOrderScreen.tsx`.

## Public API (from index.ts)
- `buildLaborSafetyOrderHtml` + `OrderPdfArgs`
- `buildAlcoholControlOrderHtml` + `AlcoholControlPdfArgs`
- `buildFireSafetyOrderHtml` + `FireSafetyOrderPdfArgs`
- `buildFireSafetyOrderEnterpriseHtml` + `FireSafetyOrderEnterprisePdfArgs`
- `buildCraneOperatorOrderHtml` + `CraneOperatorOrderPdfArgs`
- `buildCraneTechnicalOrderHtml` + `CraneTechnicalOrderPdfArgs`

`lib/orderPdf.ts` is a one-line barrel that re-exports all of the
above so callers like `features/order-new/` don't need to change paths.

## Internal files
- `_shared.ts` — `fmtDate(iso)` (Georgian-locale `dd.MM.yyyy`,
  falls back to `___________` when blank), `escHtml(s)` HTML-escape.
- `laborSafety.ts`, `alcoholControl.ts`, `fireSafety.ts`,
  `fireSafetyEnterprise.ts`, `craneOperator.ts`, `craneTechnical.ts`
  — one builder per doctype.

## Gotchas / non-obvious things
- The HTML strings are tuned for `expo-print`'s PDF renderer — fonts
  reference `Noto Sans Georgian` via a data URI (assumed to be wired
  up at the print boundary). Don't switch to `Inter` or another font
  without re-testing PDF output, Georgian glyphs will fall back.
- Each file is a near-clone of the others (~250 lines, mostly inline
  CSS + table layout). Deduping would require carving a real
  templating system; leave them duplicated until that pays off.
- Signature blocks render a `<img src="data:image/png;base64,...">`
  when `directorSignature` / `appointedSignature` / `operatorSignature`
  is non-null. Don't pre-escape the base64 — it's already URL-safe.
