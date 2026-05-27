/**
 * Unit tests for ChecklistStep + ChecklistRow.
 *
 * react-native is aliased to react-native-web (see vitest.config.ts), so
 * Pressable renders as a div, Text as a span, and onPress fires on click.
 */
import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ChecklistStep } from '../../components/inspection-steps/ChecklistStep';
import type { ChecklistItem, ChecklistItemState } from '../../components/inspection-steps/ChecklistStep';

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('react-native-keyboard-controller', () => ({
  KeyboardAwareScrollView: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'scroll-view' }, children),
}));

vi.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name }: { name: string }) =>
    React.createElement('span', { 'data-icon': name }),
}));

vi.mock('../../components/primitives/A11yText', () => ({
  A11yText: ({ children, style: _s, numberOfLines: _n, ...rest }: Record<string, unknown>) =>
    React.createElement('span', rest as Record<string, unknown>, children as React.ReactNode),
}));

vi.mock('../../components/inputs/FloatingLabelInput', () => ({
  FloatingLabelInput: ({ label, value, onChangeText }: { label: string; value: string; onChangeText: (v: string) => void }) =>
    React.createElement('input', {
      placeholder: label,
      value,
      'aria-label': label,
      readOnly: true,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChangeText(e.target.value),
    }),
}));

vi.mock('../../lib/theme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        ink: '#000',
        inkSoft: '#666',
        inkFaint: '#999',
        accent: '#007aff',
        accentSoft: '#e5f2ff',
        hairline: '#e0e0e0',
        danger: '#dc2626',
        semantic: { success: '#22c55e', warning: '#f59e0b' },
      },
    },
  }),
}));

vi.mock('../../lib/accessibility', () => ({
  a11y: (label: string) => ({ accessibilityLabel: label }),
}));

// ── Fixtures ───────────────────────────────────────────────────────────────────

const ITEMS: ChecklistItem[] = [
  { id: 'i1', description: 'საბურავის მდგომარეობა', section: 'A — თვლები' },
  { id: 'i2', description: 'სამუხრუჭე პედალი',      section: 'A — თვლები' },
  { id: 'i3', description: 'ჰიდრავლიკური ცილინდრები', section: 'B — ჰიდრავლიკა' },
];

function makeStates(overrides: Partial<ChecklistItemState>[] = []): ChecklistItemState[] {
  return ITEMS.map((item, i) => ({
    id: item.id,
    result: null,
    comment: null,
    photo_paths: [],
    ...overrides[i],
  }));
}

afterEach(cleanup);

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('ChecklistStep — item rendering', () => {
  it('renders all item descriptions', () => {
    const { getByText } = render(
      <ChecklistStep items={ITEMS} states={makeStates()} onStateChange={vi.fn()} />,
    );
    expect(getByText('საბურავის მდგომარეობა')).toBeTruthy();
    expect(getByText('სამუხრუჭე პედალი')).toBeTruthy();
    expect(getByText('ჰიდრავლიკური ცილინდრები')).toBeTruthy();
  });

  it('renders verdict labels 1, 2, 3 for each item', () => {
    const { getAllByText } = render(
      <ChecklistStep items={ITEMS} states={makeStates()} onStateChange={vi.fn()} />,
    );
    expect(getAllByText('1').length).toBe(ITEMS.length);
    expect(getAllByText('2').length).toBe(ITEMS.length);
    expect(getAllByText('3').length).toBe(ITEMS.length);
  });

  it('does not render ✓, ⚠, or ✗ symbols', () => {
    const { container } = render(
      <ChecklistStep items={ITEMS} states={makeStates()} onStateChange={vi.fn()} />,
    );
    expect(container.textContent).not.toContain('✓');
    expect(container.textContent).not.toContain('⚠');
    expect(container.textContent).not.toContain('✗');
  });
});

describe('ChecklistStep — verdict button interactions', () => {
  it('calls onStateChange with result=good when "1" is clicked', () => {
    const onStateChange = vi.fn();
    const { getAllByText } = render(
      <ChecklistStep items={ITEMS} states={makeStates()} onStateChange={onStateChange} />,
    );
    fireEvent.click(getAllByText('1')[0]);
    expect(onStateChange).toHaveBeenCalledWith('i1', { result: 'good' });
  });

  it('calls onStateChange with result=deficient when "2" is clicked', () => {
    const onStateChange = vi.fn();
    const { getAllByText } = render(
      <ChecklistStep items={ITEMS} states={makeStates()} onStateChange={onStateChange} />,
    );
    fireEvent.click(getAllByText('2')[0]);
    expect(onStateChange).toHaveBeenCalledWith('i1', { result: 'deficient' });
  });

  it('calls onStateChange with result=unusable when "3" is clicked', () => {
    const onStateChange = vi.fn();
    const { getAllByText } = render(
      <ChecklistStep items={ITEMS} states={makeStates()} onStateChange={onStateChange} />,
    );
    fireEvent.click(getAllByText('3')[0]);
    expect(onStateChange).toHaveBeenCalledWith('i1', { result: 'unusable' });
  });

  it('toggles result to null when the active verdict button is clicked again', () => {
    const onStateChange = vi.fn();
    const states = makeStates([{ result: 'good' }]);
    const { getAllByText } = render(
      <ChecklistStep items={ITEMS} states={states} onStateChange={onStateChange} />,
    );
    fireEvent.click(getAllByText('1')[0]);
    expect(onStateChange).toHaveBeenCalledWith('i1', { result: null });
  });

  it('calls onStateChange for the correct item when a later-row button is clicked', () => {
    const onStateChange = vi.fn();
    const { getAllByText } = render(
      <ChecklistStep items={ITEMS} states={makeStates()} onStateChange={onStateChange} />,
    );
    // Click the "2" button in the third row (index 2)
    fireEvent.click(getAllByText('2')[2]);
    expect(onStateChange).toHaveBeenCalledWith('i3', { result: 'deficient' });
  });
});

