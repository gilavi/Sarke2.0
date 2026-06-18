/**
 * Unit tests for ChecklistItemRow — a label (+ optional help) and a cluster of
 * StatusChips. StatusChip is rendered for real (reanimated/accessibility
 * stubbed); HelpIcon is mocked. Covers select/clear toggling, editable label,
 * description + help conditionals, and icon-vs-shortLabel rendering.
 */
import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

// react-native-reanimated is aliased to an inert stub in vitest.config.ts.
vi.mock('lucide-react-native', async () => (await import('../mocks/rn-ui')).lucideMock());
vi.mock('../../lib/theme', async () => (await import('../mocks/rn-ui')).themeMock());
vi.mock('../../lib/haptics', async () => (await import('../mocks/rn-ui')).hapticsMock());
vi.mock('../../lib/accessibility', async () => (await import('../mocks/rn-ui')).accessibilityMock());
vi.mock('../../components/primitives/A11yText', async () => (await import('../mocks/rn-ui')).a11yTextMock());
vi.mock('../../components/ScaffoldHelpSheet', () => ({
  HelpIcon: ({ onPress }: { onPress: () => void }) =>
    React.createElement('button', { 'data-testid': 'help', onClick: onPress }, '?'),
}));

import { ChecklistItemRow, type ChecklistRowOption } from '../../components/inspection-parts/ChecklistItemRow';
import { Check, X } from 'lucide-react-native';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const OPTS: ChecklistRowOption[] = [
  { value: 'good', icon: Check, a11yLabel: 'გამართული' },
  { value: 'bad', icon: X, a11yLabel: 'გაუმართავი' },
  { value: 'na', shortLabel: 'N/A', a11yLabel: 'არ ეხება' },
];

describe('ChecklistItemRow', () => {
  it('renders the label and description', () => {
    const { getByText } = render(
      <ChecklistItemRow label="მხრის ღვედები" description="შეამოწმეთ ნაკერები" options={OPTS} value={null} onChange={vi.fn()} />,
    );
    expect(getByText('მხრის ღვედები')).toBeTruthy();
    expect(getByText('შეამოწმეთ ნაკერები')).toBeTruthy();
  });

  it('selecting an option calls onChange with its value', () => {
    const onChange = vi.fn();
    const { getByLabelText } = render(
      <ChecklistItemRow label="x" options={OPTS} value={null} onChange={onChange} />,
    );
    fireEvent.click(getByLabelText('გამართული'));
    expect(onChange).toHaveBeenCalledWith('good');
  });

  it('tapping the already-selected option clears it to null', () => {
    const onChange = vi.fn();
    const { getByLabelText } = render(
      <ChecklistItemRow label="x" options={OPTS} value="good" onChange={onChange} />,
    );
    fireEvent.click(getByLabelText('გამართული'));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('renders an icon for icon options and text for shortLabel options', () => {
    const { container, getByText } = render(
      <ChecklistItemRow label="x" options={OPTS} value={null} onChange={vi.fn()} />,
    );
    expect(container.querySelector('[data-icon="Check"]')).toBeTruthy();
    expect(container.querySelector('[data-icon="X"]')).toBeTruthy();
    expect(getByText('N/A')).toBeTruthy();
  });

  it('renders a help control only when onHelp is provided', () => {
    const onHelp = vi.fn();
    const { getByTestId, rerender, queryByTestId } = render(
      <ChecklistItemRow label="x" options={OPTS} value={null} onChange={vi.fn()} onHelp={onHelp} />,
    );
    fireEvent.click(getByTestId('help'));
    expect(onHelp).toHaveBeenCalled();

    rerender(<ChecklistItemRow label="x" options={OPTS} value={null} onChange={vi.fn()} />);
    expect(queryByTestId('help')).toBeNull();
  });

  it('renders a text input when editableLabel is provided', () => {
    const onChange = vi.fn();
    const { getByDisplayValue } = render(
      <ChecklistItemRow
        label="ignored"
        editableLabel={{ value: 'custom row', onChange }}
        options={OPTS}
        value={null}
        onChange={vi.fn()}
      />,
    );
    const input = getByDisplayValue('custom row');
    fireEvent.change(input, { target: { value: 'renamed' } });
    expect(onChange).toHaveBeenCalledWith('renamed');
  });
});
