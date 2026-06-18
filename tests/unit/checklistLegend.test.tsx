/**
 * Unit tests for ChecklistLegend — a stateless monochrome key pairing each
 * answer glyph (icon or short text) with its label.
 */
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('lucide-react-native', async () => (await import('../mocks/rn-ui')).lucideMock());
vi.mock('../../lib/theme', async () => (await import('../mocks/rn-ui')).themeMock());
vi.mock('../../components/primitives/A11yText', async () => (await import('../mocks/rn-ui')).a11yTextMock());

import { ChecklistLegend, type ChecklistLegendItem } from '../../components/inspection-parts/ChecklistLegend';
import { Check, TriangleAlert } from 'lucide-react-native';

afterEach(cleanup);

const ITEMS: ChecklistLegendItem[] = [
  { icon: Check, label: 'ვარგისია' },
  { icon: TriangleAlert, label: 'ხარვეზი' },
  { shortLabel: 'N/A', label: 'არ ეხება' },
];

describe('ChecklistLegend', () => {
  it('renders a label for every item', () => {
    const { getByText } = render(<ChecklistLegend items={ITEMS} />);
    expect(getByText('ვარგისია')).toBeTruthy();
    expect(getByText('ხარვეზი')).toBeTruthy();
    expect(getByText('არ ეხება')).toBeTruthy();
  });

  it('renders the icon glyph for icon items', () => {
    const { container } = render(<ChecklistLegend items={ITEMS} />);
    expect(container.querySelector('[data-icon="Check"]')).toBeTruthy();
    expect(container.querySelector('[data-icon="TriangleAlert"]')).toBeTruthy();
  });

  it('renders the short text glyph when no icon is provided', () => {
    const { getByText } = render(<ChecklistLegend items={ITEMS} />);
    expect(getByText('N/A')).toBeTruthy();
  });

  it('renders nothing for an empty list', () => {
    const { container } = render(<ChecklistLegend items={[]} />);
    expect(container.querySelector('[data-icon]')).toBeNull();
  });
});
