/**
 * Unit tests for TopicSelector — the briefing topic multi-select. i18n + the
 * FloatingLabelInput are stubbed. Covers rendering all topics, toggle wiring,
 * the selected checkbox glyph swap, and the custom-topic field for "other".
 */
import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('../../lib/theme', async () => (await import('../mocks/rn-ui')).themeMock());
vi.mock('../../lib/accessibility', async () => (await import('../mocks/rn-ui')).accessibilityMock());
vi.mock('lucide-react-native', async () => (await import('../mocks/rn-ui')).lucideMock());
vi.mock('../../components/primitives/A11yText', async () => (await import('../mocks/rn-ui')).a11yTextMock());
vi.mock('../../components/inputs/FloatingLabelInput', () => ({
  FloatingLabelInput: ({ label }: { label: string }) =>
    React.createElement('input', { 'aria-label': label }),
}));

import { TopicSelector, TOPIC_KEYS } from '../../components/briefings/TopicSelector';

afterEach(cleanup);

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
      expect(getByLabelText(`briefings.topics.${key}`)).toBeTruthy();
    }
  });

  it('toggles a topic on press', () => {
    const { getByLabelText, onToggle } = renderSel();
    fireEvent.click(getByLabelText('briefings.topics.ppe'));
    expect(onToggle).toHaveBeenCalledWith('ppe');
  });

  it('shows a checked glyph for selected rows and an empty box otherwise', () => {
    const { getByLabelText } = renderSel({ selectedTopics: new Set(['ppe']) });
    const ppe = getByLabelText('briefings.topics.ppe');
    const evac = getByLabelText('briefings.topics.evacuation');
    expect(ppe.querySelector('[data-icon="SquareCheck"]')).toBeTruthy();
    expect(evac.querySelector('[data-icon="Square"]')).toBeTruthy();
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
