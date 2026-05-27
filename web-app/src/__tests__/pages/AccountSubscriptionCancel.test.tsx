/**
 * Account — cancel subscription flow. The PRO active card has a "გაუქმება"
 * button that calls cancelSubscription(user.id).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@/test-utils';

vi.mock('@/lib/theme', () => ({ useTheme: () => ({ isDark: false, toggleMode: () => {} }) }));
vi.mock('@/lib/auth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'u1', email: 'x@y.com' },
    profile: { first_name: 'გელა', last_name: 'ხელაძე' },
  })),
}));
vi.mock('@/lib/usePdfUsage', () => ({
  usePdfUsage: vi.fn(),
  useInvalidatePdfUsage: () => () => {},
}));
vi.mock('@/lib/subscription', () => ({
  usePaymentHistory: vi.fn(() => ({ data: [], isLoading: false })),
  cancelSubscription: vi.fn(),
}));
vi.mock('@/lib/data/certificates', async (io) => ({ ...(await io<object>()), listCertificates: vi.fn() }));
vi.mock('@/lib/data/qualifications', async (io) => ({
  ...(await io<object>()),
  listQualifications: vi.fn(),
  qualificationLabel: (q: { type: string }) => q.type,
}));

import { usePdfUsage } from '@/lib/usePdfUsage';
import { cancelSubscription } from '@/lib/subscription';
import { listCertificates } from '@/lib/data/certificates';
import { listQualifications } from '@/lib/data/qualifications';
import Account from '@/pages/Account';

function renderPage(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listCertificates).mockResolvedValue([]);
  vi.mocked(listQualifications).mockResolvedValue([]);
});

describe('Account — cancel subscription', () => {
  it('clicking the active-state "გაუქმება" with confirm=true fires cancelSubscription', async () => {
    vi.mocked(usePdfUsage).mockReturnValue({
      data: { status: 'active', count: 100, limit: 30, isLocked: false,
        expiresAt: '2026-12-01', cancelledAt: null },
      isLoading: false,
    } as never);
    vi.mocked(cancelSubscription).mockResolvedValue({ active_until: '2026-12-01' } as never);

    renderPage(<Account />);
    // Click the trigger — AlertDialog opens.
    fireEvent.click(screen.getByRole('button', { name: 'გაუქმება' }));
    // Wait for the dialog action button, then click it.
    const confirmBtn = await screen.findByRole('button', { name: 'გამოწერის გაუქმება' });
    fireEvent.click(confirmBtn);
    await waitFor(() => expect(cancelSubscription).toHaveBeenCalledWith('u1'));
    expect(await screen.findByText(/წვდომა გაგრძელდება/)).toBeInTheDocument();
  });

  it('clicking the active-state "გაუქმება" with confirm=false does NOT call cancelSubscription', async () => {
    vi.mocked(usePdfUsage).mockReturnValue({
      data: { status: 'active', count: 100, limit: 30, isLocked: false,
        expiresAt: '2026-12-01', cancelledAt: null },
      isLoading: false,
    } as never);
    renderPage(<Account />);
    // Click trigger to open dialog, then dismiss without confirming.
    fireEvent.click(screen.getByRole('button', { name: 'გაუქმება' }));
    // Wait for dialog to open (action button appears), then click the cancel button.
    await screen.findByRole('button', { name: 'გამოწერის გაუქმება' });
    const allCancelBtns = screen.getAllByRole('button', { name: 'გაუქმება' });
    fireEvent.click(allCancelBtns[allCancelBtns.length - 1]);
    expect(cancelSubscription).not.toHaveBeenCalled();
  });
});
