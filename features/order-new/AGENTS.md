# order-new

## What this module does
Multi-step wizard that creates a workplace order (ბრძანება). Picks
one of six document types — labor-safety specialist, alcohol control,
fire-safety (two variants), or crane (two variants) — and walks the
user through the relevant fields, signatures, and PDF generation.

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
  slug), `canAdvanceStep` (next-button validation predicate).
- `styles.ts` — `makeStyles(theme)` factory, `OrderStyles` type.
- `Step1DocType.tsx` — radio-card list of the six document types.
- `Step2Company.tsx` / `Step2CraneCompany.tsx` — company info, two
  variants (crane omits `city` and adds `objectAddress`).
- `Step3LaborSafety.tsx`, `Step3AlcoholControl.tsx`,
  `Step3FireSafety.tsx`, `Step3FireSafetyEnterprise.tsx`,
  `Step3CraneOperator.tsx` — domain-specific step 3 per docType.
- `Step4CraneSpecs.tsx` — crane variant only (model/number/load).
- `Step4Summary.tsx` — read-only summary card (includes the local
  `SummaryRow` helper).
- `StepSignaturesFireSafety.tsx`, `StepSignaturesCrane.tsx` — the
  combined signature step (director + appointed-person OR
  director + crane operator/specialist).

## Gotchas / non-obvious things
- The form state is one big `CombinedForm` (~40 fields). Each docType
  only reads a subset; unused fields stay at their initial empty
  values. `buildFormData(form, docType)` selects which fields to ship
  to `ordersApi.create()`.
- The original god-file also defined `StepSignDirector`,
  `StepSignAppointed`, and `StepSignCraneOperator` — those were dead
  code (replaced by the combined sig steps) and were not carried over.
  Logged in `REFACTOR_NOTES.md`.
- Steps 3 for `crane_operator_order` and `crane_technical_order`
  share `Step3CraneOperator.tsx` with `positionLabel` /
  `positionField` / `stepTitle` props. Don't fork into two files —
  keep variant differences in props.
- `useEffect` populates the form from the project on mount; if the
  user advances past step 1 before the fetch resolves, the prefilled
  fields still merge in via `setForm(f => ({ ...f, ... }))` so user
  edits aren't clobbered.
- The crane auto-generated order number (`KR-<year>/<seq>`) only fires
  when `docType` is a crane variant AND `form.orderNumber === ''` —
  re-selecting the docType after the user typed a number won't
  overwrite their value.

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
- `hooks/usePhotoWithLocation` — photo picker for crane cert images.
- `components/ui` — `Button`; `components/inspection-parts` — `QualDoc`;
  `components/SignatureCanvas`.
