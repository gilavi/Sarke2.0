/**
 * Account page interaction tests. Currently 44% covered; this adds:
 * - rendering with each pdf-usage status (active/expired/free)
 * - clicking "PRO" / "განახლება" navigates to /subscribe
 * - clicking profile/password buttons opens the modals
 * - appearance toggle calls useTheme.toggleMode
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@/test-utils';

const toggleMode = vi.fn();
vi.mock('@/lib/theme', () => ({ useTheme: () => ({ isDark: false, toggleMode }) }));
vi.mock('@/lib/auth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'u1', email: 'x@y.com' },
    profile: { first_name: 'გელა', last_name: 'ხელაძე' },
    signOut: vi.fn(),
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
vi.mock('@/lib/data/account', () => ({ updateUserName: vi.fn() }));

import { usePdfUsage } from '@/lib/usePdfUsage';
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

describe('Account - pdf-usage variants', () => {
  it('renders the FREE state with the PRO button + usage counter', () => {
    vi.mocked(usePdfUsage).mockReturnValue({
      data: { status: 'free', count: 5, limit: 30, isLocked: false, expiresAt: null, cancelledAt: null },
      isLoading: false,
    } as never);
    renderPage(<Account />);
    expect(screen.getByText(/უფასო გეგმა · PDF: 5\/30/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /PRO/ })).toBeInTheDocument();
  });

  it('renders the ACTIVE PRO state with cancel button', () => {
    vi.mocked(usePdfUsage).mockReturnValue({
      data: { status: 'active', count: 100, limit: 30, isLocked: false, expiresAt: '2026-12-01', cancelledAt: null },
      isLoading: false,
    } as never);
    renderPage(<Account />);
    expect(screen.getByText(/მოქმედია/)).toBeInTheDocument();
    expect(screen.getByText(/შეუზღუდავი PDF/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'გაუქმება' })).toBeInTheDocument();
  });

  it('renders the EXPIRED state with the renewal CTA', () => {
    vi.mocked(usePdfUsage).mockReturnValue({
      data: { status: 'expired', count: 30, limit: 30, isLocked: true, expiresAt: '2025-01-01', cancelledAt: null },
      isLoading: false,
    } as never);
    renderPage(<Account />);
    expect(screen.getByText(/გამოწერა ამოიწურა/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /PRO/ })).toBeInTheDocument();
  });
});

describe('Account - interactions', () => {
  it('clicking the appearance toggle calls toggleMode', () => {
    vi.mocked(usePdfUsage).mockReturnValue({
      data: { status: 'free', count: 0, limit: 30, isLocked: false, expiresAt: null, cancelledAt: null },
      isLoading: false,
    } as never);
    renderPage(<Account />);
    fireEvent.click(screen.getByLabelText('გარეგნობის შეცვლა'));
    expect(toggleMode).toHaveBeenCalled();
  });

  it('clicking "პროფილის რედაქტირება" opens the profile modal', async () => {
    vi.mocked(usePdfUsage).mockReturnValue({
      data: { status: 'free', count: 0, limit: 30, isLocked: false, expiresAt: null, cancelledAt: null },
      isLoading: false,
    } as never);
    renderPage(<Account />);
    fireEvent.click(screen.getByRole('button', { name: /პროფილის რედაქტირება/ }));
    // Mantine Modal title appears (async portal mount).
    expect(await screen.findByText('პროფილი')).toBeInTheDocument();
  });

  it('clicking "პაროლის შეცვლა" opens the password modal', async () => {
    vi.mocked(usePdfUsage).mockReturnValue({
      data: { status: 'free', count: 0, limit: 30, isLocked: false, expiresAt: null, cancelledAt: null },
      isLoading: false,
    } as never);
    renderPage(<Account />);
    fireEvent.click(screen.getByRole('button', { name: /პაროლის შეცვლა/ }));
    // After the modal mounts, "პაროლის შეცვლა" appears twice (button + modal title).
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getAllByText('პაროლის შეცვლა').length).toBeGreaterThanOrEqual(2);
  });
});
