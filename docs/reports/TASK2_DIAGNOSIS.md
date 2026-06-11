# Task 2 Diagnosis — project-page inspection FK violation

**Error reported by user:**
> `insert or update on table "inspections" violates foreign key constraint "questionnaires_project_id_fkey"`

The FK name (`questionnaires_…`) is a historical leftover from when the `inspections` table was named `questionnaires`. The constraint itself enforces `inspections.project_id` → `projects.id`. The name is a red herring; the actual failure is that a `project_id` is being inserted that doesn't exist in `projects.id`.

## Working path (home → create inspection)

Entry: `app/(tabs)/home.tsx` → `CustomDropdown` of templates → opens `ProjectPickerSheet` → user picks a real project → `startInspection(projectId, templateId)` in [components/home/ProjectPickerSheet.tsx:160](components/home/ProjectPickerSheet.tsx#L160).

`startInspection` dispatches on `tpl.category`. Generic templates fall through to:
```ts
newId = (await questionnairesApi.create({ projectId, templateId })).id;
```

`projectId` here is always a fresh string from a user-clicked Project row, so it's a guaranteed valid UUID.

## Broken path (project page → create inspection)

Entry: `features/project-detail/sections/InspectionsSection.tsx` "+ დამატება" link → calls `onAdd` → bound to `startNewInspection` in [features/project-detail/ProjectDetail.tsx:183](features/project-detail/ProjectDetail.tsx#L183).

`startNewInspection`:
1. If exactly one system template AND `id` truthy → fast path: `createInspectionForTemplate(id, system[0])`.
2. Otherwise show `CustomDropdown` of system templates. Picker callback (line 613):
   ```ts
   onChange={async (templateId) => {
     const tpl = templatePickerOptions.find(t => t.id === String(templateId));
     if (tpl && id) await createInspectionForTemplate(id, tpl);
   }}
   ```

`createInspectionForTemplate(projectId, tpl)` (line 197) dispatches on `tpl.category`. For generic templates (xaracho, mobile_scaffold, harness) it falls through to:
```ts
newId = (await questionnairesApi.create({ projectId, templateId: tpl.id })).id;
```

`id` here comes from `useLocalSearchParams<{ id: string }>()`. **The type parameter is only a cast — the actual runtime value can be `string | string[] | undefined`** depending on the route.

## Root cause hypothesis

The same source of the FK error documented in BUG_REPORT.md §3.x — the picker callback used to shadow `id` with the dropdown's option-value param. **That specific shadow is already fixed in HEAD** (param renamed to `templateId`, outer `id` is what's passed).

The remaining failure mode that fits the user's symptom: the `&&` guards (`if (system.length === 1 && id)`, `if (tpl && id)`) accept truthy values, but `useLocalSearchParams` can return `id` as a non-empty array `[uuid]` under unusual link/state shapes. The deep-equality fast-path in the picker would then call `createInspectionForTemplate([uuid], tpl)`, and the Supabase JS client would JSON-encode the array — Postgres rejects with a FK error against the bad text.

A second possibility: a stale build / running JS bundle that pre-dates the b67e0b0 fix — the user retested before reinstalling. We can't rule this out without seeing their device's bundle hash.

## Proposed fix (applied in same commit as this diagnosis)

1. **Service-level guard.** Add a typed `InspectionCreateError` thrown by `inspectionsApi.create` (and the per-equipment services) when `projectId` is falsy, empty, or not a UUID-shaped string. This converts a vague Postgres FK error into a clear typed failure surfaced in Georgian via the existing `friendlyError` toast.

2. **Route-side hardening.** In `ProjectDetail.tsx`, coerce `id` from `useLocalSearchParams` to a non-empty string before passing it to `createInspectionForTemplate`. If it's somehow an array or empty, refuse to start the flow and toast.

The combination makes the user-facing failure path stop at "სესია არ მუშაობს, ხელახლა გახსენით პროექტი" instead of the unintelligible Postgres FK error, regardless of which root cause was at play.

If a future repro confirms the array-shape suspicion, the deeper fix is in `useProjectDetailData`'s param parsing — but the guards land first to give users a clear path forward today.
