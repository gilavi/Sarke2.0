import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { screen } from '@/test-utils';
import { renderPage } from '../helpers/renderPage';

vi.mock('@/lib/auth', () => ({ useAuth: vi.fn() }));

import { useAuth } from '@/lib/auth';
import Landing from '@/pages/Landing';
import { MarketingLayout } from '@/components/layout/MarketingLayout';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

// Render the Home page inside its MarketingLayout, the way the router wires it.
function renderMarketingHome() {
  return renderPage(
    <Routes>
      <Route element={<MarketingLayout />}>
        <Route path="/" element={<Landing />} />
      </Route>
    </Routes>,
  );
}

describe('Landing (home sections)', () => {
  it('renders the home marketing sections', () => {
    renderPage(<Landing />);
    // Hero paragraph mentions the brand.
    expect(screen.getAllByText(/HUBBLE/).length).toBeGreaterThan(0);
    // Painpoint copy (PainSection + marketing-data.ts).
    expect(screen.getByText(/საათობით ქაღალდზე/)).toBeInTheDocument();
    // Audiences section heading ("ვისთვის" / For who).
    expect(screen.getByText('ვისთვის')).toBeInTheDocument();
  });
});

describe('MarketingLayout', () => {
  it('renders chrome + page content for logged-out visitors', () => {
    vi.mocked(useAuth).mockReturnValue({ session: null } as unknown as ReturnType<typeof useAuth>);
    renderMarketingHome();
    expect(screen.getByText(/საათობით ქაღალდზე/)).toBeInTheDocument();
    // Navbar/footer brand renders from the layout.
    expect(screen.getAllByText(/HUBBLE/).length).toBeGreaterThan(0);
  });

  it('redirects logged-in users to /home (no marketing content)', () => {
    vi.mocked(useAuth).mockReturnValue({ session: { access_token: 'x' } } as unknown as ReturnType<typeof useAuth>);
    renderMarketingHome();
    // Navigate sends the user to /home; the home sections never render.
    expect(screen.queryByText(/საათობით ქაღალდზე/)).not.toBeInTheDocument();
  });
});
