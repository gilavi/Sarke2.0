/**
 * Unit tests for VerdictSelector — the conclusion-step "გადაწყვეტილება" picker.
 * Covers icon resolution precedence (explicit → tone → positional), selection +
 * haptic, the default title, and the error message.
 */
import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

vi.mock('lucide-react-native', async () => (await import('../mocks/rn-ui')).lucideMock());
vi.mock('../../lib/theme', async () => (await import('../mocks/rn-ui')).themeMock());
vi.mock('../../lib/haptics', async () => (await import('../mocks/rn-ui')).hapticsMock());
vi.mock('../../lib/accessibility', async () => (await import('../mocks/rn-ui')).accessibilityMock());
vi.mock('../../components/primitives/A11yText', async () => (await import('../mocks/rn-ui')).a11yTextMock());
// The default title resolves via t('inspections.verdictTitle'); back the mock
// with the real ka.json so the Georgian-string assertion tests the shipped copy.
vi.mock('react-i18next', async () => (await import('../mocks/rn-ui')).i18nKaMock());

import { VerdictSelector, type VerdictOption } from '../../components/inspection-steps/VerdictSelector';
import { haptic } from '../../lib/haptics';
import { Eye } from 'lucide-react-native';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

/** data-icon name rendered inside the button whose aria-label === label. */
function iconFor(container: HTMLElement, label: string): string | null {
  const btn = container.querySelector(`[aria-label="${label}"]`);
  return btn?.querySelector('[data-icon]')?.getAttribute('data-icon') ?? null;
}

describe('VerdictSelector', () => {
  it('renders the default title and each option label', () => {
    const opts: VerdictOption[] = [
      { value: 'ok', label: 'ვარგისია' },
      { value: 'bad', label: 'გამოუსადეგარია' },
    ];
    const { getByText } = render(<VerdictSelector value={null} options={opts} onChange={vi.fn()} />);
    expect(getByText('გადაწყვეტილება')).toBeTruthy();
    expect(getByText('ვარგისია')).toBeTruthy();
    expect(getByText('გამოუსადეგარია')).toBeTruthy();
  });

  it('pressing an option calls onChange and fires a haptic', () => {
    const onChange = vi.fn();
    const opts: VerdictOption[] = [{ value: 'ok', label: 'ვარგისია' }];
    const { getByLabelText } = render(<VerdictSelector value={null} options={opts} onChange={onChange} />);
    fireEvent.click(getByLabelText('ვარგისია'));
    expect(onChange).toHaveBeenCalledWith('ok');
    expect(haptic.light).toHaveBeenCalledTimes(1);
  });

  it('uses positional default icons: first=ShieldCheck, middle=Eye, last=TriangleAlert', () => {
    const opts: VerdictOption[] = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
      { value: 'c', label: 'C' },
    ];
    const { container } = render(<VerdictSelector value={null} options={opts} onChange={vi.fn()} />);
    expect(iconFor(container, 'A')).toBe('ShieldCheck');
    expect(iconFor(container, 'B')).toBe('Eye');
    expect(iconFor(container, 'C')).toBe('TriangleAlert');
  });

  it('maps tone to its icon when no explicit icon is given', () => {
    const opts: VerdictOption[] = [
      { value: 'a', label: 'A', tone: 'danger' },
      { value: 'b', label: 'B', tone: 'caution' },
    ];
    const { container } = render(<VerdictSelector value={null} options={opts} onChange={vi.fn()} />);
    expect(iconFor(container, 'A')).toBe('TriangleAlert');
    expect(iconFor(container, 'B')).toBe('Eye');
  });

  it('an explicit icon overrides tone and positional defaults', () => {
    const opts: VerdictOption[] = [{ value: 'a', label: 'A', tone: 'danger', icon: Eye }];
    const { container } = render(<VerdictSelector value={null} options={opts} onChange={vi.fn()} />);
    expect(iconFor(container, 'A')).toBe('Eye');
  });

  it('shows the error text only when showError is true', () => {
    const opts: VerdictOption[] = [{ value: 'a', label: 'A' }];
    const { queryByText, rerender } = render(
      <VerdictSelector value={null} options={opts} onChange={vi.fn()} />,
    );
    expect(queryByText('აუცილებლად აირჩიეთ სტატუსი.')).toBeNull();
    rerender(
      <VerdictSelector value={null} options={opts} onChange={vi.fn()} showError errorText="აირჩიეთ" />,
    );
    expect(queryByText('აირჩიეთ')).toBeTruthy();
  });

  it('renders the active-value branch without changing the option set', () => {
    const opts: VerdictOption[] = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ];
    // Rendering with a selected value exercises the active styling branch.
    const { getByLabelText } = render(<VerdictSelector value={'b'} options={opts} onChange={vi.fn()} />);
    expect(getByLabelText('A')).toBeTruthy();
    expect(getByLabelText('B')).toBeTruthy();
  });
});
