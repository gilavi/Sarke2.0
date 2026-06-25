/**
 * Unit tests for SuccessCertificateSection. Covers: attached certs render with
 * the "attached" pill + subtitle, tapping a cert fires onOpen(id), the add row
 * fires onAdd, and the empty-list branch (add row becomes the first row).
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

import { SuccessCertificateSection } from '../../components/success/SuccessCertificateSection';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe('SuccessCertificateSection', () => {
  it('renders attached certs and fires onOpen / onAdd', () => {
    const onOpen = vi.fn();
    const onAdd = vi.fn();
    const { getByText } = render(
      <SuccessCertificateSection
        items={[{ id: 'c1', title: 'ISO 45001', subtitle: 'safety' }]}
        onOpen={onOpen}
        onAdd={onAdd}
      />,
    );
    expect(getByText('success.certificates.heading')).toBeTruthy();
    expect(getByText('ISO 45001')).toBeTruthy();
    expect(getByText('safety')).toBeTruthy();
    expect(getByText('success.certificates.attached')).toBeTruthy();

    fireEvent.click(getByText('ISO 45001'));
    expect(onOpen).toHaveBeenCalledWith('c1');

    fireEvent.click(getByText('success.certificates.add'));
    expect(onAdd).toHaveBeenCalled();
  });

  it('renders just the add row when there are no certificates', () => {
    const onAdd = vi.fn();
    const { getByText, queryByText } = render(
      <SuccessCertificateSection items={[]} onOpen={vi.fn()} onAdd={onAdd} />,
    );
    expect(getByText('success.certificates.add')).toBeTruthy();
    expect(queryByText('success.certificates.attached')).toBeNull();
    fireEvent.click(getByText('success.certificates.add'));
    expect(onAdd).toHaveBeenCalled();
  });
});
