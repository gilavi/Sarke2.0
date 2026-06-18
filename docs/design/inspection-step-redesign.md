# Inspection QuestionStep — redesign brief

Visual + interaction target for the inspection wizard's yes/no **question step** (the
"does the scaffold have a valid, Georgian-translated certificate?" screen).

**Open the mockup:** [`inspection-step-redesign.html`](./inspection-step-redesign.html) —
a standalone, interactive HTML reference. It is the source of truth for layout, spacing,
colors, and the tap interactions. It is **not** code to paste — rebuild it in React Native
with the existing components below.

---

## Paste-ready prompt (for the implementing agent)

> Redesign the inspection wizard **QuestionStep** to match
> `docs/design/inspection-step-redesign.html`. Read
> `features/inspection-wizard/AGENTS.md` and `components/wizard/AGENTS.md` first, and
> `docs/primitives.md` before adding any helper. Reuse existing primitives/components — do
> not reinvent wrappers. Keep all Georgian UI strings exactly. Apply the changes in the
> "What changes" section of `docs/design/inspection-step-redesign.md`. Run `npm run lint`
> and update docs per `CLAUDE.md`.

---

## Target files (where each piece lives)

| Design piece | File(s) |
|---|---|
| Header: circular back + circular X, no logo, project name as subtitle | `features/inspection-wizard/WizardHeader.tsx` |
| Stepper → thin progress bar + `7 / 18` counter | `components/wizard/StepBar.tsx`, `components/wizard/StepSectionLabel.tsx` |
| Question + passport illustration | `components/wizard/QuestionCard.tsx`, `features/inspection-wizard/QuestionStep.tsx` |
| Yes/No selector (green/red → monochrome outline) | `components/wizard/AnswerButtons.tsx` and/or `features/inspection-wizard/VerdictSelector.tsx` |
| Photo "add" bar + thumbnails | `components/wizard/PhotoThumbs.tsx`, `features/inspection-wizard/PhotoThumb.tsx` |
| შენიშვნა note (bar → textarea) | `features/inspection-wizard/DebouncedNotes.tsx` |
| Next button, disabled until answered | `components/wizard/WizardNav.tsx` |

(Confirm the exact owners by reading the AGENTS.md files; the green/red buttons are the
verdict/answer selector.)

---

## What changes

### Header
- Replace the orange "‹ უკან" text with a **circular ghost icon button** (chevron-left) on the left.
- **Remove the small logo.** Show the section title (`ფასადის ხარაჩო`) centered, with the
  project name (`Kheladze testing`) as a smaller muted subtitle beneath it.
- Right side: a matching **circular ghost icon button** with an X (close).

### Progress (replaces the named stepper)
- A **thin progress bar** (brand orange fill on a light track) plus a `7 / 18` step counter.
- Scales to any number of steps (the flow has ~10–20), so no step is named.

### Answer selection (the main fix)
- Drop the solid **green / red** buttons — they read like a quiz.
- Two **monochrome outline pills** (`კი` / `არა`), side by side, each with a check / x icon.
- Selected state: **black border + black icon + light grey fill**. Unselected: light grey
  border, muted grey text/icon. No semantic color.

### Photo + note (attachments)
- Both start as **identical dashed "add" bars**, full-width, stacked (`ფოტო`, then `შენიშვნა`).
  Dashed outline = optional input; visually quiet but full-width so they're not missed.
- **ფოტო bar** stays put; adding photos shows a wrapping row of **thumbnails** below it
  (multiple allowed, each with an × to remove).
- **შენიშვნა bar** *morphs* on tap: it is replaced by a focused **textarea** that expands
  while focused. If left empty on blur it collapses back to the bar; if it has text it stays.

### Next button
- Full-width brand-orange CTA (`შემდეგი`), **disabled (grey) until an answer is selected**.

### Illustration
- A **passport** data page: emblem + title lines, portrait photo box, data lines, and a
  dashed **MRZ strip** at the bottom (the machine-readable rows). A black **A→ა** stamp
  signals "translated into Georgian"; an orange ✓ badge signals *ვადიანი* (valid).

---

## Constraints
- **Georgian strings stay in Georgian** — do not translate UI copy to English.
- **Reuse primitives** — read `docs/primitives.md`; don't add sibling wrappers (photo,
  note/keyboard, and image helpers already have canonical owners).
- **Signature rule is unrelated** here — this step has no captured signatures.
- Run `npm run lint` and update docs (`README.md` / `docs/`) per `CLAUDE.md`.

## Color tokens used in the mockup
- Brand orange `#EF6B3E` (progress fill, Next, illustration accents)
- Ink/near-black `#1A1D21` (selected outline, icons, MRZ stamp)
- Light track / fills `#ECEEF1`, `#F2F3F5`, `#F6F7F9`
- Dashed border `#CBD0D6`; muted text `#8A9199` / `#6B7280`
- Illustration card tint `#FBEAE3`
