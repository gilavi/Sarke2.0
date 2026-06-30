# order-new

## What this module does
Multi-step wizard that creates a workplace order (ბრძანება). Picks
one of eight document types — labor-safety specialist, alcohol control,
fire-safety (two variants), crane (two variants), scaffold supervision,
or training-schedule — and walks the user through the relevant fields
and PDF generation. The "classic" types (alcohol, enterprise fire
safety) capture signatures + generate the PDF in the wizard; the
"act-style" types (crane ×2, scaffold, simple fire safety, labor
safety, training schedule) finish on the success screen
(`isActStyleOrder`).

Backs the `app/orders/new.tsx` route.

## Public API (from index.ts)
- `NewOrderScreen` — default export; renders the entire flow.

## Internal files
- `NewOrderScreen.tsx` — orchestrator. Owns step state, form state,
  load-from-project effect, save-draft and save-and-generate-PDF
  flows, and renders the step-specific component per `step` × `docType`.
- `orderFormSchema.ts` — pure helpers: `Step`, `CombinedForm`,
  `INITIAL_FORM`, `DOC_TYPES`, `getTotalSteps`, `isFireSafetyVariant`,
  `isCraneVariant`, `isCraneOperatorVariant` (deprecated alias),
  `buildFormData` (per-docType payload shaping), `docSlug` (PDF name
  slug), `missingFieldsForStep` (ordered keys of the empty/invalid
  required fields for a step × docType — single source of truth),
  `canAdvanceStep` (next-button validation predicate, now just
  `missingFieldsForStep(...).length === 0`).
- `styles.ts` — `makeStyles(theme)` factory, `OrderStyles` type.
- `Step1DocType.tsx` — doc-type picker. Uses the canonical
  `components/ui/Selector` (`presentation="rows"`, `indicator="check"`)
  — the black ink-selected card shared with incidents/briefings/reports
  — NOT a bespoke radio card.
- `Step2Company.tsx` / `Step2CraneCompany.tsx` — company info, two
  variants (crane omits `city` and adds `objectAddress`).
- `Step3LaborSafety.tsx`, `Step3AlcoholControl.tsx`,
  `Step3FireSafety.tsx`, `Step3FireSafetyEnterprise.tsx`,
  `Step3CraneOperator.tsx` — domain-specific step 3 per docType.
  For crane this is **operator basics only** (name, personal ID,
  position/qualification, phone).
- `Step3Scaffold.tsx` — scaffold-supervision step 3: name (required),
  position, phone only (no ID/cert). Scaffold is a 3-step flow
  (type · company · supervisor) then the act-style success screen.
- `Step4CraneCertificate.tsx` — crane variant only; the certificate
  step (number [required], validity date, certificate photo). Split
  out of the operator step so each screen stays focused.
- `StepCraneSerial.tsx` — crane variant only; dedicated step for the
  crane serial / registration number (`craneNumber`), mirroring the
  inspection identification steps. Renders at **step 5** for crane.
- `Step4CraneSpecs.tsx` — crane variant only (model/type, max load +
  inspection-cert photo; the number moved to `StepCraneSerial`).
  Renders at **step 6** for crane.
- `Step4Summary.tsx` — read-only summary card (includes the local
  `SummaryRow` helper). Crane summary omits "signed" rows (crane uses
  blank hand-sign graphs, see below).
- `StepSignaturesFireSafety.tsx` — **enterprise** fire-safety signature
  step only; still captures digital signatures (director + appointed
  person). Simple `fire_safety_order` is act-style (signed on the
  success screen).
- `OrderActSuccessView.tsx` — the act-style success screen for **all**
  act-style orders (crane operator, crane technical, scaffold
  supervision; `isActStyleOrder`). These have **no in-wizard summary or
  signature step**; the wizard saves the record and routes here, where
  the user adds signature graphs (the unified `SignaturesScreen` via
  `FlowSuccessScreen` flow=`order`) and the PDF is generated **on
  demand** (dispatches the builder by docType, resolves crane photos,
  passes the in-memory signature snapshot — director signature + N blank
  rows — shares, uploads, sets `pdfUrl`). Nothing signature-related is
  persisted.

## Gotchas / non-obvious things
- The form state is one big `CombinedForm` (~40 fields). Each docType
  only reads a subset; unused fields stay at their initial empty
  values. `buildFormData(form, docType)` selects which fields to ship
  to `ordersApi.create()`.
