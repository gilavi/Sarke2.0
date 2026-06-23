/**
 * Unit tests for TopicSelector — the briefing topic multi-select. i18n + the
 * FloatingLabelInput are stubbed. Covers rendering all topics, toggle wiring,
 * the selected-indicator fill, and the custom-topic field for "other".
 *
 * TopicSelector was redesigned to delegate to the canonical `Selector`
 * (mode="multi", presentation="rows"). The indicator is no longer a lucide
 * glyph swap (Square/SquareCheck) — with the default `radio` indicator + multi
 * mode each row renders a checkbox <View>; the SELECTED row fills that box
 * (gets a background-color style), the rest leave it as a hollow outline. The
 * tests below assert that current behavior. Because Selector/SelectorOptionRow
 * pull in reanimated's `Animated.View` (the global stub maps it to a bare 'div',
 * which can't take the array `style` the indicator passes), this file supplies a
 * local reanimated mock whose `Animated.View` drops `style` — matching the
 * other Selector-backed component tests' pattern.
 */
import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('../../lib/theme', async () => (await import('../mocks/rn-ui')).themeMock());
vi.mock('../../lib/accessibility', async () => (await import('../mocks/rn-ui')).accessibilityMock());
vi.mock('../../lib/haptics', async () => (await import('../mocks/rn-ui')).hapticsMock());
vi.mock('lucide-react-native', async () => (await import('../mocks/rn-ui')).lucideMock());
vi.mock('../../components/primitives/A11yText', async () => (await import('../mocks/rn-ui')).a11yTextMock());
// Local reanimated mock: the shared stub renders `Animated.View` as a bare
// 'div' that chokes on the array `style` the Selector indicator passes. Render
// it as a div that ignores `style` (we assert on the indicator box's classes,
// not its animated transform).
vi.mock('react-native-reanimated', async () => {
  const ReactMod = await import('react');
  const identity = <T,>(v: T): T => v;
  const View = ({ style: _style, ...rest }: Record<string, unknown>) =>
    ReactMod.createElement('div', rest);
  const Animated = { createAnimatedComponent: <T,>(C: T): T => C, View };
  return {
    __esModule: true,
    default: Animated,
    useSharedValue: <T,>(v: T) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    withTiming: identity,
    withSpring: identity,
    withDelay: <T,>(_d: number, v: T) => v,
    withSequence: (...a: unknown[]) => a[a.length - 1],
    Easing: { inOut: () => () => 0, out: () => () => 0, ease: () => 0 },
  };
});
vi.mock('../../components/inputs/FloatingLabelInput', () => ({
  FloatingLabelInput: ({ label }: { label: string }) =>
    React.createElement('input', { 'aria-label': label }),
}));

import { TopicSelector, TOPIC_KEYS } from '../../components/briefings/TopicSelector';

afterEach(cleanup);

/**
 * The Selector renders each option as a row whose last child is the indicator
 * box (the multi-mode checkbox <View>). When the option is selected the box is
 * filled — react-native-web emits a `r-backgroundColor-*` class on it; an
 * unselected box has only its outline (no background-color class).
 */
function indicatorIsFilled(row: HTMLElement): boolean {
  const box = row.lastElementChild;
  if (!box) return false;
  return Array.from(box.classList).some((c) => c.startsWith('r-backgroundColor'));
}

function renderSel(props: Partial<React.ComponentProps<typeof TopicSelector>> = {}) {
  const onToggle = vi.fn();
  const onChangeCustomTopic = vi.fn();
  const utils = render(
    <TopicSelector
      selectedTopics={new Set()}
      onToggle={onToggle}
      customTopic=""
      onChangeCustomTopic={onChangeCustomTopic}
      {...props}
    />,
  );
  return { ...utils, onToggle, onChangeCustomTopic };
}

describe('TopicSelector', () => {
  it('renders a row for every topic key', () => {
    const { getByLabelText } = renderSel();
    for (const key of TOPIC_KEYS) {
      const row = getByLabelText(`briefings.topics.${key}`);
      // Each option renders as a checkbox-role row (multi-select).
      expect(row.getAttribute('role')).toBe('checkbox');
    }
  });

  it('toggles a topic on press', () => {
    const { getByLabelText, onToggle } = renderSel();
    fireEvent.click(getByLabelText('briefings.topics.ppe'));
    expect(onToggle).toHaveBeenCalledWith('ppe');
  });

  it('fills the indicator box on the selected row and leaves the rest hollow', () => {
    const { getByLabelText } = renderSel({ selectedTopics: new Set(['ppe']) });
    const ppe = getByLabelText('briefings.topics.ppe');
    const evac = getByLabelText('briefings.topics.evacuation');
    expect(indicatorIsFilled(ppe)).toBe(true);
    expect(indicatorIsFilled(evac)).toBe(false);
  });

  it('reveals the custom-topic input only when "other" is selected', () => {
    const { queryByLabelText, rerender } = renderSel();
    expect(queryByLabelText('თემის დასახელება')).toBeNull();
    rerender(
      <TopicSelector
        selectedTopics={new Set(['other'])}
        onToggle={vi.fn()}
        customTopic=""
        onChangeCustomTopic={vi.fn()}
      />,
    );
    expect(queryByLabelText('თემის დასახელება')).toBeTruthy();
  });
});
