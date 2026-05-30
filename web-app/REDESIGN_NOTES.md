# Hubble web app — redesign & state notes

> Context doc for future sessions. Scope: **`web-app/` only** (the Vite dashboard at
> `https://gilavi.github.io/Sarke2.0/app/`). The Expo mobile app and `web/` (sarke-sign)
> are untouched by this work and share only Supabase.

_Last updated: 2026-05-30._

## Where we are (branch + restore point)

- Working branch: **`feat/sidebar-modernize`** — **pushed to `origin`** (2026-05-30).
  Only `main` is the mobile app's line; this is a separate feature branch, so the push
  never touched `main` or the Expo app. Open a PR when ready:
  `https://github.com/gilavi/Sarke2.0/pull/new/feat/sidebar-modernize`.
- **Restore tag: `checkpoint-light-sidebar`** (also pushed to `origin`) — the
  *pre content-card-redesign* state (light sidebar, green-tinted middle, no inset card).
  To roll back the redesign: `git reset --hard checkpoint-light-sidebar`.
- Commit sequence on the branch:
  1. `checkpoint: light sidebar …` (the restore tag points here)
  2. `redesign: single-state sidebar + canvas/floating-card shell + light/dark tokens`
  3. `feat: slim theme-aware scrollbars + fix tests for signature-shape changes`
  4. `docs(web-app): add redesign + state notes` (this file)
  - Every changed file is under `web-app/` (verified: `git diff --name-only origin/main..HEAD`).

## Done (web)

- **Brand palette** restored to the original emerald (`#147A4F` light / `#47AF87` dark)
  after experiments with muted sage were rejected.
- **Sidebar — single permanent state.** Removed the icon-collapse mode entirely (no
  toggle, no pin/hover/overlay/`localStorage`). Always full + labeled, sits directly on
  the canvas. `Sidebar.tsx` renders a shared `SidebarBody` for desktop + mobile drawer.
- **App shell — canvas + floating content card.** `AppShell.tsx`: flat canvas
  (`--bg-body`) with the content area as a rounded (18px) bordered card with a soft
  shadow and an even gutter. `<main>` is transparent (inherits the card surface).
- **Light/dark theme tokens.** Exact palette wired into `index.css` `:root` (light) +
  `.dark`. Key tokens: `--bg-body` (canvas), `--bg-card`, `--border-default`,
  `--text-primary/secondary/muted`, `--brand-500/600`, `--surface`, `--track`,
  `--nav-active-bg`, `--nav-active-text`, `--card-shadow`, `--scrollbar-thumb(-hover)`.
  The shell + sidebar read these so the look flips with the theme.
- **Nav** active item = soft brand pill (`--nav-active-bg` / `--nav-active-text`); icons
  are **Phosphor** glyphs (`NavGem`, regular at rest / fill when active) via
  `@phosphor-icons/react`.
- **Footer**: Go Pro gradient card (free users) + account row + upward Mantine account
  menu (Profile / Theme / Language / Manage[pro] / Download app / Sign out). The
  "Upgrade" menu line was removed (the Pro card is the single upgrade entry point).
- **Scrollbars**: slim, rounded, transparent-track, theme-aware (`--scrollbar-thumb`),
  `scrollbar-gutter: stable`, never hidden. Global in `index.css`.
- **Act-completion flow unified.** Every act type now: last wizard step → complete →
  land on the act's **detail page** → `SuccessModal` on top → close stays on detail.
  Generic inspections previously showed a banner / popped over the list; now routed
  through the detail page like harness/equipment (`InspectionWizard` + `InspectionDetail`).

## Regulatory: inspection signatures are NEVER persisted

The migration `supabase/migrations/20260526002032_remove_persisted_inspection_signatures.sql`
dropped `inspector_signature` + `signatories` from `inspections`, `bobcat_`, `excavator_`,
`general_equipment_inspections`, and `signatories`/`signatures` from
`cargo_platform_inspections` (and dropped the `signatures` table). The web data layer was
cleaned accordingly:

- `lib/data/inspections.ts` + the 4 equipment data files: removed those columns from
  every `select`/`insert`/`update`; reads normalize to `inspector_signature: null,
  signatories: []`; cargo no longer seeds `signatures` on insert.
- Removed the signature **capture-and-save** UI from inspection detail; signature blocks
  are meant to print on the PDF for manual signing.
- **Incidents keep `inspector_signature`** (deliberately preserved by the migration) —
  do not remove it there.
- Rule: captured signatures live in component state only, for PDF rasterization, and are
  never written to DB / storage / browser storage. (Mirrors the mobile rule in
  `features/signatures/AGENTS.md`.)

## Task C — signature capture + in-page signed PDF  (NOT done — see status)