- The original god-file also defined `StepSignDirector`,
  `StepSignAppointed`, and `StepSignCraneOperator` — those were dead
  code (replaced by the combined sig steps) and were not carried over.
  Logged in `docs/reports/REFACTOR_NOTES.md`.
- Steps 3 for `crane_operator_order` and `crane_technical_order`
  share `Step3CraneOperator.tsx` with `positionLabel` /
  `positionField` / `stepTitle` props. Don't fork into two files —
  keep variant differences in props.
- `useEffect` populates the form from the project on mount; if the
  user advances past step 1 before the fetch resolves, the prefilled
  fields still merge in via `setForm(f => ({ ...f, ... }))` so user
  edits aren't clobbered.
- Blocked "Next"/"Generate" presses scroll the first empty required
  field into view via `useScrollToError` (`hooks/useScrollToError.ts`):
  `NewOrderScreen` passes `scrollRef` to `KeyboardSafeArea` and
  `registerField` to every multi-field step. Each required field is
  wrapped in `<View onLayout={registerField('<key>')}>`, and the keys
  MUST match exactly what `missingFieldsForStep` returns (the
  **fire-safety** signature step uses `directorSignature` +
  `appointedSignature`; crane has no signature step in the wizard).
  Keep the three in sync: schema condition, red-field `error`, and the
  `registerField` wrapper.
- **Act-style step orders.** Crane (6 steps): 1 type · 2 company · 3
  operator basics · 4 certificate (`Step4CraneCertificate`) · 5 serial
  number (`StepCraneSerial`) · 6 crane specs. Scaffold + simple fire
  safety + labor safety (3 steps): 1 type · 2 company · 3 person
  (`Step3Scaffold` / `Step3FireSafety` / `Step3LaborSafety`). Training
  schedule (2 steps): 1 type · 2 company (`Step2TrainingCompany`, just
  company + director — the body is fixed). All have **no summary or
  signature step** — the final button saves the record
  (`status:'completed'`, no PDF) and routes to the success screen.
  `getTotalSteps` + the `step === N` render guards in `NewOrderScreen`
  + `missingFieldsForStep` must move together if this changes. Crane
  cert number is required at step 4 (not 3).
- **Act-style orders finish like an act** (`isActStyleOrder` = crane
  ×2 + scaffold + simple fire safety + labor safety + training
  schedule). Unlike the classic types (which generate the PDF in the
  wizard), these generate the PDF on the **success screen**
  (`OrderActSuccessView` → `FlowSuccessScreen` flow=`order`). Signatures
  are blank graphs added there via the shared `SignaturesScreen`; the
  director's optional digital signature + the count of added blank rows
  are passed to the per-type builder as `directorSignatureBase64` /
  `extraSignatureRows`. **Nothing signature-related is persisted**
  (regulatory; matches inspections). `NewOrderScreen.buildHtml` /
  `saveAndGeneratePdf` build the PDF **only** for the two classic
  in-wizard types (`alcohol_control`, `fire_safety_order_enterprise`);
  act-style PDFs are built in `OrderActSuccessView`.
- The crane auto-generated order number (`KR-<year>/<seq>`) only fires
  when `docType` is a crane variant AND `form.orderNumber === ''` —
  re-selecting the docType after the user typed a number won't
  overwrite their value.
- Crane orders embed two photos (operator cert + crane inspection
  cert) in the PDF. The picked photos upload to `answer-photos` and
  only their **paths** live in the form. `OrderActSuccessView`
  resolves those paths to `data:` URLs via `pdfPhotoEmbed` (failures
  swallowed so a bad photo never aborts the PDF) before calling the
  (synchronous) crane builder. (Scaffold has no photos.)

## Canonical helpers used (from lib/)
- `lib/services` — `projectsApi`, `storageApi`.
- `lib/ordersApi` — order CRUD.
- `lib/orderPdf` — six `build*OrderHtml(...)` functions, one per
  docType.
- `lib/pdfOpen` / `lib/pdfSecurity` / `lib/pdfName` /
  `lib/pdfUploadQueue` — PDF rendering, hashing, naming, async upload.
- `lib/usePdfUsage` — quota gating for the paywall.
- `lib/supabase` — `STORAGE_BUCKETS`.
- `lib/theme`, `lib/toast`, `lib/session`, `lib/logError`,
  `lib/errorMap`.
- `hooks/usePhotoPicker` — photo picker for crane cert images.
- `components/ui` — `Button`; `components/inspection-parts` — `QualDoc`;
  `components/SignatureCanvas`.
