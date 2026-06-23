/**
 * Unit tests for QuantitySelector — preset chips + a clamped custom numeric
 * field. Covers preset selection (+ haptic), the active-chip rule, digit
 * filtering, clamping to [min,max], and the "a typed preset hands ownership
 * back to the chip" behaviour.
 */
import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

// Resolve the i18n keys this component reads to their real ka.json values so
// the a11y labels match production ("რაოდენობა", "სხვა") rather than raw keys.
vi.mock('react-i18next', () => {
  const ka: Record<string, string> = {
    'inputs.quantityLabel': 'რაოდენობა',
    'inputs.otherA11y': 'სხვა',
    'inputs.otherPlaceholder': 'სხვა',
  };
  return { useTranslation: () => ({ t: (k: string) => ka[k] ?? k }) };
});
vi.mock('../../lib/theme', async () => (await import('../mocks/rn-ui')).themeMock());
vi.mock('../../lib/haptics', async () => (await import('../mocks/rn-ui')).hapticsMock());
vi.mock('../../components/primitives/A11yText', async () => (await import('../mocks/rn-ui')).a11yTextMock());

import { QuantitySelector } from '../../components/inputs/QuantitySelector';
import { haptic } from '../../lib/haptics';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

function renderSel(props: Partial<React.ComponentProps<typeof QuantitySelector>> = {}) {
  const onChange = vi.fn();
  const utils = render(<QuantitySelector value={1} onChange={onChange} {...props} />);
  return { ...utils, onChange };
}

describe('QuantitySelector', () => {
  it('renders a chip per preset plus the custom field', () => {
    const { getByLabelText } = renderSel({ presets: [1, 2, 3] });
    expect(getByLabelText('რაოდენობა 1')).toBeTruthy();
    expect(getByLabelText('რაოდენობა 2')).toBeTruthy();
    expect(getByLabelText('რაოდენობა 3')).toBeTruthy();
    expect(getByLabelText('რაოდენობა - სხვა')).toBeTruthy();
  });

  it('selecting a preset calls onChange and fires a light haptic', () => {
    const { getByLabelText, onChange } = renderSel({ presets: [1, 2, 3], value: 1 });
    fireEvent.click(getByLabelText('რაოდენობა 3'));
    expect(onChange).toHaveBeenCalledWith(3);
    expect(haptic.light).toHaveBeenCalledTimes(1);
  });

  it('treats a preset value as a chip selection, leaving the custom field empty', () => {
    // value=2 is a preset → the custom field stays empty (customActive=false),
    // which is the observable consequence of the active-chip logic.
    const { getByLabelText } = renderSel({ presets: [1, 2, 3], value: 2 });
    expect(getByLabelText('რაოდენობა - სხვა')).toHaveValue('');
  });

  it('shows a custom value in the field when value is not a preset', () => {
    const { getByLabelText } = renderSel({ presets: [1, 2, 3], value: 7 });
    expect(getByLabelText('რაოდენობა - სხვა')).toHaveValue('7');
  });

  it('typing a custom number clamps to max and reports it', () => {
    const { getByLabelText, onChange } = renderSel({ presets: [1, 2], min: 1, max: 10, value: 1 });
    fireEvent.change(getByLabelText('რაოდენობა - სხვა'), { target: { value: '50' } });
    expect(onChange).toHaveBeenCalledWith(10); // clamped to max
  });

  it('filters non-digits before parsing', () => {
    const { getByLabelText, onChange } = renderSel({ presets: [1, 2], min: 1, max: 99, value: 1 });
    fireEvent.change(getByLabelText('რაოდენობა - სხვა'), { target: { value: '4a' } });
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('typing a value that equals a preset hands ownership back to the chip', () => {
    const { getByLabelText, onChange } = renderSel({ presets: [1, 2, 5], min: 1, max: 99, value: 7 });
    fireEvent.change(getByLabelText('რაოდენობა - სხვა'), { target: { value: '5' } });
    expect(onChange).toHaveBeenCalledWith(5);
    // custom field clears because 5 is a preset
    expect(getByLabelText('რაოდენობა - სხვა')).toHaveValue('');
  });

  it('clearing the custom field does not call onChange', () => {
    const { getByLabelText, onChange } = renderSel({ presets: [1, 2], value: 7 });
    fireEvent.change(getByLabelText('რაოდენობა - სხვა'), { target: { value: '' } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('honours a custom accessibility label prefix', () => {
    const { getByLabelText } = renderSel({ presets: [1], accessibilityLabelPrefix: 'ქამრები' });
    expect(getByLabelText('ქამრები 1')).toBeTruthy();
    expect(getByLabelText('ქამრები - სხვა')).toBeTruthy();
  });
});
