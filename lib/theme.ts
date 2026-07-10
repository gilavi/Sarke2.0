// lib/theme.ts - AWARD-LEVEL DESIGN SYSTEM
//
// Comprehensive design tokens with full backward compatibility.
// New code should use the nested primary/neutral/semantic scales and
// the typography / space / radius / shadows / motion / zIndex APIs.
// Old code continues to work via the compatibility mappings below.

import {
  primary,
  neutral,
  highlight,
  semantic,
  typeScale,
  radii,
  shadowSpec,
  motion as motionTokens,
  zIndex as zIndexTokens,
  spaceUnit,
  semanticLight,
  semanticDark,
  type ShadowSpec,
} from './design-tokens';

// Leave the UI fontFamily UNSET on both platforms so text renders in the OS
// system font (San Francisco on iOS, Roboto on Android). Both cover Mkhedruli,
// so ქართული and Latin runs in the same string ('PDF', dates, serials) render
// in ONE coherent typeface per line, and fontWeight still applies.
//
// The old iOS `'HelveticaNeue'` had NO Georgian glyphs: it was a dishonest
// declaration — Georgian silently fell back to the system Georgian font while
// Latin stayed Helvetica Neue, mixing two typefaces on every bilingual line.
// `undefined` makes the declaration match reality (what we ask for is what
// renders) without changing how Georgian looks (still the system font).
const GEO_FONT: string | undefined = undefined;

// Color primitives, the type scale, radii, motion, z-index and shadow specs all
// come from the canonical lib/design-tokens.ts so web + mobile never drift. This
// file shapes them into the React Native theme object (RN shadow objects,
// Platform.OS font families) and adds backward-compatible aliases.

/** Turn a platform-neutral ShadowSpec into a React Native shadow style object. */
function rnShadow(s: ShadowSpec) {
  return {
    shadowColor: s.color,
    shadowOffset: { width: s.x, height: s.y },
    shadowOpacity: s.opacity,
    shadowRadius: s.blur,
    elevation: s.elevation,
  };
}

// ── Light Theme ────────────────────────────────────────────────────────────

export const lightTheme = {
  colors: {
    // ── New nested primitives ──
    primary,
    neutral,
    semantic,

    // ── New semantic surfaces (canonical, from lib/design-tokens.ts) ──
    ...semanticLight,
    inverse: {
      background: neutral[900],
      surface: neutral[800],
      ink: neutral[50],
      inkSoft: neutral[300],
    },

    // ── Backward compatibility (old keys mapped to new values) ──
    // Old accentSoft was '#DDF0E7'; new primary[50] is '#E8F5F0' - visually close
    warn: semantic.warning,
    warnSoft: semantic.warningSoft,
    danger: semantic.danger,
    dangerSoft: semantic.dangerSoft,
    dangerTint: '#FFF5F5',
    dangerBorder: '#F09595',
    card: '#FFFFFF',
    hairline: neutral[200],
    subtleSurface: neutral[100],
    white: '#FFFFFF',
    harnessTint: '#2B5F9E',
    harnessSoft: '#DCE8F5',
    templatesTint: '#2B5F9E',
    templatesSoft: '#DCE8F5',
    certTint: '#B45309',
    certSoft: '#FDEBCF',
    regsTint: '#5D3FD3',
    regsSoft: '#E5DFF9',

    // Quick-action button surfaces (BOG-style row). Each entry maps to an
    // existing palette family - no new color values introduced.
    actionColors: {
      inspection:  { bg: primary[50],            icon: primary[700] },
      incident:    { bg: semantic.warningSoft,   icon: semantic.warning },
      briefing:    { bg: semantic.infoSoft,      icon: semantic.info },
      report:      { bg: semantic.dangerSoft,    icon: semantic.danger },
      participant: { bg: '#E5DFF9',              icon: '#5D3FD3' }, // = regsSoft / regsTint
      file:        { bg: '#FDEBCF',              icon: '#B45309' }, // = certSoft / certTint
    },
  },

  typography: {
    fontFamily: {
      display: GEO_FONT,
      heading: GEO_FONT,
      headingMedium: GEO_FONT,
      body: GEO_FONT,
      bodyMedium: GEO_FONT,
      bodySemiBold: GEO_FONT,
      bodyBold: GEO_FONT,
      mono: 'JetBrainsMono-Regular',
    },
    // Type ramp sourced from the canonical tokens (lib/design-tokens.ts).
    sizes: typeScale,
  },

  space: (n: number) => n * spaceUnit,

  // Radii sourced from the canonical tokens (includes the `pill` legacy alias).
  radius: radii,

  // RN shadow objects derived from the platform-neutral shadow specs.
  shadows: {
    none: rnShadow(shadowSpec.none),
    xs: rnShadow(shadowSpec.xs),
    sm: rnShadow(shadowSpec.sm),
    md: rnShadow(shadowSpec.md),
    lg: rnShadow(shadowSpec.lg),
    xl: rnShadow(shadowSpec.xl),
    glow: rnShadow(shadowSpec.glow),
  },

  motion: motionTokens,

  zIndex: zIndexTokens,

  // ── Backward compatibility APIs ──
  spacing: (n: number) => n * spaceUnit,

  shadow: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 3,
    },
    button: {
      shadowColor: primary[500],
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 3,
    },
  },

  text: {
    display: (size: number, weight: '400' | '500' | '600' | '700' | '800' | '900' = '700') => ({
      fontSize: size,
      fontWeight: weight,
      fontFamily: GEO_FONT,
    }),
  },
} as const;

