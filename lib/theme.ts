// lib/theme.ts — AWARD-LEVEL DESIGN SYSTEM
//
// Comprehensive design tokens with full backward compatibility.
// New code should use the nested primary/neutral/semantic scales and
// the typography / space / radius / shadows / motion / zIndex APIs.
// Old code continues to work via the compatibility mappings below.

import { useWindowDimensions } from 'react-native';

// ── Color Primitives ───────────────────────────────────────────────────────

const primary = {
  50: '#E8F5F0',
  100: '#D1EBE1',
  200: '#A3D7C3',
  300: '#75C3A5',
  400: '#47AF87',
  500: '#147A4F',
  600: '#106240',
  700: '#0C4930',
  800: '#083120',
  900: '#041810',
} as const;

const neutral = {
  50: '#FAFAF8',
  100: '#F5F5F0',
  200: '#E8E6E0',
  300: '#D4D0C8',
  400: '#A8A49C',
  500: '#7C7870',
  600: '#504C44',
  700: '#3A3630',
  800: '#242018',
  900: '#0E0C08',
} as const;

const semantic = {
  success: '#10B981',
  successSoft: '#D1FAE5',
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
  danger: '#EF4444',
  dangerSoft: '#FEE2E2',
  info: '#3B82F6',
  infoSoft: '#DBEAFE',
} as const;

// ── Light Theme ────────────────────────────────────────────────────────────

export const lightTheme = {
  colors: {
    // ── New nested primitives ──
    primary,
    neutral,
    semantic,

    // ── New semantic surfaces ──
    background: neutral[50],
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceSecondary: neutral[100],
    ink: neutral[900],
    inkSoft: neutral[600],
    inkFaint: neutral[400],
    border: neutral[200],
    borderStrong: neutral[300],
    accent: primary[500],
    accentSoft: primary[50],
    accentGhost: primary[100],
    overlay: 'rgba(0,0,0,0.45)',
    scrim: 'rgba(0,0,0,0.25)',
    inverse: {
      background: neutral[900],
      surface: neutral[800],
      ink: neutral[50],
      inkSoft: neutral[300],
    },

    // ── Backward compatibility (old keys mapped to new values) ──
    // Old accentSoft was '#DDF0E7'; new primary[50] is '#E8F5F0' — visually close
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
  },

  typography: {
    fontFamily: {
      display: 'SpaceGrotesk-Bold',
      heading: 'SpaceGrotesk-SemiBold',
      headingMedium: 'SpaceGrotesk-Medium',
      body: 'Inter-Regular',
      bodyMedium: 'Inter-Medium',
      bodySemiBold: 'Inter-SemiBold',
      bodyBold: 'Inter-Bold',
      mono: 'JetBrainsMono-Regular',
    },
    sizes: {
      '2xs': { size: 10, lineHeight: 12, letterSpacing: 0.03 },
      xs: { size: 11, lineHeight: 14, letterSpacing: 0.02 },
      sm: { size: 13, lineHeight: 18, letterSpacing: 0.01 },
      base: { size: 15, lineHeight: 22, letterSpacing: 0 },
      lg: { size: 17, lineHeight: 24, letterSpacing: -0.01 },
      xl: { size: 20, lineHeight: 28, letterSpacing: -0.02 },
      '2xl': { size: 24, lineHeight: 32, letterSpacing: -0.02 },
      '3xl': { size: 30, lineHeight: 38, letterSpacing: -0.03 },
      '4xl': { size: 38, lineHeight: 46, letterSpacing: -0.03 },
      '5xl': { size: 48, lineHeight: 56, letterSpacing: -0.04 },
    },
  },

  space: (n: number) => n * 4,

  radius: {
    // New scale
    none: 0,
    xs: 6,
    sm: 8,
    md: 12,
    cardInner: 14,
    lg: 16,
    xl: 20,
    '2xl': 24,
    full: 9999,
    // Backward compatibility aliases
    pill: 999,
  },

  shadows: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    xs: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 2,
      elevation: 1,
    },
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 6,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.16,
      shadowRadius: 32,
      elevation: 10,
    },
    glow: {
      shadowColor: primary[500],
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 4,
    },
  },

  motion: {
    instant: 0,
    fast: 150,
    normal: 250,
    slow: 350,
    slower: 500,
    spring: {
      gentle: { damping: 20, stiffness: 180, mass: 1 },
      bouncy: { damping: 12, stiffness: 200, mass: 1 },
      stiff: { damping: 25, stiffness: 300, mass: 1 },
      soft: { damping: 30, stiffness: 120, mass: 1 },
    },
  },

  zIndex: {
    base: 0,
    dropdown: 100,
    sticky: 200,
    overlay: 300,
    modal: 400,
    toast: 500,
    tooltip: 600,
  },

  // ── Backward compatibility APIs ──
  spacing: (n: number) => n * 4,

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
      fontFamily: 'System',
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
    background: '#0F0F0F',
    surface: '#1A1A1A',
    surfaceElevated: '#242424',
    surfaceSecondary: '#1F1F1F',
    ink: '#F5F5F0',
    inkSoft: '#E0E0E0',
    inkFaint: '#B0B0B0',
    border: '#2A2A2A',
    borderStrong: '#3A3A3A',
    accent: primary[400],
    accentSoft: 'rgba(20,122,79,0.15)',
    accentGhost: 'rgba(20,122,79,0.08)',
    overlay: 'rgba(0,0,0,0.65)',
    scrim: 'rgba(0,0,0,0.50)',
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
  },
} as const;

// ── Theme Type & Default Export ────────────────────────────────────────────

export type Theme = typeof lightTheme;

/** Default theme export — backward compatible with all existing code. */
export const theme = lightTheme;

// ── Helpers ────────────────────────────────────────────────────────────────

/** Responsive font size that respects accessibility settings. */
export function useScaledFontSize(baseSize: number) {
  const { fontScale } = useWindowDimensions();
  return baseSize * Math.min(fontScale, 1.5);
}

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
