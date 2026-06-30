/**
 * Unit tests for the Selector `grid` presentation + `SelectorOptionCard` — the
 * 2-column illustration-card picker behind TemplatePickerStep. Renders the REAL
 * Selector (react-native → react-native-web); only theme/accessibility/haptics/
 * icons/A11yText are stubbed, and reanimated is the global pass-through stub.
 *
 * `lib/theme` is stubbed locally (rather than via the shared themeMock) because
 * the grid card reads `withOpacity` for its low-alpha ink selected fill.
 *
 * Covers: every option renders as a card (label + custom leading); tapping a
 * card forwards its value; and the selected + error branches render without
 * throwing (exercising the active-fill / danger-border paths).
 */
import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

vi.mock('../../lib/theme', async () => {
  const { makeTheme } = await import('../mocks/rn-ui');
  const base = makeTheme();
  return {
    useTheme: () => ({ theme: { ...base, motion: { ...base.motion, fast: 150 } } }),
    withOpacity: (_c: string, o: number) => `rgba(26,26,26,${o})`,
  };
});
// Togglable reduceMotion so we can exercise both the tween and the
// reduce-motion (instant) selection branch in SelectorOptionCard.
const acc = vi.hoisted(() => ({ reduceMotion: false }));
vi.mock('../../lib/accessibility', async () => {
  const base = (await import('../mocks/rn-ui')).accessibilityMock();
  return {
    ...base,
    useAccessibilitySettings: () => ({ reduceMotion: acc.reduceMotion, isScreenReaderEnabled: false }),
  };
});
vi.mock('../../lib/haptics', async () => (await import('../mocks/rn-ui')).hapticsMock());
vi.mock('../../components/primitives/A11yText', async () => (await import('../mocks/rn-ui')).a11yTextMock());
vi.mock('lucide-react-native', async () => (await import('../mocks/rn-ui')).lucideMock());

import { Selector, type SelectorOption } from '../../components/ui/Selector';
import { haptic } from '../../lib/haptics';

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  acc.reduceMotion = false;
});

const OPTIONS: SelectorOption[] = [
  { value: 'a', label: 'Bobcat', leading: React.createElement('span', { 'data-testid': 'lead-a' }) },
  { value: 'b', label: 'Excavator', leading: React.createElement('span', { 'data-testid': 'lead-b' }) },
];

function renderGrid(value: string | null, extra: Partial<React.ComponentProps<typeof Selector>> = {}) {
  const onChange = vi.fn();
  const utils = render(
    <Selector presentation="grid" value={value} onChange={onChange} options={OPTIONS} {...(extra as object)} />,
  );
  return { ...utils, onChange };
}

describe('Selector grid presentation', () => {
  it('renders one card per option, with label and custom leading', () => {
    const { getByText, getByTestId } = renderGrid(null);
    expect(getByText('Bobcat')).toBeTruthy();
    expect(getByText('Excavator')).toBeTruthy();
    expect(getByTestId('lead-a')).toBeTruthy();
    expect(getByTestId('lead-b')).toBeTruthy();
  });

  it('forwards the option value on tap (and fires selection haptic)', () => {
    const { getByText, onChange } = renderGrid(null);
    fireEvent.click(getByText('Excavator'));
    expect(onChange).toHaveBeenCalledWith('b');
    expect(haptic.light).toHaveBeenCalled();
  });

  it('renders the selected card (active alpha-ink fill) without throwing', () => {
    const { getByText } = renderGrid('a');
    expect(getByText('Bobcat')).toBeTruthy();
  });

  it('renders the error (danger border) branch without throwing', () => {
    const { getByText } = renderGrid(null, { error: true });
    expect(getByText('Bobcat')).toBeTruthy();
  });

  it('applies selection instantly under reduce-motion (no tween) without throwing', () => {
    acc.reduceMotion = true;
    const { getByText, onChange } = renderGrid('a');
    expect(getByText('Bobcat')).toBeTruthy();
    fireEvent.click(getByText('Excavator'));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('does not advance when a disabled card is tapped', () => {
    const onChange = vi.fn();
    render(
      <Selector
        presentation="grid"
        value={null}
        onChange={onChange}
        options={[{ value: 'a', label: 'Bobcat', disabled: true }]}
      />,
    );
    // disabled Pressable swallows the press
    const label = document.body.querySelector('span');
    if (label) fireEvent.click(label);
    expect(onChange).not.toHaveBeenCalled();
  });
});