// ── Dark Theme ─────────────────────────────────────────────────────────────

export const darkTheme = {
  ...lightTheme,
  colors: {
    ...lightTheme.colors,
    primary,
    neutral,
    // Dark semantic surfaces (canonical, from lib/design-tokens.ts).
    ...semanticDark,
    inverse: {
      background: neutral[50],
      surface: neutral[100],
      ink: neutral[900],
      inkSoft: neutral[600],
    },
    // ── Dark mode semantic colors ──
    semantic: {
      success: semantic.success,
      warning: semantic.warning,
      danger: semantic.danger,
      info: semantic.info,
      successSoft: '#1A3A2A',
      warningSoft: '#3F2E0F',
      dangerSoft: '#3A1F1F',
      infoSoft: '#1A2E3A',
      // On the dark soft fills the base hues already pass AA (4.9:1 / 6.1:1),
      // so "strong" text falls back to them — only light mode needs darker inks.
      successStrong: semantic.success,
      warningStrong: semantic.warning,
    },
    // Backward compat keys in dark mode
    card: '#1A1A1A',
    hairline: '#2A2A2A',
    subtleSurface: '#1F1F1F',
    white: '#F5F5F0',
    warn: semantic.warning,
    warnSoft: '#3F2E0F',
    danger: semantic.danger,
    dangerSoft: '#3A1F1F',
    dangerTint: '#2A1515',
    dangerBorder: '#7A3535',
    harnessTint: '#5B8ED4',
    harnessSoft: '#1A2A3F',
    templatesTint: '#5B8ED4',
    templatesSoft: '#1A2A3F',
    certTint: '#D4853A',
    certSoft: '#3A2510',
    regsTint: '#8B72E8',
    regsSoft: '#221A40',

    actionColors: {
      inspection:  { bg: 'rgba(254,122,67,0.15)', icon: primary[400] }, // primary[500] wash
      incident:    { bg: '#3F2E0F',              icon: semantic.warning },
      briefing:    { bg: '#1A2E3A',              icon: semantic.info },
      report:      { bg: '#3A1F1F',              icon: semantic.danger },
      participant: { bg: '#221A40',              icon: '#8B72E8' },
      file:        { bg: '#3A2510',              icon: '#D4853A' },
    },
  },
} as const;

// ── Theme Type & Default Export ────────────────────────────────────────────

export type Theme = typeof lightTheme;

/** Default theme export - backward compatible with all existing code. */
export const theme = lightTheme;

// ── Helpers ────────────────────────────────────────────────────────────────

// NOTE: the old `useScaledFontSize` helper was removed on purpose. Text must
// scale by the OS fontScale exactly once — natively, via `maxFontSizeMultiplier`
// on <Text> (see components/primitives/A11yText.tsx). Pre-scaling font sizes in
// JS double-applies Dynamic Type (fontScale²). Don't reintroduce it.

/** Convert a hex color to rgba with given opacity. */
export function withOpacity(color: string, opacity: number): string {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

// Re-export useTheme so consumers can import from either location
export { useTheme } from './ThemeContext';
