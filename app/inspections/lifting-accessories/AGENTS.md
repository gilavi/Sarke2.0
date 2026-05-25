# inspections/lifting-accessories

## What this module does
The 4-step slings / chains / lifting-accessories inspection screen. The
template (`bbbbbbbb-…`, `category: 'lifting_accessories_inspection'`) is
seeded by migration `0049_lifting_accessories_inspection.sql` and stored
in the `lifting_accessories_inspections` table. PDF generation goes
through the shared schema-driven engine via
`lib/inspection/schemas/liftingAccessories.ts`.

## Public API
- `app/inspections/lifting-accessories/[id].tsx` — the screen. Routed
  to from the post-create flow (`lib/inspectionRouting.ts`) and the
  inspections list rows whose `category` matches.

## Step structure
1. **IDENTIFICATION_STEP** — equipment identity. Sections: type
   selector (sheet), იდენტიფიკაცია, მახასიათებლები, მარკირება,
   მომდევნო შემოწმება. All inputs are stacked one-per-row. Type
   selector opens `components/inspection-parts/SlingTypeSheet.tsx`.
2. **CHECKLIST_STEP** — 10-item A/B checklist via
   `ChecklistSection`.
3. **REMOVED_STEP** — `DynamicTable` for removed equipment + summary
   `PhotoSection`.
4. **CONCLUSION_STEP** — `VerdictSelector` with auto-suggest.

## Abbreviation policy — DO NOT EXPAND
Per a user override, all Georgian abbreviations on this screen are
intentional and must be preserved verbatim. This overrides the
repo-wide rule from `README.md` ("Don't shorten Georgian words"). The
abbreviations come from the inspection form they replace — expanding
them breaks visual parity with the paper version. Keep them as-is:

- Screen header: `სლინგ. / ჩამჭ. შემოწ.`
- Field labels: `ტ-პი / სახ.`, `სერ. NN / ID`, `წ. წარმ.`,
  `ერთ. რ-ბა`
- **Exception:** the marking section was renamed `მარ-ბა` → `მარკირება`
  (2026-05-26, with explicit user sign-off) to match the PDF template
  label in `lib/inspection/schemas/liftingAccessories.ts`. The rest of
  the abbreviations above stay locked.
- Equipment type catalog (`types/liftingAccessories.ts` →
  `LA_EQUIPMENT_TYPES`): `ტექ. სლინგი`, `მრგვ. სლინგი`,
  `ბეწვ. სლინგი`, `ჯაჭვ. სლინგი`, `ჩამჭიდი`, `კაუჭი`, `სხვა`
- Checklist items in `LA_CHECKLIST_ITEMS` (e.g. `ბოლო ადაპტ./მარყ.`,
  `კოროზ./ქ-მ./სით.`) — same rule applies.

If a future task needs these names spelled out, do it on a fresh PR
with explicit user sign-off, not as a drive-by "cleanup".

## Canonical helpers used
- `lib/inspection/useInspectionFlow` — load + step + autosave + complete + PDF.
- `lib/inspection/schemas/liftingAccessories` — schema descriptor.
- `lib/liftingAccessoriesService` — CRUD service (built via `makeInspectionService`).
- `components/inspection-parts/*` — ChecklistSection, DynamicTable,
  VerdictSelector, PhotoSection, SignatureSheet, SlingTypeSheet.
- `components/DateTimeField` — date picker.
- `components/wizard/WizardStepTransition` — step animation.
- `components/FlowHeader` — top bar (progress + PDF trailing element).