**Status (2026-05-30): NOT implemented.** A first wiring attempt was made and **reverted**
(commit `c8ddbb0` shipped a broken `InspectionPrint.tsx` and a false "done" note before the
revert — its claims were wrong, ignore them). This section is the corrected ground truth.

**Decision: in-page generate (compliant).** The captured PNG must live only in React state
and be rasterised straight into a generated PDF — no DB, no Supabase storage, **no
`localStorage`/`sessionStorage`** (all count as persistence and are forbidden).

**Confirmed facts (checked against the real files):**
- Shared template `@root/lib/inspectionPdfTemplate` → `buildInspectionPdfTemplate(args)`.
  The signatures arg is **`signaturesSession?: SignaturesSectionData | null`** (NOT
  `signatures`). Defaults to `null` → `renderSignaturesSection(null)` → '' → no section.
  (`lib/pdf/inspection/template.ts` ~L45 + ~L137.)
- `SignaturesSectionData` (`lib/pdf/inspection/renderSignaturesSection.ts`):
  `{ creatorSignature: { pngBase64, capturedAtIso, creatorName } | null, additionalRowsCount }`.
  `pngBase64` is the **bare** base64 (strip the `data:image/png;base64,` prefix off a canvas
  data-URL). `additionalRowsCount` renders that many blank hand-sign slots.
- `components/SignatureCanvas.tsx` is a **default export** with props
  `{ onSave(dataUrl), onCancel, existing? }` — a raw pad; `onSave` returns a full PNG data-URL.
- `components/InspectionSignatures.tsx` is a **signatories-LIST** component (default export,
  props `{ inspection, canEdit, onUpdate(SignatoryEntry[]) }`) — NOT a snapshot-capture card.
  Don't import it expecting `{ creatorName, onChange }`. Build a small capture step (or adapt)
  that yields a `SignaturesSectionData`.
- **i18n `signatures.*` keys do NOT exist** in `lib/i18n.ts` yet (only nav/common/home/
  project/settings/account). Add them (ka + en) or use literals.

**Why a print-route + router-state hand-off does NOT work:** the detail pages open the PDF
via `window.open('#/inspections/:id/print', '_blank')` — a **new browser tab**, so React
Router `location.state` is empty there. The in-memory snapshot can't reach the print route.

**Correct approach — hidden iframe on the detail page:**
1. On the completed-act detail page add a capture step (canvas → snapshot in state) + an
   "extra blank signer rows" count.
2. On "Generate signed PDF", fetch the same data the print route fetches (inspection,
   project, template, questions, answers, signed photo URLs), call
   `buildInspectionPdfTemplate({ …, signaturesSession: snapshot })` in memory, set the HTML
   as `srcDoc` on a **hidden `<iframe>`**, then `iframe.contentWindow.print()`. Nothing is
   written anywhere; the snapshot dies with the component. Keep the existing `window.open`
   print route as the unsigned/empty path. Consider extracting the print page's data-loading
   into a shared hook so the detail page and `InspectionPrint.tsx` don't duplicate it.

**Per act type** (each has its own detail + print page; also confirm its PDF builder calls
`renderSignaturesSection` — the equipment templates under `lib/pdf/<type>/` may not yet):
- generic: `pages/InspectionDetail.tsx` + `pages/print/InspectionPrint.tsx`
- harness: `pages/HarnessInspectionDetail.tsx` (+ its print path)
- bobcat: `features/inspections/equipment/BobcatDetail.tsx` + `pages/print/BobcatPrint.tsx`
- excavator: `…/ExcavatorDetail.tsx` + `pages/print/ExcavatorPrint.tsx`
- general equipment: `…/GeneralEquipmentDetail.tsx` + `pages/print/GeneralEquipmentPrint.tsx`
- cargo platform: `…/CargoPlatformDetail.tsx` + `pages/print/CargoPlatformPrint.tsx`

## Act-flow QA (next up)

Reported: some newer act types not showing / start flow lands in empty space; some existing
acts error mid-flow. Needs an interactive start→finish run-through of every act type (best
via `/run` or pairing) to reproduce + fix.

## Gotchas

- `npm run build`'s `tsc -b; vite build` uses `;` chaining that fails on the Windows npm
  shell locally — works on Linux/CI. Verify the bundle with `npx vite build` directly, and
  **typecheck with `npx tsc -b` separately** (vite/esbuild does NOT typecheck — a green
  `vitest` run does not mean types are sound; that mistake shipped `c8ddbb0`).
- `web-app/scripts/check-no-shadows.mjs` (part of `npm run lint`) bans Tailwind `shadow-*`
  utilities in `.ts/.tsx` (CSS `box-shadow` in `.css`/inline `style` is fine). It also has
  a Windows path bug (`new URL('..').pathname` → `C:\C:\…`) that crashes it locally.
- `navItems.ts` still carries a now-unused per-item `tint` field (harmless; nav is
  monochrome/brand now). Safe to delete later.