describe('ChecklistStep — section headers', () => {
  it('does not render section headers by default', () => {
    const { queryByText } = render(
      <ChecklistStep items={ITEMS} states={makeStates()} onStateChange={vi.fn()} />,
    );
    expect(queryByText('A — თვლები')).toBeNull();
    expect(queryByText('B — ჰიდრავლიკა')).toBeNull();
  });

  it('renders section headers when showSectionHeaders=true', () => {
    const { getByText } = render(
      <ChecklistStep items={ITEMS} states={makeStates()} onStateChange={vi.fn()} showSectionHeaders />,
    );
    expect(getByText('A — თვლები')).toBeTruthy();
    expect(getByText('B — ჰიდრავლიკა')).toBeTruthy();
  });

  it('renders each unique section header exactly once', () => {
    const { getAllByText } = render(
      <ChecklistStep items={ITEMS} states={makeStates()} onStateChange={vi.fn()} showSectionHeaders />,
    );
    // items i1 and i2 share "A — თვლები", so the header appears only once
    expect(getAllByText('A — თვლები').length).toBe(1);
  });
});

describe('ChecklistStep — comment button', () => {
  it('hides comment button when showCommentButton=false', () => {
    const { queryAllByLabelText } = render(
      <ChecklistStep items={ITEMS} states={makeStates()} onStateChange={vi.fn()} showCommentButton={false} />,
    );
    expect(queryAllByLabelText('კომენტარი').length).toBe(0);
  });

  it('shows a comment button per item by default', () => {
    const { getAllByLabelText } = render(
      <ChecklistStep items={ITEMS} states={makeStates()} onStateChange={vi.fn()} />,
    );
    expect(getAllByLabelText('კომენტარი').length).toBe(ITEMS.length);
  });

  it('expands the comment input when the comment button is clicked', () => {
    const { getAllByLabelText, getByLabelText } = render(
      <ChecklistStep items={ITEMS} states={makeStates()} onStateChange={vi.fn()} />,
    );
    // Before clicking: no comment input visible
    expect(() => getByLabelText('კომენტარი', { selector: 'input' })).toThrow();
    // Click the first item's comment toggle
    fireEvent.click(getAllByLabelText('კომენტარი')[0]);
    // After clicking: FloatingLabelInput appears with placeholder "კომენტარი"
    const input = document.querySelector('input[placeholder="კომენტარი"]');
    expect(input).not.toBeNull();
  });
});

describe('ChecklistStep — photo button', () => {
  it('renders a photo button per item when onPhotoPress is provided', () => {
    const { getAllByLabelText } = render(
      <ChecklistStep items={ITEMS} states={makeStates()} onStateChange={vi.fn()} onPhotoPress={vi.fn()} />,
    );
    expect(getAllByLabelText('ფოტო').length).toBe(ITEMS.length);
  });

  it('does not render photo buttons when onPhotoPress is omitted', () => {
    const { queryAllByLabelText } = render(
      <ChecklistStep items={ITEMS} states={makeStates()} onStateChange={vi.fn()} />,
    );
    expect(queryAllByLabelText('ფოტო').length).toBe(0);
  });

  it('shows photo count when item has photos', () => {
    const states = makeStates([{ photo_paths: ['p/1.jpg', 'p/2.jpg'] }]);
    const { getAllByLabelText } = render(
      <ChecklistStep items={ITEMS} states={states} onStateChange={vi.fn()} onPhotoPress={vi.fn()} />,
    );
    // The first item's photo button should contain a count text node with "2"
    const photoBtns = getAllByLabelText('ფოტო');
    expect(photoBtns[0].textContent).toContain('2');
  });

  it('calls onPhotoPress with the correct item id', () => {
    const onPhotoPress = vi.fn();
    const { getAllByLabelText } = render(
      <ChecklistStep items={ITEMS} states={makeStates()} onStateChange={vi.fn()} onPhotoPress={onPhotoPress} />,
    );
    fireEvent.click(getAllByLabelText('ფოტო')[1]);
    expect(onPhotoPress).toHaveBeenCalledWith('i2');
  });
});

describe('ChecklistStep — footer slot', () => {
  it('renders the footer below the items', () => {
    const { getByText } = render(
      <ChecklistStep
        items={ITEMS}
        states={makeStates()}
        onStateChange={vi.fn()}
        footer={React.createElement('div', null, 'footer content')}
      />,
    );
    expect(getByText('footer content')).toBeTruthy();
  });
});
