import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test-utils';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';

describe('FloatingLabelInput', () => {
  it('renders the label', () => {
    render(<FloatingLabelInput label="სახელი" />);
    expect(screen.getByText('სახელი')).toBeInTheDocument();
  });

  it('shows the error message and hint', () => {
    render(<FloatingLabelInput label="ელფოსტა" error="არასწორი ფორმატი" hint="example@mail.com" />);
    expect(screen.getByText('არასწორი ფორმატი')).toBeInTheDocument();
    expect(screen.getByText('example@mail.com')).toBeInTheDocument();
  });

  it('forwards onChange with the native event', () => {
    const onChange = vi.fn();
    render(<FloatingLabelInput label="სახელი" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'გელა' } });
    expect(onChange).toHaveBeenCalled();
  });
});
