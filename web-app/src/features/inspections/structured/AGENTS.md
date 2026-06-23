# `features/inspections/structured` — unified inspection wizard (web-app)

## What this module does
Renders **every** structured inspection act through ONE harness-styled wizard
(specs → checklist sections / custom → verdict → sign → PDF), driven by a per-act
`WizardDescriptor`. Generalizes the old per-type `inspections/equipment` detail
pages so a new act is "just data" (a descriptor + a PDF schema + routes).

## Public API
- `StructuredActPage` (default export) — route entry; takes `category`, looks the act
  up in the registry, renders the wizard. Wired in `app/router.tsx` for both
  `/<type>/new` and `/<type>/:id`.
- `StructuredInspectionWizard<T,P,C>` — the engine component (descriptor + detailRoute +
  printRoute).
- `getStructuredAct(category)` / `STRUCTURED_ACTS` / `STRUCTURED_ACT_LIST`
  (`acts/index.ts`) — registry tying a descriptor to its PDF schema + routes.
- `WizardDescriptor<T,P,C>` + step types (`types.ts`); `AnyWizardDescriptor` is the
  variance escape-hatch for the heterogeneous registry.

## Internal files
- `types.ts` — the interactive descriptor DSL (steps: `specs` | `checklist` | `verdict`
  | `custom`) + data-layer hooks (get/create/update/remove/keys) per act.
- `useStructuredInspection.ts` — lifecycle hook: create-vs-edit mode, queries,
  patch/delete mutations, step/direction state, in-memory signature session.
- `StructuredInspectionWizard.tsx` — orchestrator (WizardFrame + step bodies + SuccessModal).
- `steps/` — `SpecStep`, `ChecklistStep`, `VerdictStep` presentationals.
- `acts/` — per-act descriptors (`bobcat.ts`, `safetyNet.tsx`) + the registry
  (`index.ts`) + act-specific custom steps (`SafetyNetLoadTest.tsx`).
- `StructuredActPage.tsx` — the route entry component.

## Create pattern (project standard)
On `/<type>/new` the wizard shows ONLY the specs step; "next" creates the row (parent
`inspections` row + type row via the data layer's RPC path) and navigates to the
detail route, where the remaining steps unlock. There is **no `/<type>/draft`
dead-end** — the legacy equipment pages still use `usePendingCreate`, this engine does not.

## Gotchas
- **Signatures are never persisted** (regulatory). `SignatureCapture` renders only on
  the completed verdict step; its payload is handed to the print route via router state
  (`signaturesSession`) and rasterized into the PDF — never written anywhere.
- The descriptor's checklist catalogs + verdict vocab should come from
  `@/lib/types/<type>.ts`, the same source the PDF schema uses — keep screen + PDF aligned.
- New act's data layer MUST set `parentInspection: { type }` (see `lib/db/repository.ts`)
  so the parent `public.inspections` row is created via RPC and the row round-trips with mobile.
- File-size targets: keep `StructuredInspectionWizard.tsx` an orchestrator; push step UI
  into `steps/` and act-specific UI into `acts/`.

## Canonical helpers consumed
- Wizard shell: `@/components/wizard` (`WizardFrame`, `SegmentedControl`).
- Checklist row: `@/features/inspections/equipment/components/ChecklistItemRow` + `ResultPills`.
- `@/components/web/SuccessModal`, `@/components/SignatureCapture`, `@/components/FieldInput`,
  `@/components/ui/project-picker`, `@/components/PhotoUploadZone`.
- Lifecycle/query: `@/lib/query/useEntityQuery` + `useEntityMutation`.
- PDF: `@/lib/inspection` (`getInspectionSchema`, `buildInspectionPdf`).
