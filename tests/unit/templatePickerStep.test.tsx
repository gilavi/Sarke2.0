/**
 * Unit tests for TemplatePickerStep — the inspection-type grid (first step of
 * the start flow). The Selector + InspectionTypeAvatar are stubbed (Selector to
 * a button-per-option so taps are queryable; the grid card itself is covered by
 * selectorGrid.test.tsx). `useTemplates` is stubbed per-test to drive the
 * three-state loading guard.
 *
 * Covers: only `is_system` templates populate the grid; tapping forwards the
 * full template object; the confirmed-empty state; and the skeleton while the
 * query has not produced a real answer.
 */
import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

vi.mock('../../lib/theme', async () => (await import('../mocks/rn-ui')).themeMock());
vi.mock('../../lib/accessibility', async () => (await import('../mocks/rn-ui')).accessibilityMock());
vi.mock('../../components/primitives/A11yText', async () => (await import('../mocks/rn-ui')).a11yTextMock());
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

// InspectionTypeAvatar require()s PNG assets — stub it to a plain marker.
vi.mock('../../components/InspectionTypeAvatar', () => ({
  InspectionTypeAvatar: ({ category }: { category?: string | null }) =>
    React.createElement('span', { 'data-avatar': category ?? 'none' }),
}));

// Stub Selector to a button per option so taps are easy to drive; the real grid
// card is exercised in selectorGrid.test.tsx. Also exposes a "bogus" trigger
// that emits an unknown id, to drive the defensive not-found branch.
vi.mock('../../components/ui/Selector', () => ({
  Selector: ({
    options,
    onChange,
  }: {
    options: { value: string; label?: string }[];
    onChange: (v: string) => void;
  }) =>
    React.createElement(
      'div',
      { 'data-testid': 'selector' },
      [
        ...options.map((o) =>
          React.createElement(
            'button',
            { key: o.value, 'data-testid': `opt-${o.value}`, onClick: () => onChange(o.value) },
            o.label,
          ),
        ),
        React.createElement(
          'button',
          { key: '__bogus__', 'data-testid': 'opt-bogus', onClick: () => onChange('__bogus__') },
          'bogus',
        ),
      ],
    ),
}));

const useTemplatesMock = vi.fn();
vi.mock('../../lib/apiHooks', () => ({ useTemplates: () => useTemplatesMock() }));

import { TemplatePickerStep } from '../../components/inspection-steps/TemplatePickerStep';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const SYS = { id: 's1', name: 'ციცხვიანი დამტვირთველის შემოწმების აქტი', category: 'bobcat', is_system: true };
const CUSTOM = { id: 'c1', name: 'My custom', category: null, is_system: false };

describe('TemplatePickerStep', () => {
  it('renders only is_system templates as options, with the short display name', () => {
    useTemplatesMock.mockReturnValue({ data: [SYS, CUSTOM], isFetched: true, isFetching: false });
    const { getByTestId, queryByTestId, getByText } = render(
      <TemplatePickerStep selectedId={null} onSelect={vi.fn()} />,
    );
    expect(getByTestId('opt-s1')).toBeTruthy();
    expect(queryByTestId('opt-c1')).toBeNull(); // custom excluded
    // inspectionDisplayName maps the formal name → "ციცხვიანი დამტვირთველი"
    expect(getByText('ციცხვიანი დამტვირთველი')).toBeTruthy();
  });

  it('forwards the full template object on tap', () => {
    useTemplatesMock.mockReturnValue({ data: [SYS], isFetched: true, isFetching: false });
    const onSelect = vi.fn();
    const { getByTestId } = render(<TemplatePickerStep selectedId={null} onSelect={onSelect} />);
    fireEvent.click(getByTestId('opt-s1'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 's1', category: 'bobcat' }));
  });

  it('ignores a selection whose id matches no template (defensive)', () => {
    useTemplatesMock.mockReturnValue({ data: [SYS], isFetched: true, isFetching: false });
    const onSelect = vi.fn();
    const { getByTestId } = render(<TemplatePickerStep selectedId={null} onSelect={onSelect} />);
    fireEvent.click(getByTestId('opt-bogus'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows the empty state when the query settles with no system templates', () => {
    useTemplatesMock.mockReturnValue({ data: [CUSTOM], isFetched: true, isFetching: false });
    const { getByText, queryByTestId } = render(<TemplatePickerStep selectedId={null} onSelect={vi.fn()} />);
    expect(getByText('errors.notFoundTemplate')).toBeTruthy();
    expect(queryByTestId('selector')).toBeNull();
  });

  it('shows the skeleton (no empty state, no selector) while the query is in-flight with a stale empty cache', () => {
    useTemplatesMock.mockReturnValue({ data: [], isFetched: false, isFetching: true });
    const { queryByText, queryByTestId } = render(<TemplatePickerStep selectedId={null} onSelect={vi.fn()} />);
    expect(queryByTestId('selector')).toBeNull();
    expect(queryByText('errors.notFoundTemplate')).toBeNull();
  });
});
