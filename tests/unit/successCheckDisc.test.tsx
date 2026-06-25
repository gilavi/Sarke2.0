/**
 * Unit tests for SuccessCheckDisc. Confirms it renders the tick in both the
 * animated path and the reduced-motion (static final state) path — the
 * prefers-reduced-motion branch must still draw the completed check.
 */
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

const a11yState = vi.hoisted(() => ({ reduceMotion: false }));

vi.mock('../../lib/theme', async () => (await import('../mocks/rn-ui')).themeMock());
vi.mock('../../lib/accessibility', () => ({
  useAccessibilitySettings: () => ({ reduceMotion: a11yState.reduceMotion }),
}));
vi.mock('react-native-reanimated', async () => {
  const RN = await import('react-native'); // aliased to react-native-web (flattens RN style arrays)
  const identity = <T,>(v: T) => v;
  return {
    __esModule: true,
    default: { createAnimatedComponent: <T,>(c: T) => c, View: RN.View },
    createAnimatedComponent: <T,>(c: T) => c,
    useSharedValue: <T,>(v: T) => ({ value: v }),
    // Invoke the worklet so the style/props callbacks are exercised (coverage).
    useAnimatedStyle: (fn: () => unknown) => (typeof fn === 'function' ? fn() : {}),
    useAnimatedProps: (fn: () => unknown) => (typeof fn === 'function' ? fn() : {}),
    withTiming: identity,
    withSpring: identity,
    withDelay: <T,>(_d: number, v: T) => v,
    withSequence: (...a: unknown[]) => a[a.length - 1],
    Easing: { out: () => () => 0, in: () => () => 0, quad: () => 0 },
  };
});
vi.mock('react-native-svg', () => ({
  __esModule: true,
  default: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
  Svg: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
  Path: () => React.createElement('div', { 'data-testid': 'tick' }),
}));

import { SuccessCheckDisc } from '../../components/success/SuccessCheckDisc';

afterEach(() => {
  cleanup();
  a11yState.reduceMotion = false;
});

describe('SuccessCheckDisc', () => {
  it('renders the tick with motion enabled', () => {
    a11yState.reduceMotion = false;
    const { getByTestId } = render(<SuccessCheckDisc />);
    expect(getByTestId('tick')).toBeTruthy();
  });

  it('renders the static final state under reduced motion', () => {
    a11yState.reduceMotion = true;
    const { getByTestId } = render(<SuccessCheckDisc />);
    expect(getByTestId('tick')).toBeTruthy();
  });
});
