/**
 * Unit tests for SuccessSignatureSection (edit + view modes).
 * Covers: creator signed/awaiting, blank rows, the "add person" row, opening +
 * closing the SignaturesScreen modal from each row, and the view-only list
 * (participant signed/awaiting, eye icon, "view only" tag, no add row).
 */
import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

vi.mock('../../lib/theme', async () => (await import('../mocks/rn-ui')).themeMock());
vi.mock('../../lib/accessibility', async () => (await import('../mocks/rn-ui')).accessibilityMock());
vi.mock('lucide-react-native', async () => (await import('../mocks/rn-ui')).lucideMock());
vi.mock('../../components/primitives/A11yText', async () => (await import('../mocks/rn-ui')).a11yTextMock());
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('../../components/primitives/Badge', () => ({
  Badge: ({ children, variant }: { children: string; variant?: string }) =>
    React.createElement('span', { 'data-badge': variant ?? 'default' }, children),
}));
vi.mock('../../features/signatures', () => ({
  SignaturesScreen: ({ visible, onClose }: { visible: boolean; onClose: () => void }) =>
    React.createElement(
      'div',
      { 'data-testid': 'sig-modal', 'data-visible': String(visible) },
      React.createElement('button', { 'data-testid': 'sig-close', onClick: onClose }, 'x'),
    ),
}));

import { SuccessSignatureSection } from '../../components/success/SuccessSignatureSection';
import type { SignaturesState } from '../../features/signatures';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const fns = {
  setCreatorSignature: vi.fn(),
  clearCreatorSignature: vi.fn(),
  addRow: vi.fn(),
  removeRow: vi.fn(),
  clear: vi.fn(),
};
const state = (creator: boolean, rows: { id: string }[] = []): SignaturesState =>
  ({ creatorSignature: creator ? { pngBase64: 'x', capturedAt: new Date() } : null, additionalRows: rows, ...fns }) as any;

describe('SuccessSignatureSection — edit mode', () => {
  it('shows creator + blank rows + add row, and opens/closes the modal from rows', () => {
    const { getByText, getAllByText, getByTestId, getByLabelText } = render(
      <SuccessSignatureSection mode="edit" signatures={state(true, [{ id: 'r1' }])} creatorName="Giorgi Kheladze" />,
    );
    expect(getByText('Giorgi Kheladze')).toBeTruthy();
    expect(getByText('success.signatures.signed')).toBeTruthy();
    expect(getByText('success.signatures.blankLine')).toBeTruthy();
    expect(getByText('success.signatures.addPerson')).toBeTruthy();
    expect(getByTestId('sig-modal').getAttribute('data-visible')).toBe('false');

    // open from the creator row
    fireEvent.click(getByText('Giorgi Kheladze'));
    expect(getByTestId('sig-modal').getAttribute('data-visible')).toBe('true');
    // close via the modal
    fireEvent.click(getByTestId('sig-close'));
    expect(getByTestId('sig-modal').getAttribute('data-visible')).toBe('false');

    // open from the blank row and from the add-person row
    fireEvent.click(getByText('success.signatures.blankLine'));
    expect(getByTestId('sig-modal').getAttribute('data-visible')).toBe('true');
    fireEvent.click(getByTestId('sig-close'));
    fireEvent.click(getByLabelText('success.signatures.addPerson'));
    expect(getByTestId('sig-modal').getAttribute('data-visible')).toBe('true');
  });

  it('shows the awaiting pill when the creator has not signed', () => {
    const { getAllByText, queryByText } = render(
      <SuccessSignatureSection mode="edit" signatures={state(false)} creatorName="A B" />,
    );
    expect(getAllByText('success.signatures.awaiting').length).toBe(1); // creator awaiting
    expect(queryByText('success.signatures.signed')).toBeNull();
  });

  it('falls back to the "you" label + empty avatar name when creatorName is undefined', () => {
    // creatorName undefined exercises the `creatorName ?? ''` paths (row + modal).
    const { getAllByText } = render(
      <SuccessSignatureSection mode="edit" signatures={state(true)} />,
    );
    // title + subtitle both resolve to the "you" key; avatar initials fall back to "?"
    expect(getAllByText('success.signatures.you').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('?').length).toBeGreaterThanOrEqual(1);
  });
});

describe('SuccessSignatureSection — view mode', () => {
  it('lists participants read-only with the view-only tag and no add row', () => {
    const { getByText, queryByText, getAllByText } = render(
      <SuccessSignatureSection
        mode="view"
        participants={[
          { name: 'Nino Beridze', signed: true },
          { name: 'Davit Lomidze', signed: false },
        ]}
      />,
    );
    expect(getByText('success.signatures.viewOnly')).toBeTruthy();
    expect(getByText('Nino Beridze')).toBeTruthy();
    expect(getByText('Davit Lomidze')).toBeTruthy();
    expect(getByText('success.signatures.signed')).toBeTruthy();
    expect(getByText('success.signatures.awaiting')).toBeTruthy();
    expect(getAllByText('success.signatures.participant').length).toBe(2);
    expect(queryByText('success.signatures.addPerson')).toBeNull();
    // no edit modal mounted in view mode
    expect(queryByText('x')).toBeNull();
  });

  it('renders an empty view list when participants is undefined', () => {
    const { getByText } = render(<SuccessSignatureSection mode="view" />);
    expect(getByText('success.signatures.heading')).toBeTruthy();
  });
});
