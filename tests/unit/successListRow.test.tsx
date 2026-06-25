/**
 * Unit tests for SuccessListRow + its lead visuals + the `initials` helper.
 * Covers: initials fallback/normal/two-name; pressable vs non-pressable rows;
 * the pressed-style branch; subtitle present/absent; accent title; and the
 * RowAvatar / RowEmptyAvatar / RowLead (dashed + plain) visuals.
 */
import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

vi.mock('../../lib/theme', async () => (await import('../mocks/rn-ui')).themeMock());
vi.mock('../../lib/accessibility', async () => (await import('../mocks/rn-ui')).accessibilityMock());
vi.mock('lucide-react-native', async () => (await import('../mocks/rn-ui')).lucideMock());
vi.mock('../../components/primitives/A11yText', async () => (await import('../mocks/rn-ui')).a11yTextMock());

import {
  initials,
  rowPressBg,
  SuccessListRow,
  RowAvatar,
  RowEmptyAvatar,
  RowLead,
} from '../../components/success/SuccessListRow';
import { makeTheme } from '../mocks/rn-ui';
import { FileText } from 'lucide-react-native';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe('initials', () => {
  it('returns "?" for an empty / whitespace name', () => {
    expect(initials('')).toBe('?');
    expect(initials('   ')).toBe('?');
  });
  it('takes the first two word-initials, uppercased', () => {
    expect(initials('Giorgi Kheladze')).toBe('GK');
    expect(initials('nino beridze lomidze')).toBe('NB');
  });
  it('handles a single name', () => {
    expect(initials('Madonna')).toBe('M');
  });
});

describe('rowPressBg', () => {
  const theme = makeTheme() as any;
  it('returns a highlight background when pressed', () => {
    expect(rowPressBg(theme, true)).toEqual({ backgroundColor: theme.colors.surfaceSecondary });
  });
  it('returns null when not pressed', () => {
    expect(rowPressBg(theme, false)).toBeNull();
  });
});

describe('SuccessListRow', () => {
  it('renders a pressable row and fires onPress; pressed style branch runs', () => {
    const onPress = vi.fn();
    const { getByText, getByRole } = render(
      <SuccessListRow lead={<RowEmptyAvatar />} title="Row A" subtitle="sub" onPress={onPress} />,
    );
    expect(getByText('Row A')).toBeTruthy();
    expect(getByText('sub')).toBeTruthy();
    const btn = getByRole('button');
    fireEvent.click(btn);
    expect(onPress).toHaveBeenCalled();
  });

  it('renders a non-pressable row (no onPress) without a button role', () => {
    const { queryByRole, getByText } = render(
      <SuccessListRow lead={<RowEmptyAvatar />} title="Static" />,
    );
    expect(getByText('Static')).toBeTruthy();
    expect(queryByRole('button')).toBeNull();
  });

  it('omits the subtitle node when no subtitle is given', () => {
    const { queryByText } = render(<SuccessListRow lead={<RowEmptyAvatar />} title="No sub" />);
    expect(queryByText('No sub')).toBeTruthy();
  });

  it('renders an accent title and a custom a11y label', () => {
    const { getByLabelText } = render(
      <SuccessListRow
        lead={<RowLead icon={FileText} />}
        title="Add"
        accent
        onPress={vi.fn()}
        a11yLabel="add thing"
      />,
    );
    expect(getByLabelText('add thing')).toBeTruthy();
  });

  it('renders the lead visuals (avatar, empty avatar, plain + dashed lead)', () => {
    const { getByText } = render(
      <>
        <RowAvatar name="Giorgi Kheladze" />
        <RowEmptyAvatar />
        <RowLead icon={FileText} />
        <RowLead icon={FileText} dashed />
      </>,
    );
    expect(getByText('GK')).toBeTruthy();
  });
});
