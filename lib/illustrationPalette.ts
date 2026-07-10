// lib/illustrationPalette.ts - canonical monochrome palette for hand-drawn
// SVG illustrations (QuestionAvatar, EmptyState, ErrorScreen, SkeletonMap, …).
//
// Hubble illustrations are strictly MONOCHROME: shades of the primary (brand
// orange primary[500] #FE7A43, sourced live via `c.accent` below), the secondary
// (electric/hi-vis yellow), and black / warm neutrals. No green, no blue, no
// amber - those were pre-rebrand leftovers that read as "wrong" against the
// current identity.
//
// All illustration components must source their colors from here (via
// `useIllustrationPalette`) instead of hardcoding hex values, so the system
// stays cohesive and can't drift back to off-brand colors. `stroke` / `fill`
// adapt to light/dark via the theme accent; the material/metal neutrals are
// fixed so the line art keeps its value hierarchy on any tile.

import { useTheme } from './theme';

export interface IllustrationPalette {
  /** Primary line / stroke - brand orange. Adapts to theme (lighter in dark). */
  line: string;
  /** Darker primary - shaded faces, secondary structure, "deeper" strokes. */
  lineDeep: string;
  /** Deepest primary - near-black-orange shadows / recesses. */
  lineDeepest: string;
  /** Soft primary wash - tile backgrounds and large fills. Adapts to theme. */
  fill: string;
  /** Slightly stronger primary wash. Adapts to theme. */
  fillStrong: string;
  /** Secondary accent - electric yellow. Use sparingly for pops: stamps,
   *  sparks, stars, warning lamps, camera flash. */
  pop: string;
  /** Softer secondary wash. */
  popSoft: string;
  /** Ink / black - adapts to theme (flips light in dark mode). */
  ink: string;
  /** Hardware / structural steel poles - fixed dark neutral. */
  hardware: string;
  /** Material body (decks, planks, panels) - fixed mid neutral. */
  material: string;
  /** Material detail lines (grooves, seams) - fixed darker neutral. */
  materialLine: string;
  /** Light metal / steel face - fixed light neutral. */
  metal: string;
  /** Mid metal / steel shade - fixed neutral. */
  metalDark: string;
  /** Ground / base bars - fixed light neutral. */
  ground: string;
  /** Faint hairlines. Adapts to theme. */
  hairline: string;
  /** Pure surface white (for highlights, lenses, paper). */
  white: string;
}

/** Monochrome illustration palette derived from the active theme. */
export function useIllustrationPalette(): IllustrationPalette {
  const { theme } = useTheme();
  const c = theme.colors;
  return {
    line: c.accent,
    lineDeep: c.primary[700],
    lineDeepest: c.primary[900],
    fill: c.accentSoft,
    fillStrong: c.accentGhost,
    pop: c.highlight,
    popSoft: c.highlightSoft,
    ink: c.ink,
    hardware: '#444441',
    material: c.neutral[400],
    materialLine: c.neutral[600],
    metal: c.neutral[300],
    metalDark: c.neutral[400],
    ground: c.neutral[200],
    hairline: c.border,
    white: '#FFFFFF',
  };
}
