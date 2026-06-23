# inspections/lifting-accessories

## What this module does
The 5-step slings / chains / lifting-accessories inspection screen. The
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
1. **IDENTIFICATION_STEP** — type selector (sheet) + იდენტიფიკაცია
   (serial number, manufacturer). Renders
   `components/inspection-parts/SlingsIdentificationStep.tsx`.
2. **CHARACTERISTICS_STEP** — მახასიათებლები (year, WLL, unit count) +
   მარკირება, the latter a full-width `CustomDropdown` (not the old
   inline chip group). Renders
   `components/inspection-parts/SlingsCharacteristicsStep.tsx`. Split out
   of step 1 (2026-06-23) so neither identification screen is overcrowded.
3. **CHECKLIST_STEP** — 10-item A/B checklist via `ChecklistSection`.
4. **REMOVED_STEP** — `DynamicTable` for removed equipment.
5. **CONCLUSION_STEP** — `ConclusionStep`: verdict + comment + photo
   uploader (`PhotoSection`). The summary photos moved here from the
   removed-equipment step so every flow's conclusion carries an uploader.

## Label policy — full words (reversed 2026-06-23)
Per user direction (2026-06-23) the identification field labels and the
screen header use **full Georgian words**, reversing the earlier
"DO NOT EXPAND" override. Labels live in `locales/{ka,en}.json` under
`slingsId.*`:
- Header: `სტროპები და ჩამჭერები` (was `სლინგ. / ჩამჭ. შემოწ.`)
- `ტიპი / სახეობა`, `სერიული ნომერი / ID`, `წარმოების წელი`,
  `დასაშვები სამუშაო დატვირთვა, WLL (კგ)`, `ერთეულების რაოდენობა`

Still abbreviated (domain shorthand the user did **not** flag — leave as
is unless asked): the equipment-type catalog (`LA_EQUIPMENT_TYPES`) and
the checklist item labels (`LA_CHECKLIST_ITEMS`). The PDF template
(`lib/inspection/schemas/liftingAccessories.ts`) keeps its own
abbreviated table labels — a formatted document, unchanged.

The `მომდევნო შემოწმება` (next inspection) date field was removed from
the screen (2026-06-23) per user direction.

## Canonical helpers used
- `lib/inspection/useInspectionFlow` — load + step + autosave + complete + PDF.
- `lib/inspection/schemas/liftingAccessories` — schema descriptor.
- `lib/liftingAccessoriesService` — CRUD service (built via `makeInspectionService`).
- `components/inspection-parts/*` — ChecklistSection, DynamicTable,
  VerdictSelector, PhotoSection, SignatureSheet, SlingTypeSheet.
- `components/DateTimeField` — date picker.
- `components/wizard/WizardStepTransition` — step animation.
- `components/FlowHeader` — top bar (progress + PDF trailing element).
