/**
 * Shared `vi.mock` factory bodies for the new-component unit tests.
 *
 * These keep the ~14 component test files DRY: each test still declares its own
 * `vi.mock(path, …)` (so the mock graph is explicit and hoisted per file), but
 * the factory body is sourced from here via an async dynamic import, e.g.
 *
 *   vi.mock('../../lib/theme', async () => (await import('../mocks/rn-ui')).themeMock());
 *   vi.mock('lucide-react-native', async () => (await import('../mocks/rn-ui')).lucideMock());
 *
 * `react-native` is aliased to `react-native-web` (see vitest.config.ts), so the
 * primitives render to real DOM; only the native-only / theming deps below need
 * stubbing.
 */
import React from 'react';
import { vi } from 'vitest';

/** A theme object covering every token the new components read. Distinct,
 *  readable sentinel values so a test can assert a specific token mapping. */
export function makeTheme() {
  return {
    colors: {
      accent: '#FF6D2E',
      accentSoft: '#FFE9DE',
      accentGhost: '#FFF3EC',
      primary: { 700: '#C24A14', 900: '#7A2E08' },
      highlight: '#F2E600',
      highlightSoft: '#FBF7B0',
      ink: '#1A1A1A',
      inkSoft: '#666666',
      inkFaint: '#999999',
      neutral: { 200: '#EDEDED', 300: '#D9D9D9', 400: '#BDBDBD', 600: '#757575' },
      border: '#E0E0E0',
      borderStrong: '#C4C4C4',
      subtleSurface: '#F4F4F4',
      surface: '#FFFFFF',
      card: '#FFFFFF',
      background: '#FAFAFA',
      hairline: '#ECECEC',
      overlay: 'rgba(0,0,0,0.4)',
      danger: '#DC2626',
      warn: '#F59E0B',
      white: '#FFFFFF',
      inverse: { background: '#1A1A1A', ink: '#FFFFFF' },
      semantic: { success: '#1D9E75', warning: '#F59E0B', danger: '#DC2626' },
    },
    radius: { sm: 8, md: 12, lg: 16, input: 12 },
    typography: { fontFamily: { body: 'System', bodyMedium: 'System', bodySemiBold: 'System' } },
    motion: { spring: { bouncy: { damping: 12, stiffness: 180 } } },
  };
}

/** Mock body for `../../lib/theme`. */
export function themeMock() {
  return { useTheme: () => ({ theme: makeTheme() }) };
}

/** Mock body for `../../lib/accessibility`. Reimplements `a11y` faithfully so
 *  react-native-web still maps role/label/state onto queryable DOM attributes. */
export function accessibilityMock() {
  return {
    a11y: (
      label: string,
      hint?: string,
      role?: string,
      state?: Record<string, unknown>,
    ) => ({
      accessible: true,
      accessibilityLabel: label,
      accessibilityHint: hint,
      accessibilityRole: role,
      accessibilityState: state,
    }),
    useAccessibilitySettings: () => ({ reduceMotion: false, isScreenReaderEnabled: false }),
    useScaledSize: (n: number) => n,
    announce: vi.fn(),
  };
}

/** Mock body for `../../lib/haptics`. Every method is a spy so callers can
 *  assert the right feedback fired; re-import `haptic` in the test to read them. */
export function hapticsMock() {
  const fn = () => vi.fn();
  return {
    haptic: new Proxy(
      {},
      {
        get(target: Record<string, ReturnType<typeof vi.fn>>, prop: string) {
          if (!target[prop]) target[prop] = fn();
          return target[prop];
        },
      },
    ),
  };
}

/** Mock body for `../primitives/A11yText`. Renders a span carrying the text and
 *  pass-through accessibility props, dropping RN-only style/number props. */
export function a11yTextMock() {
  return {
    A11yText: ({
      children,
      style: _style,
      numberOfLines: _n,
      weight: _w,
      size: _s,
      color: _c,
      allowFontScaling: _a,
      maxFontSizeMultiplier: _m,
      ...rest
    }: Record<string, unknown>) =>
      React.createElement('span', rest as Record<string, unknown>, children as React.ReactNode),
  };
}

/** Mock body for `lucide-react-native`. Any icon name resolves to a stub that
 *  renders `<span data-icon="Name" />`, so tests can assert which glyph showed.
 *
 *  CRITICAL: only icon-shaped names (capitalised) resolve to a component. The
 *  module namespace must NOT look thenable — returning a function for `then`
 *  makes vitest treat the awaited ESM namespace as a Promise and hang forever.
 *  So `then`, `__esModule`, symbols, and lowercase keys all return undefined. */
export function lucideMock() {
  const isIcon = (prop: string | symbol) => typeof prop === 'string' && /^[A-Z]/.test(prop);
  const makeIcon = (name: string) => {
    const Icon = () => React.createElement('span', { 'data-icon': name });
    Icon.displayName = name;
    return Icon;
  };
  return new Proxy(
    { __esModule: true },
    {
      get(_t, prop) {
        if (prop === '__esModule') return true;
        if (!isIcon(prop)) return undefined; // then/default/lowercase/symbols → not thenable
        return makeIcon(String(prop));
      },
      // vitest validates named imports against the mock; report capitalised
      // icon names as present so `import { Check }` resolves.
      has: (_t, prop) => prop === '__esModule' || isIcon(prop),
      getOwnPropertyDescriptor: (_t, prop) =>
        isIcon(prop)
          ? { configurable: true, enumerable: true, value: makeIcon(String(prop)) }
          : undefined,
    },
  );
}

/** Mock body for `react-native-reanimated`. Pass-through animation primitives
 *  and an identity `createAnimatedComponent`, so no real animation runs. */
export function reanimatedMock() {
  const identity = <T,>(v: T) => v;
  const Animated = {
    createAnimatedComponent: <T,>(C: T) => C,
    View: 'div',
  };
  return {
    __esModule: true,
    default: Animated,
    useSharedValue: <T,>(v: T) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    withTiming: identity,
    withSpring: identity,
    withDelay: <T,>(_d: number, v: T) => v,
    withSequence: (...args: unknown[]) => args[args.length - 1],
    Easing: { inOut: () => () => 0, out: () => () => 0, ease: () => 0 },
  };
}
