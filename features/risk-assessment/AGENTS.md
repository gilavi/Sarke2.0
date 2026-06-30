# features/risk-assessment

## What this module does
The **რისკების შეფასება** (risk assessment) per-project register — a new
document category alongside inspections/orders/journals. One Supabase table
(`risk_assessments`) backs two document types, discriminated by `docType`:

- `risk_assessment`   — a multi-row hazard table with a×ш (probability ×
  severity) scoring + residual risk, finalised against the 5×5 risk matrix +
  legend rendered into the PDF.
- `ppe_determination` — the იდს განსაზღვრა PPE-by-job-position matrix.

Each document is created from the project-detail **`RiskAssessmentSection`**,
edited on `RiskAssessmentScreen`, autosaved (debounced), and finalised by
generating + sharing a PDF.

## Public API (index.ts)
- `RiskAssessmentScreen` — the editor; backs
  `app/projects/[id]/risk-assessment/[raId].tsx` (reads `id` + `raId` params).

## Internal files
- `riskAssessmentSchema.ts` — per-docType config: `RA_HEADER_FIELDS`,
  `RA_SIGNATORIES`, `RA_SCORE_OPTIONS` (1..5 chips).
- `RiskAssessmentScreen.tsx` — orchestrator: header form (config-driven),
  entries list, signatures, debounced autosave, share-PDF (finalise).
- `RiskHazardRowCard.tsx` — doc B hazard row (fields + 1..5 score pickers →
  computed `RiskBadge`).
- `PpeRowCard.tsx` — doc A position row (position/activities/hazards/PPE).
- `RiskSignatures.tsx` — signatory cards (name + optional position + capture).
- `styles.ts`, `index.ts`.

## Data / wiring (outside this folder)
- Types + scoring helpers: `types/riskAssessment.ts` (`riskScore`,
  `riskCategory`, matrix labels/colours, `emptyHazardEntry`/`emptyPpeEntry`).
- Service: `lib/riskAssessmentService.ts` (`riskAssessmentApi` — create / getById
  / listByProject / patch / remove). DB table `risk_assessments`.
- Hooks + invalidation: `lib/apiHooks.ts` — `qk.riskAssessment`,
  `useRiskAssessmentsByProject`, `useRiskAssessment`, and `'riskAssessment'`
  added to `invalidateRecordLists`.
- PDF: `lib/riskAssessmentPdf.ts` — `buildRiskAssessmentPdfHtml` (table +
  legend + 5×5 matrix, A4 landscape) and `buildPpeDeterminationPdfHtml`.
- Project detail: `features/project-detail/sections/RiskAssessmentSection.tsx`
  + wired in `ProjectDetail.tsx` + `useProjectDetailData.ts`.
- Migration: `supabase/migrations/20260701120000_risk_assessments.sql`
  (owner-RLS). **Must be applied to the live DB** before the feature works.

## Gotchas
- **Signatures ARE persisted** here (stored in `signatories` JSONB), like the
  breathalyzer/order signatures — the regulatory no-persist rule is
  inspection-only.
- One table, two docs: `header`/`entries`/`signatories` are JSONB, shaped per
  `docType`. The screen + PDF cast `entries` to `RiskHazardEntry[]` or
  `PpeEntry[]` based on `docType`.
- Risk-row photos (the source doc's photo/video column) are not captured yet —
  a future addition.
