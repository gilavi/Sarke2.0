/**
 * Unit tests for `useIllustrationPalette` — the canonical monochrome palette for
 * hand-drawn SVG illustrations. The hook is a pure projection of the active
 * theme, so we mock `../../lib/theme` with sentinel tokens and assert every
 * field maps to the intended source (theme token or fixed neutral constant).
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('../../lib/theme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        accent: 'ACCENT',
        primary: { 700: 'PRIMARY700', 900: 'PRIMARY900' },
        accentSoft: 'ACCENT_SOFT',
        accentGhost: 'ACCENT_GHOST',
        highlight: 'HIGHLIGHT',
        highlightSoft: 'HIGHLIGHT_SOFT',
        ink: 'INK',
        neutral: { 200: 'N200', 300: 'N300', 400: 'N400', 600: 'N600' },
        border: 'BORDER',
      },
    },
  }),
}));

import { useIllustrationPalette } from '../../lib/illustrationPalette';

describe('useIllustrationPalette', () => {
  it('maps theme-adaptive fields to the right tokens', () => {
    const { result } = renderHook(() => useIllustrationPalette());
    const p = result.current;
    expect(p.line).toBe('ACCENT');
    expect(p.lineDeep).toBe('PRIMARY700');
    expect(p.lineDeepest).toBe('PRIMARY900');
    expect(p.fill).toBe('ACCENT_SOFT');
    expect(p.fillStrong).toBe('ACCENT_GHOST');
    expect(p.pop).toBe('HIGHLIGHT');
    expect(p.popSoft).toBe('HIGHLIGHT_SOFT');
    expect(p.ink).toBe('INK');
    expect(p.hairline).toBe('BORDER');
  });

  it('maps the fixed material/metal neutrals to theme neutral steps', () => {
    const { result } = renderHook(() => useIllustrationPalette());
    const p = result.current;
    expect(p.material).toBe('N400');
    expect(p.materialLine).toBe('N600');
    expect(p.metal).toBe('N300');
    expect(p.metalDark).toBe('N400');
    expect(p.ground).toBe('N200');
  });

  it('keeps theme-independent constants fixed regardless of theme', () => {
    const { result } = renderHook(() => useIllustrationPalette());
    const p = result.current;
    expect(p.hardware).toBe('#444441');
    expect(p.white).toBe('#FFFFFF');
  });

  it('returns every documented field', () => {
    const { result } = renderHook(() => useIllustrationPalette());
    expect(Object.keys(result.current).sort()).toEqual(
      [
        'fill', 'fillStrong', 'ground', 'hairline', 'hardware', 'ink', 'line',
        'lineDeep', 'lineDeepest', 'material', 'materialLine', 'metal',
        'metalDark', 'pop', 'popSoft', 'white',
      ].sort(),
    );
  });
});
