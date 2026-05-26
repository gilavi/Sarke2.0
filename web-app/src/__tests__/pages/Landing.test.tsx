import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@/test-utils';
import { renderPage } from '../helpers/renderPage';

vi.mock('@/lib/auth', () => ({ useAuth: vi.fn() }));

import { useAuth } from '@/lib/auth';
import Landing from '@/pages/Landing';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('Landing', () => {
  it('renders the marketing page for logged-out visitors', () => {
    vi.mocked(useAuth).mockReturnValue({ session: null } as unknown as ReturnType<typeof useAuth>);
    renderPage(<Landing />);
    // HUBBLE brand appears in the nav and footer.
    expect(screen.getAllByText(/HUBBLE/).length).toBeGreaterThan(0);
    // Painpoint copy (covers PainSection in sections.tsx + marketing-data.ts).
    expect(screen.getByText(/საათობით ქაღალდზე/)).toBeInTheDocument();
    // FAQ question (covers FAQ section).
    expect(screen.getByText(/რა ფორმატშია PDF/)).toBeInTheDocument();
  });

  it('redirects logged-in users away from the marketing page', () => {
    vi.mocked(useAuth).mockReturnValue({ session: { access_token: 'x' } } as unknown as ReturnType<typeof useAuth>);
    renderPage(<Landing />);
    // Navigate component sends the user to /home; no marketing content renders.
    expect(screen.queryByText(/საათობით ქაღალდზე/)).not.toBeInTheDocument();
  });
});
