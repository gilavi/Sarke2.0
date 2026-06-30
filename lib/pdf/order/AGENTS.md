# lib/pdf/order

## What this module does
Builds the HTML for the eight "ბრძანება" (workplace order / plan) PDFs.
Each `build*OrderHtml({ formData, projectName })` function returns a
self-contained HTML document that's then rendered to PDF via
`generateAndSharePdf` (in `features/order-new/NewOrderScreen.tsx` for the
classic types; in `features/order-new/OrderActSuccessView.tsx` for the
act-style crane + scaffold types).

## Public API (from index.ts)
- `buildLaborSafetyOrderHtml` + `OrderPdfArgs`
- `buildAlcoholControlOrderHtml` + `AlcoholControlPdfArgs`
- `buildFireSafetyOrderHtml` + `FireSafetyOrderPdfArgs`
- `buildFireSafetyOrderEnterpriseHtml` + `FireSafetyOrderEnterprisePdfArgs`
- `buildCraneOperatorOrderHtml` + `CraneOperatorOrderPdfArgs`
- `buildCraneTechnicalOrderHtml` + `CraneTechnicalOrderPdfArgs`
- `buildScaffoldSupervisionOrderHtml` + `ScaffoldSupervisionOrderPdfArgs`
- `buildTrainingScheduleOrderHtml` + `TrainingScheduleOrderPdfArgs`

`lib/orderPdf.ts` is a one-line barrel that re-exports all of the
above so callers like `features/order-new/` don't need to change paths.

## Internal files
- `_shared.ts` — `fmtDate(iso)` (Georgian-locale `dd.MM.yyyy`,
  falls back to `___________` when blank), `escHtml(s)` HTML-escape,
  and `renderOrderPhoto(dataUrl, caption)` — the reusable captioned
  photo figure (bordered, `page-break-inside:avoid`, inline styles,
  returns `''` for falsy input). Use this for any photo embedded in
  an order PDF instead of hand-rolling `<img>` markup.
  `renderBlankSignatureRows(n)` — N empty hand-sign slots
  (ხელმოწერა / სახელი / თარიღი), clamped 0…20, for "graphs only"
  signature blocks. Crane builders append these from
  `formData.signatureExtraRows`.
- `laborSafety.ts`, `alcoholControl.ts`, `fireSafety.ts`,
  `fireSafetyEnterprise.ts`, `craneOperator.ts`, `craneTechnical.ts`,
  `scaffoldSupervision.ts`, `trainingSchedule.ts` — one builder per
  doctype. `laborSafety.ts` (director-only sig) + `trainingSchedule.ts`
  (mostly-static body) are act-style like the others.

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
- The crane builders embed the operator certificate photo and the
  crane inspection-certificate photo via `renderOrderPhoto`. Builders
  are pure/synchronous, so the **caller** resolves the stored
  `answer-photos` paths to `data:` URLs with `pdfPhotoEmbed` first and
  passes them in as `certPhotoDataUrl` / `inspCertPhotoDataUrl` (both
  `craneOperator.ts` and `craneTechnical.ts`). Their body text mirrors
  the authoritative source orders verbatim (operator: duties ა–ი, wind
  ≥10 მ/წ, PPE + fall-harness; technical: №429 legal basis, inspection
  components ა–ზ, load tests) — don't "improve" the legal wording.
