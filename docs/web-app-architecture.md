# web-app Architecture & Conventions

The Sarke dashboard (`web-app/`) — a Vite + React 19 + TypeScript SPA on GitHub
Pages, sharing only the Supabase backend with the Expo app (no shared code; see
[CLAUDE.md](../CLAUDE.md)). This is the web-app equivalent of
[`primitives.md`](primitives.md): the canonical owners and the rules that keep
the same thing from being reinvented three ways.

## Stack

- **Build/host:** Vite 6, deployed to `gh-pages` under `/app/` (`base: '/Sarke2.0/app/'`). HashRouter (GH Pages only serves `404.html` at the site root).
- **Data:** Supabase (`@supabase/supabase-js`) + TanStack Query v5.
- **UI:** Mantine v9 components + Tailwind utilities, framer-motion, recharts, three/leaflet (route-lazy).
- **Forms:** react-hook-form + zod.
- **Ephemeral global UI state:** zustand.

## Layered architecture

```
ROUTE LEAF (pages/, features/*/pages)  — render + wire only; no fetch logic, no raw keys
        │ uses
   ┌────┴───────────────────────────────────────────────┐
UI KERNEL                 DOMAIN / FEATURE              FEATURE: inspections
components/ui/*           features/<domain>/            features/inspections/
+ async/AsyncBoundary       api · hooks · schema          one engine (registry +
+ form/EntityForm           components · pages            useEquipmentDetail +
+ print/PrintLayout                                       shared widgets) for the
        │                        │                        5 equipment types
        └───────────┬────────────┘
              DATA KERNEL (lib/db, lib/query)
              supabase client · makeRepository · storage primitive
              useEntityQuery · useEntityMutation
                           │
              app/ (router, routes, queryKeys) · types/database.ts (generated) · store/
```

**The rule the kernel enforces:** a page never imports `supabase`, never writes
a raw query key, never hand-rolls loading/error, never hand-wires a mutation's
invalidation. All four go through the kernel. ESLint encodes the first
(`no-restricted-imports`).

## Kernel primitives (canonical owners)

| Concern | Owner | Use instead of |
|---|---|---|
| CRUD against a table | `lib/db/repository.ts` → `makeRepository(cfg)` | hand-written list/get/create/update/delete per module |
| snake↔camel patch mapping | `mapDefined(patch, map)` | `if (patch.x !== undefined) row.col = patch.x` ladders |
| Storage (buckets, signed URLs, upload) | `lib/db/storage.ts` → `STORAGE_BUCKETS`, `signedUrl`, `upload`, `removeObjects` | `supabase.storage.from('literal')…`, the 4× `signedPdfUrl` copies |
| Reads | `lib/query/useEntityQuery` | `useQuery` with raw `['key']` |
| Writes + invalidation + toast | `lib/query/useEntityMutation` | inline `useMutation` with hand-wired `onSuccess` |
| Loading / error / empty | `components/async/AsyncBoundary` | copy-pasted `error instanceof Error ? …` blocks |
| Forms + validation | `components/form/EntityForm` (rhf + zod) | raw `useState` fields + hand-rolled `canAdvance` |
| Print views | `components/print/PrintLayout` | per-page toolbar + `A4_PRINT_STYLES` copies |
| Query keys | `app/queryKeys.ts` factories | raw `['inspection', id]` literals |
| DB types | `src/types/database.ts` (`npm run gen:types`) | hand-written `interface`s per data module |

## Conventions

- **Server state → TanStack Query only.** Never mirror query data into `useState` (the old `InspectionDetail` did; the engine doesn't).
- **Forms → react-hook-form + zod.** One schema per entity, mirroring the DB types.
- **Ephemeral global UI → zustand** (command palette, the 3D safety guide). Cross-cutting session/theme → React Context (`lib/auth`, `lib/theme`).
- **Query keys → factories** from `app/queryKeys.ts`. No raw string keys.
- **Data access → `lib/data` / `lib/db` only.** No `supabase` import in `pages/`, `features/`, `components/`.
- **No `@root/*` imports.** web shares nothing with the mobile app but Supabase. Port what you need into `web-app/src`.
- **Legal content is byte-preserved.** The Georgian checklist catalogs and PDF wording are config/data; move them, never reword them.

## Folder structure (target)

```
src/
  app/        router, routes, queryKeys, providers
  shared/     ui/ (design system) + kernel: db/, query/, async/, form/, print/
  types/      database.ts (generated) + derived domain models
  features/   <domain>/{ api, hooks, schema, components, pages }   (inspections/ first)
  pages/      only cross-feature / static screens
  store/      zustand (cmdk, 3D safety)
```
Today the kernel lives at `lib/db`, `lib/query`, `components/{async,form,print}` and
features under `features/inspections/`; the move of `lib/data` + page leaves into
`features/<domain>/` is the remaining structural step.

## Testing

- Vitest + Testing Library (jsdom). `src/test-utils.tsx` provides a `render()`
  wrapped in `MantineProvider`; `src/test-setup.ts` mocks `matchMedia` +
  `ResizeObserver`. Component tests import `render` from `@/test-utils`.
- Playwright smoke (`npm run smoke`) and e2e live outside Vitest (`e2e-smoke/`).
- Coverage baseline is ~1% — **a real test strategy (kernel + critical flows)
  is the biggest testing gap.** Raise `vitest.config.ts` thresholds as it grows.

## Commands

```
npm run dev | build | preview
npm run typecheck            # tsc --noEmit  (CI gate)
npm test | test:watch | test:coverage
npm run lint | lint:fix | format | format:check
npm run gen:types            # regenerate src/types/database.ts from the schema
npm run smoke                # Playwright smoke against the built app
```

## Best-practices status

**Done:** kernel primitives; equipment data layer on `makeRepository`; storage
primitive (killed 4× signed-URL + stringly-typed buckets); query-key factories
adopted (~96%); ESLint (flat) + Prettier; zod env validation; generated DB
types + `gen:types`; CI typecheck/test gate (PR + pre-deploy); Vitest runnable.

**In progress / scaffolded:** inspection engine (core + bobcat done; 3 types +
`New*` + route cutover pending); `createClient<Database>` (types generated, flip
deferred — see below).

**Deferred until the in-flight query-key migration on the page layer is committed**
(doing them now would clobber concurrent edits):
- Type the Supabase client `createClient<Database>` + replace the ~41
  hand-written interfaces with `Database`-derived types + remove `@root` type
  imports in the print pages (one ~24-error coherent pass).
- Adopt `AsyncBoundary` / `useEntityMutation` / `EntityForm` across the pages
  (kills 86 hand-rolled state blocks, 75 inline mutations, 266 `useState`).
- Cut the inspection routes over to the engine and delete the duplicated
  detail/new/print pages (~2,366 lines).
- Decompose the remaining god components (`InspectionDetail`, 942 lines).
- Consolidate the 3 print/PDF stacks; wire the (currently dead) PDF gate at one
  choke-point.
- Pick one styling system (Mantine vs Tailwind) and document it.
- `eslint . --fix` + `prettier --write` across the tree; flip the CI lint step
  to required.
