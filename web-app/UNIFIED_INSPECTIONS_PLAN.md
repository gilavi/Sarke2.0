# Unified Inspections — Implementation Plan

**Scope:** `web-app/` only. Bring every inspection act under ONE shared flow
matching the harness act exactly (look, step rhythm, conclusion, signature
capture, success modal, PDF/print) while keeping each act's full structure
(machine specs, category-grouped checklists, 3-state results, approve/limited/
reject verdict, maintenance rows).

**Status: ✅ DONE.** 10 structured acts + 2 generic acts = 12 picker entries,
matching the Expo app.

---

## Architecture (final)

The unified engine is descriptor-driven, mirroring the Expo app's split between an
interactive flow and a PDF schema:

- **`features/inspections/structured/types.ts`** — `WizardDescriptor<T,P,C>`: the
  interactive language (specs → checklist → verdict → custom steps).
- **`lib/inspection/schema.ts`** + **`lib/inspection/registry.ts`** — the PDF
  schema language + registry, keyed by `schema.category`.
- **`features/inspections/structured/acts/`** — one descriptor per act + the
  registry (`index.ts`) tying descriptor ↔ schema ↔ routes. The registry is keyed
  by a unique **act key** (= route segment), NOT by category, because two acts can
  share a category (bobcat + large-loader, see below). The PDF schema is still
  looked up by `descriptor.category`.
- **`components/InspectionWizard.tsx`** — the generic questionnaire wizard
  (harness + façade-scaffold), unchanged in spirit.
- **`features/inspections/structured/StructuredInspectionResult.tsx`** — the
  read-only result screen that hosts `SignatureCapture` (signature lives here, on
  the result screen — never in the wizard — matching the harness flow).

## Acts (all migrated)

| Act key | Menu label | Category | Table |
|---------|-----------|----------|-------|
| *(generic)* | ფასადის ხარაჩო | `xaracho` | `inspections` |
| *(generic)* | დამცავი ქამრები | `harness` | `inspections` |
| `bobcat` | ციცხვიანი დამტვირთველი | `bobcat` | `bobcat_inspections` |
| `large_loader` | დიდი ციცხვიანი დამტვირთველი | `bobcat` | `bobcat_inspections` |
| `safety_net_inspection` | უსაფრთხოების ბადე | `safety_net_inspection` | `safety_net_inspections` |
| `excavator` | ექსკავატორი | `excavator` | `excavator_inspections` |
| `general_equipment` | ტექნიკური აღჭურვილობა | `general_equipment` | `general_equipment_inspections` |
| `cargo_platform` | ტვირთის მიმღები პლატფორმა | `cargo_platform` | `cargo_platform_inspections` |
| `mobile_ladder_inspection` | მობილური კიბე | `mobile_ladder_inspection` | `mobile_ladder_inspections` |
| `forklift_inspection` | ჩანგლიანი დამტვირთველი | `forklift_inspection` | `forklift_inspections` |
| `lifting_accessories_inspection` | ტვირთის გადასატანი თასმები / ჩამჭიდები | `lifting_accessories_inspection` | `lifting_accessories_inspections` |
| `fall_protection_inspection` | დამჭერი მოწყობილობა | `fall_protection_inspection` | `fall_protection_inspections` |

### Large-loader variant

The large-loader ("დიდი ციცხვიანი დამტვირთველი") is a **separate act** that shares
the `bobcat_inspections` table, the `bobcat` category, and the bobcat data layer,
but uses a different template UUID (`LARGE_LOADER_TEMPLATE_ID`) and the 33-item
`LARGE_LOADER_ITEMS` catalog. It has its own route key (`large_loader`) and
`/large-loader` routes, and reuses the bobcat PDF schema (which branches its
catalog on `templateId`). It is flagged `excludeFromList` so it is not queried
separately on the Inspections list — instead the bobcat list query splits its rows
between the bobcat and large-loader acts by `templateId`.

## Pickers (data-driven)

Both the **Inspections page** picker and the **Home page** "new inspection"
dropdown render the two generic acts followed by `STRUCTURED_ACT_LIST.map(...)`
from the registry, so adding an act lights it up in both menus at once and the two
menus can never drift apart.

## Round-trip with mobile

Every structured act creates its parent `public.inspections` row via the
`create_equipment_inspection` RPC before writing the type-specific row, so the
unified mobile list (which dispatches on `inspections.type`) shows web-created acts
and vice-versa.

## Regulatory: signatures never persisted

Captured inspection signatures live in result-screen component state only, for
rasterization into the generated PDF, and die on unmount. They are never written to
Supabase, storage, or any local store.

## Known follow-ups

- None blocking.
