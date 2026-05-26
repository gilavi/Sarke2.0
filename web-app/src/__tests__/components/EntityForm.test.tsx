import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { renderHook } from '@testing-library/react';
import { screen, render } from '@/test-utils';
import {
  useEntityForm,
  Form,
  FormTextInput,
  FormTextarea,
  FormSelect,
} from '@/components/form/EntityForm';

const schema = z.object({
  name: z.string().min(1, 'required'),
  notes: z.string(),
  role: z.string().nullable(),
});
type FormData = z.infer<typeof schema>;

describe('useEntityForm', () => {
  it('returns a typed react-hook-form instance with defaults applied', () => {
    const { result } = renderHook(() =>
      useEntityForm<FormData>(schema, { name: 'X', notes: '', role: null }),
    );
    expect(result.current.getValues('name')).toBe('X');
    expect(result.current.getValues('role')).toBeNull();
    expect(typeof result.current.handleSubmit).toBe('function');
  });
});

describe('Form + field components', () => {
  function FormHarness() {
    const form = useEntityForm<FormData>(schema, { name: 'საცდელი', notes: 'OK', role: 'engineer' });
    return (
      <Form onSubmit={(e) => e.preventDefault()}>
        <FormTextInput control={form.control} name="name" label="სახელი" required />
        <FormTextarea control={form.control} name="notes" label="შენიშვნა" />
        <FormSelect
          control={form.control}
          name="role"
          label="როლი"
          data={[{ value: 'engineer', label: 'ინჟინერი' }, { value: 'manager', label: 'მენეჯერი' }]}
        />
      </Form>
    );
  }

  it('renders Mantine inputs wired to react-hook-form defaults', () => {
    render(<FormHarness />);
    expect(screen.getByText('სახელი')).toBeInTheDocument();
    expect(screen.getByText('შენიშვნა')).toBeInTheDocument();
    expect(screen.getByText('როლი')).toBeInTheDocument();
    expect(screen.getByDisplayValue('საცდელი')).toBeInTheDocument();
  });

  it('Form wrapper passes through native props', () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    const { container } = render(
      <Form onSubmit={onSubmit} data-testid="my-form">
        <button type="submit">Submit</button>
      </Form>,
    );
    expect(container.querySelector('[data-testid="my-form"]')).toBeInTheDocument();
  });
});
