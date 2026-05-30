# Hubble web app — redesign & state notes

> Context doc for future sessions. Scope: **`web-app/` only** (the Vite dashboard at
> `https://gilavi.github.io/Sarke2.0/app/`). The Expo mobile app and `web/` (sarke-sign)
> are untouched by this work and share only Supabase.

_Last updated: 2026-05-30._

## Where we are (branch + restore point)

- Working branch: **`feat/sidebar-modernize`** (local; not yet pushed at time of writing).
- **Restore tag: `checkpoint-light-sidebar`** — the *pre content-card-redesign* state
  (light sidebar, green-tinted middle, no inset card). To roll back the redesign:
  `git reset --hard checkpoint-light-sidebar`.
- Intended commit sequence on the branch:
  1. `checkpoint: light sidebar …` (the restore tag points here)
  2. `redesign: single-state sidebar + canvas/floating-card shell + light/dark tokens`
  3. `feat: slim theme-aware scrollbars + fix tests for signature-shape changes`
  - ⚠️ At last check the shell tooling was returning garbled git output, so verify the
    log in a trusted terminal before pushing. All changed files are under `web-app/`.

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

## NOT done yet (next up)

- **Task C — signature capture + in-page signed PDF.** Decision: **in-page generate**
  (compliant). Plan: on the completed-act detail page add "Add my signature" (canvas →
  in-memory) + "Add empty signer cards" (count); generate the PDF by rendering the print
  template into a **hidden iframe** with the in-memory signature + empty-card count
  injected, then print — so it never persists. The web reuses the shared mobile template
  `@root/lib/inspectionPdfTemplate` (`buildInspectionPdfTemplate`), whose `PdfTemplateArgs`
  expects the mobile `{ creatorSignature, additionalRowsCount }` snapshot (NOT the old
  `signatures` array, which was removed from the web print call).
- **Act-flow QA.** Reported: some newer act types not showing / start flow lands in empty
  space; some existing acts error mid-flow. Needs an interactive start→finish run-through
  of every act type (best via `/run` or pairing) to reproduce + fix.

## Gotchas

- `npm run build`'s `tsc -b; vite build` uses `;` chaining that fails on the Windows npm
  shell locally — works on Linux/CI. Verify the bundle with `npx vite build` directly.
- `web-app/scripts/check-no-shadows.mjs` (part of `npm run lint`) bans Tailwind `shadow-*`
  utilities in `.ts/.tsx` (CSS `box-shadow` in `.css`/inline `style` is fine). It also has
  a Windows path bug (`new URL('..').pathname` → `C:\C:\…`) that crashes it locally.
- `navItems.ts` still carries a now-unused per-item `tint` field (harmless; nav is
  monochrome/brand now). Safe to delete later.
