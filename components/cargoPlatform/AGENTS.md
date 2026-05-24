# cargoPlatform

## What this module does
Cargo-platform inspection UI. Pairs with `lib/cargoPlatformService.ts`
and the route under `app/inspections/cargo-platform/[id].tsx`.

## Public API
- `CargoPlatformChecklistItem` — single check row.
- `CargoRow` — a row in the cargo-platform table layout.

## Internal files
- `CargoPlatformChecklistItem.tsx`, `CargoRow.tsx`.

## Gotchas / non-obvious things
- Cargo-platform inspections have their own table set distinct from
  the generic `inspections` / `answers` tables; see
  `lib/cargoPlatformService.ts` and `cargo_platform_pdf_template.ts`.

## Canonical helpers used
- `lib/theme`, `lib/haptics`.
- `components/primitives/A11yText`.
