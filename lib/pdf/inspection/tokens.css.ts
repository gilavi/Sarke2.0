// Canonical colour/scale tokens for the inspection PDF template.
//
// Extracted from template.css.ts so the rebrand has a single greppable owner
// and the stylesheet file stays under its accepted size. These are COPIED from
// the app theme (lib/theme.ts), never imported — the PDF builder is pure and
// platform-agnostic (runs on mobile expo-print AND the web dashboard print
// page), so it cannot pull in the React Native theme module. Keep the two in
// sync by hand on any rebrand.
//
// Brand / structure is monochrome ink + a single orange accent (#FF6D2E).
// Semantic colours (green / red / amber) are reserved for the verdict and
// pass/fail answers ONLY — see the `--green*` note below.

/** Returns the `:root { … }` custom-property block (no surrounding CSS). */
export function getInspectionPdfTokens(): string {
  return `
    :root {
      /* ── Brand / structure: monochrome ink + warm neutrals ── */
      --ink:         #1A1A1A;   /* primary text, avatar, section numerals */
      --ink-soft:    #4E4A44;   /* secondary text */
      --gray:        #9C988F;   /* labels / captions */
      --line:        #D6D6D1;   /* hairlines / borders */
      --line-strong: #C2BEB6;   /* header rule, strong dividers */
      --bg-soft:     #F2F1EC;   /* warm surface fills */
      --bg-subtle:   #E9E7E0;   /* table head / zebra rows */

      /* ── Single brand accent: ORANGE ── */
      --accent:      #FF6D2E;   /* the only brand colour; structural accents */
      --accent-soft: #FFF3EE;   /* accent tint */

      /* ── Semantic: verdict + answers ONLY ──
         The brand used to be this green. After the rebrand the only remaining
         --green* consumers are genuinely semantic: the "safe" hero verdict
         bar/value, the "yes" answer pill, and pass grid cells. */
      --green:       #10B981;   /* success — "safe" verdict + pass markers */
      --green-dark:  #0E9C6F;   /* pass text on tint (darkened success) */
      --green-tint:  #D1FAE5;   /* pass pill / status-pass background */
      --red:         #EF4444;   /* danger — unsafe / no */
      --red-tint:    #FEE2E2;   /* fail pill / problem-row background */
      --amber:       #B45309;   /* caution text */
      --amber-bg:    #FEF3C7;   /* caution background */

      /* ── Scale ── */
      --radius:      12px;      /* card radius */
      --radius-lg:   16px;      /* hero card radius */
    }
`;
}
