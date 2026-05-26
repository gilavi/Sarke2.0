import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { screen, fireEvent } from '@/test-utils';
import { render } from '@/test-utils';

vi.mock('@/lib/auth', () => ({ useAuth: vi.fn() }));
vi.mock('@/lib/usePdfUsage', () => ({ usePdfUsage: vi.fn(), useInvalidatePdfUsage: () => () => {} }));
vi.mock('@/lib/subscription', () => ({ cancelSubscription: vi.fn() }));
vi.mock('@/components/layout/Sidebar', () => ({ Sidebar: () => null }));
vi.mock('@/components/SettingsModal', () => ({ default: () => null }));

import { useAuth } from '@/lib/auth';
import { usePdfUsage } from '@/lib/usePdfUsage';
import { SubscriptionCard } from '@/components/SubscriptionCard';
import { PaywallModal } from '@/components/PaywallModal';
import { ProjectAvatar, EditableProjectAvatar } from '@/components/ProjectAvatar';
import { AppShell } from '@/components/layout/AppShell';
import { topNavItems, moreNavItems } from '@/components/layout/navItems';

const renderWithRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1' } } as unknown as ReturnType<typeof useAuth>);
});

describe('SubscriptionCard', () => {
  it('shows a skeleton while usage is loading', () => {
    vi.mocked(usePdfUsage).mockReturnValue({ data: undefined, isLoading: true } as never);
    const { container } = renderWithRouter(<SubscriptionCard />);
    // Mantine Skeleton renders a div — container has children.
    expect(container.firstChild).toBeTruthy();
  });

  it('renders the free-plan card with the PDF counter and CTA', () => {
    vi.mocked(usePdfUsage).mockReturnValue({
      data: { status: 'free', count: 5, limit: 30, isLocked: false, expiresAt: null, cancelledAt: null },
      isLoading: false,
    } as never);
    renderWithRouter(<SubscriptionCard />);
    expect(screen.getByText('უფასო გეგმა')).toBeInTheDocument();
    expect(screen.getByText('PDF: 5 / 30')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /PRO-ზე გადასვლა/ })).toBeInTheDocument();
  });

  it('renders the active PRO state with the unlimited-PDF badge', () => {
    vi.mocked(usePdfUsage).mockReturnValue({
      data: { status: 'active', count: 100, limit: 30, isLocked: false, expiresAt: '2026-12-01', cancelledAt: null },
      isLoading: false,
    } as never);
    renderWithRouter(<SubscriptionCard />);
    expect(screen.getByText('Hubble Pro')).toBeInTheDocument();
    expect(screen.getByText(/PRO ✓/)).toBeInTheDocument();
    expect(screen.getByText(/შეუზღუდავი PDF/)).toBeInTheDocument();
  });

  it('renders the expired state with a renewal button', () => {
    vi.mocked(usePdfUsage).mockReturnValue({
      data: { status: 'expired', count: 30, limit: 30, isLocked: true, expiresAt: '2025-01-01', cancelledAt: null },
      isLoading: false,
    } as never);
    renderWithRouter(<SubscriptionCard />);
    expect(screen.getByText('გამოწერა ამოიწურა')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /განახლება/ })).toBeInTheDocument();
  });
});

describe('PaywallModal', () => {
  it('renders the headline and the feature list when open', () => {
    renderWithRouter(<PaywallModal open onOpenChange={() => {}} />);
    expect(screen.getByText(/30 უფასო PDF ამოიწურა/)).toBeInTheDocument();
    expect(screen.getByText('შეუზღუდავი PDF გენერაცია')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'გამოწერის გააქტიურება' })).toBeInTheDocument();
  });

  it('honors a custom headline', () => {
    renderWithRouter(<PaywallModal open headline="საცდელი" onOpenChange={() => {}} />);
    expect(screen.getByText('საცდელი')).toBeInTheDocument();
  });

  it('closes when the secondary button is clicked', () => {
    const onOpenChange = vi.fn();
    renderWithRouter(<PaywallModal open onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'მოგვიანებით' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('ProjectAvatar', () => {
  it('renders the first letter of company name when no logo', () => {
    const { container } = render(<ProjectAvatar project={{ name: 'პროექტი', company_name: 'შპს', logo: null }} />);
    // `toLocaleUpperCase('ka-GE')` produces Mtavruli capitals: შ → Შ.
    expect(container.querySelector('span')?.textContent).toBe('Შ');
  });

  it('renders the project name initial when company name is missing', () => {
    const { container } = render(<ProjectAvatar project={{ name: 'პროექტი', company_name: null, logo: null }} />);
    expect(container.querySelector('span')?.textContent).toBe('Პ');
  });

  it('renders an img when a logo is provided', () => {
    const { container } = render(<ProjectAvatar project={{ name: 'X', company_name: null, logo: 'data:img' }} />);
    expect(container.querySelector('img')).toBeInTheDocument();
  });
});

describe('EditableProjectAvatar', () => {
  it('fires onFileInputChange when a file is selected', () => {
    const onChange = vi.fn();
    const { container } = render(
      <EditableProjectAvatar project={{ name: 'X', company_name: null, logo: null }} onFileInputChange={onChange} />,
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] } });
    expect(onChange).toHaveBeenCalled();
  });
});

describe('AppShell', () => {
  it('renders its children inside the main content area', () => {
    renderWithRouter(
      <AppShell>
        <p>page content</p>
      </AppShell>,
    );
    expect(screen.getByText('page content')).toBeInTheDocument();
  });

  it('exposes the menu and settings buttons on mobile', () => {
    renderWithRouter(<AppShell><span>x</span></AppShell>);
    expect(screen.getByLabelText('მენიუს გახსნა')).toBeInTheDocument();
    expect(screen.getByLabelText('პარამეტრები')).toBeInTheDocument();
  });
});

describe('navItems', () => {
  it('exposes the canonical top + more nav items', () => {
    expect(topNavItems.map((i) => i.to)).toEqual([
      '/home', '/projects', '/calendar', '/regulations', '/certificates', '/history',
    ]);
    expect(moreNavItems.map((i) => i.to)).toEqual([
      '/inspections', '/incidents', '/briefings', '/reports', '/orders', '/templates', '/safety',
    ]);
    expect(topNavItems.find((i) => i.to === '/home')?.shortcut).toBe('G H');
  });
});
