// lib/design-tokens.ts — CANONICAL, PLATFORM-NEUTRAL DESIGN TOKENS
//
// This is the SINGLE SOURCE OF TRUTH for Hubble's design tokens. It contains
// pure data only — no react-native, no DOM, no platform imports — so it can be
// consumed by every surface without drift:
//   • mobile (Expo)  → lib/theme.ts shapes these into the RN theme object.
//   • web-app / web  → scripts/build-tokens.mjs emits Tailwind + CSS-var files
//                      under web-app/src/generated/ from this file.
//   • design system  → Storybook token galleries read this file directly.
//
// Before this file existed the brand orange was defined four times with three
// different values (lib/theme.ts #FE7A43, web-app/tailwind.config.ts #FF5A1F,
// web-app index.css, the Mantine theme). Edit tokens HERE and regenerate web
// artifacts with `npm run tokens` — never hand-edit the generated files.

// ── Color primitives ────────────────────────────────────────────────────────

/** Hubble BRAND ORANGE primary scale (centered on 500 = #FE7A43). */
export const primary = {
  50: '#FFF3EE',
  100: '#FFE3D6',
  200: '#FFC4AC',
  300: '#FF9E78',
  400: '#FF8A57',
  500: '#FE7A43',
  600: '#E85510',
  700: '#BE3F0B',
  800: '#972F11',
  900: '#7B2913',
} as const;

/** Warm neutrals: OFF-WHITE (#F2F1EC) → CONCRETE (#D6D6D1 borders) → GRAPHITE (#1A1A1A ink). */
export const neutral = {
  50: '#F2F1EC',
  100: '#E9E7E0',
  200: '#D6D6D1',
  300: '#C2BEB6',
  400: '#9C988F',
  500: '#736F67',
  600: '#4E4A44',
  700: '#363230',
  800: '#221F1C',
  900: '#1A1A1A',
} as const;

/** HI-VIS YELLOW — high-energy spotlight accent (use sparingly). */
export const highlight = '#E6FF4D';

export const semantic = {
  success: '#10B981',
  successSoft: '#D1FAE5',
  /** AA text over successSoft (4.8:1) — small text on the soft fill needs this, not `success` (2.2:1). */
  successStrong: '#047857',
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
  /** AA text over warningSoft (6.4:1) — same value lib/statusColors.ts INCIDENT_COLORS.minor.text uses. */
  warningStrong: '#92400E',
  danger: '#EF4444',
  dangerSoft: '#FEE2E2',
  info: '#3B82F6',
  infoSoft: '#DBEAFE',
} as const;

// ── Typography scale ─────────────────────────────────────────────────────────
// Per-platform font *families* live in lib/theme.ts (they need Platform.OS) and
// in the web @font-face stacks; only the size ramp is platform-neutral.

export const typeScale = {
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
} as const;

// ── Spacing ──────────────────────────────────────────────────────────────────

/** Base spacing unit in px. The scale is `n * spaceUnit` (theme.space(n)). */
export const spaceUnit = 4;

// ── Radii (px) ───────────────────────────────────────────────────────────────

export const radii = {
  none: 0,
  xs: 6,
  sm: 8,
  input: 10,
  md: 12,
  cardInner: 14,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
  pill: 999,
} as const;

// ── Shadows (platform-neutral spec) ──────────────────────────────────────────
// One spec per depth. lib/theme.ts turns these into RN shadow objects
// (shadowOffset / shadowOpacity / shadowRadius / elevation); the web generator
// turns them into CSS `box-shadow` strings. `color` is a hex (or 'transparent')
// and `opacity` is applied to it.

export interface ShadowSpec {
  x: number;
  y: number;
  blur: number;
  color: string;
  opacity: number;
  /** Android elevation (used by RN only). */
  elevation: number;
}

export const shadowSpec = {
  none: { x: 0, y: 0, blur: 0, color: 'transparent', opacity: 0, elevation: 0 },
  xs: { x: 0, y: 1, blur: 2, color: '#000000', opacity: 0.03, elevation: 1 },
  sm: { x: 0, y: 1, blur: 3, color: '#000000', opacity: 0.05, elevation: 2 },
  md: { x: 0, y: 4, blur: 8, color: '#000000', opacity: 0.08, elevation: 3 },
  lg: { x: 0, y: 8, blur: 16, color: '#000000', opacity: 0.12, elevation: 6 },
  xl: { x: 0, y: 16, blur: 32, color: '#000000', opacity: 0.16, elevation: 10 },
  glow: { x: 0, y: 4, blur: 12, color: primary[500], opacity: 0.3, elevation: 4 },
} as const satisfies Record<string, ShadowSpec>;

// ── Motion ───────────────────────────────────────────────────────────────────

export const motion = {
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
} as const;

// ── Z-index ──────────────────────────────────────────────────────────────────

export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  overlay: 300,
  modal: 400,
  toast: 500,
  tooltip: 600,
} as const;

// ── Semantic surface tokens (per color scheme) ───────────────────────────────
// Resolved colors that map the primitives above into roles. lib/theme.ts spreads
// these into lightTheme/darkTheme; the web generator emits them as CSS vars under
// :root and .dark. Keys are intentionally platform-neutral role names.

export const semanticLight = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceSecondary: neutral[100],
  ink: neutral[900],
  inkSoft: neutral[600],
  // neutral[500] = 5.0:1 on the white background/surface (WCAG AA ≥ 4.5:1).
  // The old neutral[400] was 2.9:1 — illegible at the 11-13px sizes it's used at.
  inkFaint: neutral[500],
  border: neutral[200],
  borderStrong: neutral[300],
  accent: primary[500],
  accentSoft: primary[50],
  accentGhost: primary[100],
  highlight,
  highlightSoft: '#F6FFC9',
  overlay: 'rgba(0,0,0,0.45)',
  scrim: 'rgba(0,0,0,0.25)',
} as const;

export const semanticDark = {
  background: '#000000',
  surface: '#1A1A1A',
  surfaceElevated: '#242424',
  surfaceSecondary: '#1F1F1F',
  ink: '#F5F5F0',
  inkSoft: '#E0E0E0',
  inkFaint: '#B0B0B0',
  border: '#2A2A2A',
  borderStrong: '#3A3A3A',
  accent: primary[400],
  // Washes of the canonical brand orange primary[500] (#FE7A43 = 254,122,67) —
  // NOT the stray #FF6D2E (255,109,46) they used before, so the dark-mode accent
  // tints derive from the same orange as every other brand surface.
  accentSoft: 'rgba(254,122,67,0.15)',
  accentGhost: 'rgba(254,122,67,0.08)',
  highlight,
  highlightSoft: 'rgba(230,255,77,0.16)',
  overlay: 'rgba(0,0,0,0.65)',
  scrim: 'rgba(0,0,0,0.50)',
} as const;
