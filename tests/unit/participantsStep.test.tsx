/**
 * Unit tests for ParticipantsStep — the briefing participants editor. The
 * FloatingLabelInput is stubbed to a plain input. Covers the add-gate (blank →
 * disabled), trim + add + clear, and the participant chip list with removal.
 */
import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../../lib/theme', async () => (await import('../mocks/rn-ui')).themeMock());
vi.mock('../../lib/accessibility', async () => (await import('../mocks/rn-ui')).accessibilityMock());
vi.mock('lucide-react-native', async () => (await import('../mocks/rn-ui')).lucideMock());
vi.mock('../../components/primitives/A11yText', async () => (await import('../mocks/rn-ui')).a11yTextMock());
vi.mock('../../components/inputs/FloatingLabelInput', () => ({
  FloatingLabelInput: React.forwardRef(function Input(
    { label, value, onChangeText }: { label: string; value: string; onChangeText: (t: string) => void },
    ref: React.Ref<HTMLInputElement>,
  ) {
    return React.createElement('input', {
      ref,
      'aria-label': label,
      value: value ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChangeText(e.target.value),
    });
  }),
}));

import { ParticipantsStep } from '../../components/briefings/ParticipantsStep';

afterEach(cleanup);

describe('ParticipantsStep', () => {
  it('does not add when the field is blank', () => {
    const onAdd = vi.fn();
    const { getByText } = render(<ParticipantsStep participants={[]} onAdd={onAdd} onRemove={vi.fn()} />);
    fireEvent.click(getByText('დამატება'));
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('trims and adds a name, then clears the field', () => {
    const onAdd = vi.fn();
    const { getByText, getByLabelText } = render(
      <ParticipantsStep participants={[]} onAdd={onAdd} onRemove={vi.fn()} />,
    );
    const input = getByLabelText('სახელი გვარი') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '  გიორგი  ' } });
    fireEvent.click(getByText('დამატება'));
    expect(onAdd).toHaveBeenCalledWith('გიორგი');
    expect(input.value).toBe('');
  });

  it('renders a chip per participant', () => {
    const { getByText } = render(
      <ParticipantsStep
        participants={[{ name: 'ანა' }, { name: 'ბექა' }] as any}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(getByText('ანა')).toBeTruthy();
    expect(getByText('ბექა')).toBeTruthy();
  });

  it('removes the tapped participant by index', () => {
    const onRemove = vi.fn();
    // The redesign gives every chip's remove button the same static label
    // 'წაშლა'; the participant name now lives in the accessibility hint
    // ('<name> წაშლა'), not the label. So we select the remove buttons by their
    // shared label and tap the second one — the chip for 'ბექა' at index 1.
    const { getAllByLabelText } = render(
      <ParticipantsStep
        participants={[{ name: 'ანა' }, { name: 'ბექა' }] as any}
        onAdd={vi.fn()}
        onRemove={onRemove}
      />,
    );
    const removeButtons = getAllByLabelText('წაშლა');
    expect(removeButtons).toHaveLength(2);
    fireEvent.click(removeButtons[1]);
    expect(onRemove).toHaveBeenCalledWith(1);
  });
});
