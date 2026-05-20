# Inspection Routes

The inspection flow is the core of the app: pick a template, walk through the questions, sign, generate a certificate.

## Generic template-driven inspections

Uses the `inspections` table. Any template with a `question`-based structure routes here.

| Path | File | Purpose |
| --- | --- | --- |
| `/templates` | `app/templates.tsx` | Pick a template to start from |
| `/template/[id]/start` | `app/template/[id]/start.tsx` | Choose target project + project_item, create the inspection draft |
| `/inspections/[id]/wizard` | `app/inspections/[id]/wizard.tsx` | Step-by-step questionnaire |
| `/inspections/[id]/done` | `app/inspections/[id]/done.tsx` | Conclusion + signing + PDF generation |
| `/inspections/[id]` | `app/inspections/[id].tsx` | Inspection result screen — full-screen WebView PDF preview |

**Templates using this flow:**
- ფასადის ხარაჩოს შემოწმების აქტი (facade scaffolding)
- დამცავი ქამრების შემოწმების აქტი (harness)
- მობილური ხარაჩო N1 (mobile scaffold)
- მობილური ხარაჩო N3 (mobile scaffold variant)

## Specialized inspection screens

Each type has its own DB table and wizard screen. Routing is determined by `template.category` via `lib/inspectionRouting.ts`.

### Bobcat / Large Loader — `category: 'bobcat'`

| Path | File | Table |
|---|---|---|
| `app/inspections/bobcat/[id].tsx` | Bobcat wizard (30/33-item checklist) | `bobcat_inspections` |

Templates: Bobcat (`33333333-…`), Large Loader (`44444444-…`). 3-result checklist (good / deficient / unusable), verdict auto-suggestion, summary photos, department field. PDF: shared schema engine — `lib/inspection/schemas/bobcat.ts` via `lib/inspection/renderMobile.ts`.

### Excavator — `category: 'excavator'`

| Path | File | Table |
|---|---|---|
| `app/inspections/excavator/[id].tsx` | Excavator wizard (6 steps) | `excavator_inspections` |

Template: `55555555-…`. 6-step wizard: info → engine → undercarriage → cabin/safety → maintenance/verdict → signature. Item lists pre-filled per ISO 9457 section grouping. PDF: `lib/excavatorPdf.ts`.

### General equipment — `category: 'general_equipment'`

| Path | File | Table |
|---|---|---|
| `app/inspections/general-equipment/[id].tsx` | General equipment wizard | `general_equipment_inspections` |

Template: `66666666-…`. User builds their own item list row-by-row (name, model, serial, 3-state condition with accordion for note + photos). 4-step wizard: info → equipment → summary → signature. PDF: `lib/generalEquipmentPdf.ts`.

### Cargo platform — `category: 'cargo_platform'`

| Path | File | Table |
|---|---|---|
| `app/inspections/cargo-platform/[id].tsx` | Cargo platform wizard (6 steps) | `cargo_platform_inspections` |

Template: `77777777-…`. 6-step wizard: info → platform ID → cargo table → 9-item checklist → verdict → dual signatures. 3-result checklist (good / fix / N/A). Dynamic cargo table with auto-summed weight. PDF: `lib/cargoPlatformPdf.ts`.

## Wizard mechanics (generic inspections)

- Questions loaded from `questions` table for the inspection's template.
- Answers persisted on every "next" tap (one row per `(inspection_id, question_id)`).
- Photos uploaded immediately via `FileSystem.uploadAsync`; rows inserted into `answer_photos`.
- Resumable — re-entering an inspection draft restores the last answered question.

## Done step (generic)

- `is_safe_for_use` (boolean) and `conclusion_text` required to mark complete.
- Required signers come from `templates.required_signer_roles` joined with `project_signers`.
- On "complete", status flips to `completed`, `completed_at` is stamped, a `Certificate` row is generated.
- Completed inspections are **frozen** by DB triggers (`0008`, `0010`) — no edits or status reverts.

See [Signing flow](../signing-flow.md) and [PDF generation](../pdf-generation.md).

## Web dashboard inspection pages

The web dashboard has full CRUD for all inspection types:

| Route | Component | Notes |
|---|---|---|
| `/inspections` | `Inspections.tsx` | Unified list across all types |
| `/inspections/new` | `NewInspection.tsx` | Template picker for generic inspections |
| `/inspections/:id` | `InspectionDetail.tsx` | Generic inspection view/edit |
| `/bobcat/new` | `NewBobcatInspection.tsx` | — |
| `/bobcat/:id` | `BobcatInspectionDetail.tsx` | — |
| `/excavator/new` | `NewExcavatorInspection.tsx` | — |
| `/excavator/:id` | `ExcavatorInspectionDetail.tsx` | — |
| `/general-equipment/new` | `NewGeneralEquipmentInspection.tsx` | — |
| `/general-equipment/:id` | `GeneralEquipmentInspectionDetail.tsx` | — |
| `/cargo-platform/new` | `NewCargoPlatformInspection.tsx` | — |
| `/cargo-platform/:id` | `CargoPlatformInspectionDetail.tsx` | — |
| `/cargo-platform/:id/print` | `print/CargoPlatformPrint.tsx` | A4 print view |
