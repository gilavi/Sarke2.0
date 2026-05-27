import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@/test-utils';
import { renderPage } from '../helpers/renderPage';

vi.mock('@/lib/auth', () => ({ useAuth: vi.fn() }));
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { verifyOtp: vi.fn(), resend: vi.fn() } },
}));

import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import Forgot from '@/pages/auth/Forgot';
import Reset from '@/pages/auth/Reset';
import VerifyEmail from '@/pages/auth/VerifyEmail';

const auth = {
  signIn: vi.fn(),
  signUp: vi.fn(),
  sendPasswordReset: vi.fn(),
  updatePassword: vi.fn(),
};

/** Set the value of an input by its id (Mantine PasswordInput isn't found by label). */
function fill(container: HTMLElement, id: string, value: string) {
  const el = container.querySelector(`#${id}`) as HTMLInputElement;
  fireEvent.change(el, { target: { value } });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue(auth as unknown as ReturnType<typeof useAuth>);
});

describe('Login', () => {
  it('signs in with the trimmed email + password', async () => {
    auth.signIn.mockResolvedValue(undefined);
    const { container } = renderPage(<Login />, '/login');
    expect(screen.getByRole('heading', { name: 'შესვლა' })).toBeInTheDocument();

    fill(container, 'email', 'a@b.com');
    fill(container, 'password', 'secret');
    fireEvent.click(screen.getByRole('button', { name: 'შესვლა' }));

    await waitFor(() => expect(auth.signIn).toHaveBeenCalledWith('a@b.com', 'secret'));
  });

  it('shows an error message when sign-in fails', async () => {
    auth.signIn.mockRejectedValue(new Error('არასწორი მონაცემები'));
    const { container } = renderPage(<Login />, '/login');
    fill(container, 'email', 'a@b.com');
    fill(container, 'password', 'x');
    fireEvent.click(screen.getByRole('button', { name: 'შესვლა' }));
    expect(await screen.findByText('არასწორი მონაცემები')).toBeInTheDocument();
  });
});

describe('Register', () => {
  it('shows a password-strength meter and signs up', async () => {
    auth.signUp.mockResolvedValue({ needsEmailConfirmation: true });
    const { container } = renderPage(<Register />, '/register');

    fill(container, 'first', 'გელა');
    fill(container, 'last', 'ხელაძე');
    fill(container, 'email', 'g@h.com');
    fill(container, 'password', 'Abcdef12!');
    expect(screen.getByText('ძალიან ძლიერი')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'რეგისტრაცია' }));
    await waitFor(() =>
      expect(auth.signUp).toHaveBeenCalledWith({
        email: 'g@h.com',
        password: 'Abcdef12!',
        firstName: 'გელა',
        lastName: 'ხელაძე',
      }),
    );
  });
});

describe('Forgot', () => {
  it('confirms the reset email was sent', async () => {
    auth.sendPasswordReset.mockResolvedValue(undefined);
    const { container } = renderPage(<Forgot />, '/forgot');
    fill(container, 'email', 'a@b.com');
    fireEvent.click(screen.getByRole('button', { name: 'ბმულის გაგზავნა' }));
    expect(await screen.findByText(/თუ ანგარიში არსებობს/)).toBeInTheDocument();
    expect(auth.sendPasswordReset).toHaveBeenCalledWith('a@b.com');
  });
});

describe('Reset', () => {
  it('rejects mismatched passwords', () => {
    const { container } = renderPage(<Reset />, '/reset');
    fill(container, 'password', 'aaaaaaaa');
    fill(container, 'confirm', 'bbbbbbbb');
    fireEvent.click(screen.getByRole('button', { name: 'შენახვა' }));
    expect(screen.getByText('პაროლები არ ემთხვევა')).toBeInTheDocument();
    expect(auth.updatePassword).not.toHaveBeenCalled();
  });

  it('updates the password when they match', async () => {
    auth.updatePassword.mockResolvedValue(undefined);
    const { container } = renderPage(<Reset />, '/reset');
    fill(container, 'password', 'aaaaaaaa');
    fill(container, 'confirm', 'aaaaaaaa');
    fireEvent.click(screen.getByRole('button', { name: 'შენახვა' }));
    await waitFor(() => expect(auth.updatePassword).toHaveBeenCalledWith('aaaaaaaa'));
  });
});

describe('VerifyEmail', () => {
  it('prompts to verify when an email is supplied', () => {
    renderPage(<VerifyEmail />, '/verify-email?email=a@b.com');
    expect(screen.getByText('შეამოწმე ფოსტა')).toBeInTheDocument();
    expect(screen.getByText('a@b.com')).toBeInTheDocument();
  });

  it('shows the missing-address state with no email param', () => {
    renderPage(<VerifyEmail />, '/verify-email');
    expect(screen.getByText('მისამართი არ არის მითითებული.')).toBeInTheDocument();
  });

  it('verifies the OTP once 6 digits are entered', async () => {
    vi.mocked(supabase.auth.verifyOtp).mockResolvedValue({ data: {}, error: null } as never);
    const { container } = renderPage(<VerifyEmail />, '/verify-email?email=a@b.com');
    fill(container, 'code', '123456');
    await waitFor(() =>
      expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({ email: 'a@b.com', token: '123456', type: 'signup' }),
    );
  });
});
