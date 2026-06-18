/**
 * Unit tests for SuccessScreen + SuccessActionCard. The Screen/Button/animation
 * primitives are stubbed; covers conditional subtitle/children/primary/actions,
 * action-card press wiring, and the once-on-mount completion haptic.
 */
import React from 'react';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

vi.mock('../../lib/theme', async () => (await import('../mocks/rn-ui')).themeMock());
vi.mock('../../lib/haptics', async () => (await import('../mocks/rn-ui')).hapticsMock());
vi.mock('lucide-react-native', async () => (await import('../mocks/rn-ui')).lucideMock());
vi.mock('../../components/primitives/A11yText', async () => (await import('../mocks/rn-ui')).a11yTextMock());
vi.mock('expo-router', () => ({ Stack: { Screen: () => null } }));
vi.mock('../../components/animations', () => ({
  AnimatedSuccessIcon: () => React.createElement('div', { 'data-testid': 'check' }),
  CelebrationBurst: () => React.createElement('div', { 'data-testid': 'burst' }),
}));
vi.mock('../../components/ui', () => ({
  Screen: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
  Button: ({ title, onPress }: { title: string; onPress: () => void }) =>
    React.createElement('button', { 'data-testid': 'primary-btn', onClick: onPress }, title),
}));

import { SuccessScreen } from '../../components/success/SuccessScreen';
import { Home, FileText } from 'lucide-react-native';
import { haptic } from '../../lib/haptics';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe('SuccessScreen', () => {
  it('renders the title and the celebration scaffold', () => {
    const { getByText, getByTestId } = render(<SuccessScreen title="შენახულია!" />);
    expect(getByText('შენახულია!')).toBeTruthy();
    expect(getByTestId('check')).toBeTruthy();
    expect(getByTestId('burst')).toBeTruthy();
  });

  it('renders the subtitle only when provided', () => {
    const { queryByText, rerender } = render(<SuccessScreen title="t" />);
    expect(queryByText('ქვესათაური')).toBeNull();
    rerender(<SuccessScreen title="t" subtitle="ქვესათაური" />);
    expect(queryByText('ქვესათაური')).toBeTruthy();
  });

  it('renders children (summary card slot)', () => {
    const { getByTestId } = render(
      <SuccessScreen title="t">
        <div data-testid="summary" />
      </SuccessScreen>,
    );
    expect(getByTestId('summary')).toBeTruthy();
  });

  it('renders and wires the primary CTA', () => {
    const onPress = vi.fn();
    const { getByTestId } = render(
      <SuccessScreen title="t" primary={{ title: 'PDF', icon: FileText, onPress }} />,
    );
    fireEvent.click(getByTestId('primary-btn'));
    expect(onPress).toHaveBeenCalled();
  });

  it('renders secondary action cards and wires their presses', () => {
    const onPress = vi.fn();
    const { getByText } = render(
      <SuccessScreen title="t" actions={[{ icon: Home, title: 'მთავარი', onPress }]} />,
    );
    fireEvent.click(getByText('მთავარი'));
    expect(onPress).toHaveBeenCalled();
  });

  it('renders an action subtitle when present', () => {
    const { getByText } = render(
      <SuccessScreen title="t" actions={[{ icon: Home, title: 'მთავარი', subtitle: 'დაბრუნება', onPress: vi.fn() }]} />,
    );
    expect(getByText('დაბრუნება')).toBeTruthy();
  });

  it('fires the completion haptic once, 400ms after mount', () => {
    vi.useFakeTimers();
    try {
      render(<SuccessScreen title="t" />);
      expect(haptic.inspectionComplete).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(400));
      expect(haptic.inspectionComplete).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
