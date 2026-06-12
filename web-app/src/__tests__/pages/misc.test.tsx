import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@/test-utils';
import { renderPage } from '../helpers/renderPage';

vi.mock('@/components/Scene3D', () => ({ default: () => null }));
vi.mock('@/components/SidePanel', () => ({ default: () => null }));
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn(), setSession: vi.fn() } },
}));

import { supabase } from '@/lib/supabase';
import Terms from '@/pages/Terms';
import Privacy from '@/pages/Privacy';
import NotFound from '@/pages/NotFound';
import SafetyGuidePage from '@/pages/SafetyGuidePage';
import Subscribe from '@/pages/Subscribe';
import SubscribeSuccess from '@/pages/SubscribeSuccess';
import SubscribeFail from '@/pages/SubscribeFail';

beforeEach(() => vi.clearAllMocks());

describe('Terms', () => {
  it('renders the language toggle and footer', () => {
    renderPage(<Terms />);
    expect(screen.getByRole('button', { name: 'ქართული' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument();
    expect(screen.getByText(/© 2026 Hubble/)).toBeInTheDocument();
  });
});

describe('Privacy', () => {
  it('renders the Georgian heading, language toggle, and footer', () => {
    renderPage(<Privacy />);
    expect(screen.getByText('კონფიდენციალურობის პოლიტიკა')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument();
    expect(screen.getByText(/© 2026 Hubble/)).toBeInTheDocument();
  });
});

describe('NotFound', () => {
  it('renders the 404 screen', () => {
    renderPage(<NotFound />);
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('Back to Home')).toBeInTheDocument();
  });
});

describe('SafetyGuidePage', () => {
  it('renders the 3D guide header (Georgian)', () => {
    renderPage(<SafetyGuidePage />);
    expect(screen.getByText('3D უსაფრთხოების სახელმძღვანელო')).toBeInTheDocument();
  });
});

describe('Subscribe', () => {
  it('shows the Pro plan once a session is established', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: { access_token: 'x' } } } as never);
    renderPage(<Subscribe />, '/subscribe');
    expect(await screen.findByText('Hubble Pro')).toBeInTheDocument();
    expect(screen.getByText('შეუზღუდავი PDF გენერაცია')).toBeInTheDocument();
  });
});

describe('SubscribeSuccess / SubscribeFail', () => {
  it('SubscribeSuccess confirms payment', () => {
    renderPage(<SubscribeSuccess />, '/subscribe/success');
    expect(screen.getByText('გადახდა დასრულდა')).toBeInTheDocument();
  });

  it('SubscribeFail shows the failure message', () => {
    renderPage(<SubscribeFail />);
    expect(screen.getByText('გადახდა ვერ მოხერხდა')).toBeInTheDocument();
  });
});
