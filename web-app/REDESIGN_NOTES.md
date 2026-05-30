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

## Task C — signature capture + in-page signed PDF

**Decision: in-page generate (compliant).** Nothing is persisted; the captured PNG lives
in React state on the detail page, travels to the print route via **`navigate(..., { state })`**
(in-memory, dies on unmount), and is injected into the existing print iframe. No DB /
storage / localStorage writes anywhere.

The plumbing already existed and just needed wiring:
- `components/SignatureCanvas.tsx` — dependency-free `<canvas>`, `toDataURL()` + `clear()`.
- `components/InspectionSignatures.tsx` — capture card (draw → Save → snapshot, plus an
  "extra blank signer rows" 0–10 input). Emits
  `onChange({ creatorSignature: { pngBase64, capturedAtIso, creatorName } | null, additionalRowsCount })`.
- Shared template `@root/lib/inspectionPdfTemplate` → `PdfTemplateArgs.signatures?: SignaturesSectionData`
  (already declared); `renderSignaturesSection` draws the creator block + N empty slots,
  or nothing when empty.
- i18n `signatures.*` keys exist (ka + en).

**DONE — generic inspection flow** (the `inspections` table). Verified: `tsc -b` clean +
61 print/detail tests green.
- `pages/InspectionDetail.tsx` — for completed acts, mounts `<InspectionSignatures>` and
  holds the snapshot in `signatures` state; the "Generate PDF" button now does
  `navigate(routes.inspections.print(id), { state: { signatures } })`. (`creatorName` reads
  `inspector_name` off the row via a local cast — the shared mobile `Inspection` type in
  `@root/types/models` doesn't declare it and is out of web scope, so don't edit it.)
- `pages/print/InspectionPrint.tsx` — reads `useLocation().state?.signatures` and passes it
  to `buildInspectionPdfTemplate({ …, signatures })`. Backward-compatible: direct nav /
  refresh → `undefined` → no signature section (prior behavior).

**TODO — replicate the same 2-line pattern to the other act types.** Each has its own
detail page + print page; the only open question per type is whether its PDF builder calls
`renderSignaturesSection` (the equipment templates may not yet — check `lib/pdf/<type>/`):
- bobcat: `features/inspections/equipment/BobcatDetail.tsx` + `pages/print/BobcatPrint.tsx`
- excavator: `…/ExcavatorDetail.tsx` + `pages/print/ExcavatorPrint.tsx`
- general equipment: `…/GeneralEquipmentDetail.tsx` + `pages/print/GeneralEquipmentPrint.tsx`
- cargo platform: `…/CargoPlatformDetail.tsx` + `pages/print/CargoPlatformPrint.tsx`
- harness: `pages/HarnessInspectionDetail.tsx` (+ its print path)

## Act-flow QA (next up)

Reported: some newer act types not showing / start flow lands in empty space; some existing
acts error mid-flow. Needs an interactive start→finish run-through of every act type (best
via `/run` or pairing) to reproduce + fix.

## Gotchas

- `npm run build`'s `tsc -b; vite build` uses `;` chaining that fails on the Windows npm
  shell locally — works on Linux/CI. Verify the bundle with `npx vite build` directly.
- `web-app/scripts/check-no-shadows.mjs` (part of `npm run lint`) bans Tailwind `shadow-*`
  utilities in `.ts/.tsx` (CSS `box-shadow` in `.css`/inline `style` is fine). It also has
  a Windows path bug (`new URL('..').pathname` → `C:\C:\…`) that crashes it locally.
- `navItems.ts` still carries a now-unused per-item `tint` field (harmless; nav is
  monochrome/brand now). Safe to delete later.
