/**
 * VerifyEmail page interactions (currently 50%).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, fireEvent, waitFor } from '@/test-utils';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      verifyOtp: vi.fn(),
      resend: vi.fn(),
    },
  },
}));

import { supabase } from '@/lib/supabase';
import VerifyEmail from '@/pages/auth/VerifyEmail';

function renderPage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <VerifyEmail />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('VerifyEmail', () => {
  it('shows the missing-email state when no email param', () => {
    renderPage('/verify-email');
    expect(screen.getByText('მისამართი არ არის მითითებული.')).toBeInTheDocument();
    expect(screen.getByText('← რეგისტრაცია')).toBeInTheDocument();
  });

  it('shows the OTP form when email param is set', () => {
    renderPage('/verify-email?email=user@example.com');
    expect(screen.getByText('შეამოწმე ფოსტა')).toBeInTheDocument();
    expect(screen.getByText(/user@example.com/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'დადასტურება' })).toBeDisabled();
  });

  it('typing 6 digits auto-submits via verifyOtp', async () => {
    vi.mocked(supabase.auth.verifyOtp).mockResolvedValue({ error: null } as never);
    renderPage('/verify-email?email=user@example.com');
    const codeInput = document.getElementById('code') as HTMLInputElement;
    fireEvent.change(codeInput, { target: { value: '123456' } });
    await waitFor(() => expect(supabase.auth.verifyOtp).toHaveBeenCalled());
    const call = vi.mocked(supabase.auth.verifyOtp).mock.calls[0][0];
    expect(call.email).toBe('user@example.com');
    expect(call.token).toBe('123456');
  });

  it('clicking "ხელახლა გაგზავნა" calls supabase.auth.resend', async () => {
    vi.mocked(supabase.auth.resend).mockResolvedValue({ error: null } as never);
    renderPage('/verify-email?email=user@example.com');
    fireEvent.click(screen.getByRole('button', { name: /ხელახლა გაგზავნა/ }));
    await waitFor(() => expect(supabase.auth.resend).toHaveBeenCalled());
    expect(await screen.findByText('ახალი კოდი გამოიგზავნა.')).toBeInTheDocument();
  });

  it('verifyOtp error displays a friendly message', async () => {
    vi.mocked(supabase.auth.verifyOtp).mockResolvedValue({
      error: new Error('Token has expired'),
    } as never);
    renderPage('/verify-email?email=user@example.com');
    const codeInput = document.getElementById('code') as HTMLInputElement;
    fireEvent.change(codeInput, { target: { value: '123456' } });
    expect(await screen.findByText(/კოდის ვადა ამოიწურა/)).toBeInTheDocument();
  });
});
