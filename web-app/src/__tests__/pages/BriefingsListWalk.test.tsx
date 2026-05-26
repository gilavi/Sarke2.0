/**
 * Briefings list page (56% covered) — rows + delete confirm flow.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@/test-utils';
import { renderPage } from '../helpers/renderPage';

vi.mock('@/lib/data/projects', async (io) => ({ ...(await io<object>()), listProjects: vi.fn() }));
vi.mock('@/lib/data/briefings', async (io) => ({
  ...(await io<object>()),
  listBriefings: vi.fn(),
  deleteBriefing: vi.fn(),
}));

import { listProjects } from '@/lib/data/projects';
import { listBriefings, deleteBriefing } from '@/lib/data/briefings';
import Briefings from '@/pages/Briefings';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listProjects).mockResolvedValue([
    { id: 'p1', user_id: 'u1', name: 'პროექტი', company_name: null, address: null,
      contact_phone: null, logo: null, crew: null, latitude: null, longitude: null,
      created_at: '2026-05-01' },
  ]);
});

describe('Briefings list', () => {
  it('renders the empty state', async () => {
    vi.mocked(listBriefings).mockResolvedValue([]);
    renderPage(<Briefings />);
    expect(await screen.findByText('ინსტრუქტაჟები ჯერ არ გაქვთ.')).toBeInTheDocument();
  });

  it('renders briefing rows', async () => {
    vi.mocked(listBriefings).mockResolvedValue([
      { id: 'b1', projectId: 'p1', dateTime: '2026-05-01T09:00:00Z',
        topics: ['ppe'], participants: [], inspectorName: 'ი', status: 'completed',
        createdAt: '2026-05-01' } as never,
    ]);
    renderPage(<Briefings />);
    // Wait for the row's date or status to appear.
    expect(await screen.findByText('დასრულდა')).toBeInTheDocument();
  });

  it('clicking trash + confirm fires deleteBriefing', async () => {
    vi.mocked(listBriefings).mockResolvedValue([
      { id: 'b1', projectId: 'p1', dateTime: '2026-05-01T09:00:00Z',
        topics: [], participants: [], inspectorName: 'ი', status: 'draft',
        createdAt: '2026-05-01' } as never,
    ]);
    vi.mocked(deleteBriefing).mockResolvedValue(undefined);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage(<Briefings />);
    await screen.findByText('დრაფტი');
    const trash = document.body.querySelectorAll('[class*="lucide-trash"]');
    fireEvent.click(trash[0].closest('button')!);
    await waitFor(() => expect(deleteBriefing).toHaveBeenCalled());
    confirmSpy.mockRestore();
  });
});
