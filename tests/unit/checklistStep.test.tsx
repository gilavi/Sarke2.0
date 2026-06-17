/**
 * Unit tests for ChecklistStep + ChecklistRow (post unified-checklist redesign).
 *
 * react-native is aliased to react-native-web (see vitest.config.ts). The heavy
 * leaf row (ChecklistItemRow → StatusChip → reanimated + HelpIcon) is mocked to
 * a plain button-per-option so we test the ChecklistStep/ChecklistRow wiring:
 * item → rows, section headers, the legend, and onStateChange({ result }).
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

// Stand-in for the shared row: one button per option, replicating its tap-to-
// toggle (tapping the selected option clears to null) so we can assert wiring.
vi.mock('../../components/inspection-parts/ChecklistItemRow', () => ({
  ChecklistItemRow: ({
    label,
    options,
    value,
    onChange,
  }: {
    label: string;
    options: { value: string; a11yLabel: string }[];
    value: string | null;
    onChange: (v: string | null) => void;
  }) =>
    React.createElement(
      'div',
      { 'data-row': label },
      React.createElement('span', null, label),
      ...options.map(o =>
        React.createElement(
          'button',
          {
            key: o.value,
            'data-result': o.value,
            'aria-label': o.a11yLabel,
            'aria-pressed': value === o.value,
            onClick: () => onChange(value === o.value ? null : o.value),
          },
          o.value,
        ),
      ),
    ),
}));

vi.mock('../../lib/theme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        ink: '#000', inkSoft: '#666', inkFaint: '#999',
        surface: '#fff', subtleSurface: '#f2f2f2', hairline: '#e0e0e0',
        inverse: { background: '#000', ink: '#fff' },
      },
      radius: { md: 12 },
    },
  }),
}));

// ── Fixtures ───────────────────────────────────────────────────────────────────

const ITEMS: ChecklistItem[] = [
  { id: 'i1', description: 'საბურავის მდგომარეობა', section: 'A - თვლები' },
  { id: 'i2', description: 'სამუხრუჭე პედალი',      section: 'A - თვლები' },
  { id: 'i3', description: 'ჰიდრავლიკური ცილინდრები', section: 'B - ჰიდრავლიკა' },
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

describe('ChecklistStep - item rendering', () => {
  it('renders all item descriptions', () => {
    const { getByText } = render(
      <ChecklistStep items={ITEMS} states={makeStates()} onStateChange={vi.fn()} />,
    );
    expect(getByText('საბურავის მდგომარეობა')).toBeTruthy();
    expect(getByText('სამუხრუჭე პედალი')).toBeTruthy();
    expect(getByText('ჰიდრავლიკური ცილინდრები')).toBeTruthy();
  });

  it('renders three result chips (good/deficient/unusable) per item', () => {
    const { container } = render(
      <ChecklistStep items={ITEMS} states={makeStates()} onStateChange={vi.fn()} />,
    );
    expect(container.querySelectorAll('button[data-result="good"]').length).toBe(ITEMS.length);
    expect(container.querySelectorAll('button[data-result="deficient"]').length).toBe(ITEMS.length);
    expect(container.querySelectorAll('button[data-result="unusable"]').length).toBe(ITEMS.length);
  });

  it('renders the monochrome legend (ვარგისია / ხარვეზი / გამოუსადეგარია)', () => {
    const { getByText } = render(
      <ChecklistStep items={ITEMS} states={makeStates()} onStateChange={vi.fn()} />,
    );
    expect(getByText('ვარგისია')).toBeTruthy();
    expect(getByText('ხარვეზი')).toBeTruthy();
    expect(getByText('გამოუსადეგარია')).toBeTruthy();
  });
});

describe('ChecklistStep - result interactions', () => {
  function clickResult(container: HTMLElement, rowIdx: number, result: string) {
    fireEvent.click(container.querySelectorAll(`button[data-result="${result}"]`)[rowIdx]);
  }

  it('calls onStateChange with each result value', () => {
    const onStateChange = vi.fn();
    const { container } = render(
      <ChecklistStep items={ITEMS} states={makeStates()} onStateChange={onStateChange} />,
    );
    clickResult(container, 0, 'good');
    expect(onStateChange).toHaveBeenCalledWith('i1', { result: 'good' });
    clickResult(container, 0, 'deficient');
    expect(onStateChange).toHaveBeenCalledWith('i1', { result: 'deficient' });
    clickResult(container, 0, 'unusable');
    expect(onStateChange).toHaveBeenCalledWith('i1', { result: 'unusable' });
  });

  it('toggles result to null when the active chip is clicked again', () => {
    const onStateChange = vi.fn();
    const { container } = render(
      <ChecklistStep items={ITEMS} states={makeStates([{ result: 'good' }])} onStateChange={onStateChange} />,
    );
    clickResult(container, 0, 'good');
    expect(onStateChange).toHaveBeenCalledWith('i1', { result: null });
  });

  it('targets the correct item when a later-row chip is clicked', () => {
    const onStateChange = vi.fn();
    const { container } = render(
      <ChecklistStep items={ITEMS} states={makeStates()} onStateChange={onStateChange} />,
    );
    clickResult(container, 2, 'deficient');
    expect(onStateChange).toHaveBeenCalledWith('i3', { result: 'deficient' });
  });
});

describe('ChecklistStep - no per-row notes/photos', () => {
  it('renders no comment or photo controls (detail moved to the conclusion step)', () => {
    const { queryAllByLabelText } = render(
      <ChecklistStep items={ITEMS} states={makeStates()} onStateChange={vi.fn()} onPhotoPress={vi.fn()} />,
    );
    expect(queryAllByLabelText('კომენტარი').length).toBe(0);
    expect(queryAllByLabelText('ფოტო').length).toBe(0);
  });
});

describe('ChecklistStep - section headers', () => {
  it('does not render section headers by default', () => {
    const { queryByText } = render(
      <ChecklistStep items={ITEMS} states={makeStates()} onStateChange={vi.fn()} />,
    );
    expect(queryByText('A - თვლები')).toBeNull();
    expect(queryByText('B - ჰიდრავლიკა')).toBeNull();
  });

  it('renders section headers when showSectionHeaders=true', () => {
    const { getByText } = render(
      <ChecklistStep items={ITEMS} states={makeStates()} onStateChange={vi.fn()} showSectionHeaders />,
    );
    expect(getByText('A - თვლები')).toBeTruthy();
    expect(getByText('B - ჰიდრავლიკა')).toBeTruthy();
  });

  it('renders each unique section header exactly once', () => {
    const { getAllByText } = render(
      <ChecklistStep items={ITEMS} states={makeStates()} onStateChange={vi.fn()} showSectionHeaders />,
    );
    expect(getAllByText('A - თვლები').length).toBe(1);
  });
});

describe('ChecklistStep - footer slot', () => {
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
