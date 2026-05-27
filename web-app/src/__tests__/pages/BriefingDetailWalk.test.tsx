/**
 * BriefingDetail interactions (40% covered). Walks the draft edit affordances:
 *  - toggling topic pills → updateBriefing
 *  - editing inspector via blur → updateBriefing
 *  - confirm-delete flow → deleteBriefing
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { screen, fireEvent, waitFor } from '@/test-utils';
import { renderPage } from '../helpers/renderPage';

vi.mock('@/lib/auth', () => ({ useAuth: vi.fn(() => ({ user: { id: 'u1' } })) }));
vi.mock('@/components/SignatureCanvas', () => ({ default: () => null }));
vi.mock('@/lib/data/projects', async (io) => ({ ...(await io<object>()), getProject: vi.fn() }));
vi.mock('@/lib/data/briefings', async (io) => ({
  ...(await io<object>()),
  getBriefing: vi.fn(),
  updateBriefing: vi.fn(),
  deleteBriefing: vi.fn(),
}));

import { getProject } from '@/lib/data/projects';
import { getBriefing, updateBriefing, deleteBriefing } from '@/lib/data/briefings';
import BriefingDetail from '@/pages/BriefingDetail';

const draftBriefing = {
  id: 'b1', projectId: 'p1', dateTime: '2026-05-01T09:00:00Z',
  topics: ['ppe'], participants: [{ fullName: 'მამა', position: 'მუშა', signature: null }],
  inspectorName: 'ი. ი.', inspectorSignature: null,
  status: 'draft' as const, createdAt: '2026-05-01',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getProject).mockResolvedValue({
    id: 'p1', user_id: 'u1', name: 'პროექტი', company_name: null,
    address: null, contact_phone: null, logo: null, crew: null,
    latitude: null, longitude: null, created_at: '2026-05-01',
  } as never);
  vi.mocked(getBriefing).mockResolvedValue(draftBriefing as never);
  vi.mocked(updateBriefing).mockResolvedValue(undefined);
  vi.mocked(deleteBriefing).mockResolvedValue(undefined);
});

describe('BriefingDetail (draft)', () => {
  it('renders inspector + topic pills', async () => {
    renderPage(
      <Routes><Route path="/briefings/:id" element={<BriefingDetail />} /></Routes>,
      '/briefings/b1',
    );
    expect(await screen.findByDisplayValue('ი. ი.')).toBeInTheDocument();
    expect(screen.getByText(/ინსტრუქტაჟი —/)).toBeInTheDocument();
  });

  it('editing inspector via blur calls updateBriefing', async () => {
    renderPage(
      <Routes><Route path="/briefings/:id" element={<BriefingDetail />} /></Routes>,
      '/briefings/b1',
    );
    const input = await screen.findByDisplayValue('ი. ი.');
    fireEvent.change(input, { target: { value: 'ახალი ი.' } });
    fireEvent.blur(input);
    await waitFor(() => expect(updateBriefing).toHaveBeenCalled());
    const [, patch] = vi.mocked(updateBriefing).mock.calls[0];
    expect((patch as Record<string, unknown>).inspectorName).toBe('ახალი ი.');
  });

  it('clicking a topic pill toggles + calls updateBriefing', async () => {
    renderPage(
      <Routes><Route path="/briefings/:id" element={<BriefingDetail />} /></Routes>,
      '/briefings/b1',
    );
    await screen.findByDisplayValue('ი. ი.');
    // The "ppe" topic is already selected; click an unselected one to toggle on.
    // TOPIC_KEYS has multiple keys; pick one that's NOT in topics.
    const allPills = screen.getAllByRole('button').filter(
      (el) => el.className.includes('rounded-full') && !el.className.includes('bg-brand-600'),
    );
    expect(allPills.length).toBeGreaterThan(0);
    fireEvent.click(allPills[0]);
    await waitFor(() => expect(updateBriefing).toHaveBeenCalled());
  });

  it('delete flow: click წაშლა → confirm → deleteBriefing fires', async () => {
    renderPage(
      <Routes><Route path="/briefings/:id" element={<BriefingDetail />} /></Routes>,
      '/briefings/b1',
    );
    await screen.findByDisplayValue('ი. ი.');
    // Open the AlertDialog.
    const deleteBtns = screen.getAllByRole('button', { name: /^წაშლა$/ });
    fireEvent.click(deleteBtns[0]);
    // Wait for the dialog title to appear, then click the confirm button.
    await screen.findByText('ჩანაწერის წაშლა');
    const allBtns = screen.getAllByRole('button', { name: /^წაშლა$/ });
    fireEvent.click(allBtns[allBtns.length - 1]);
    await waitFor(() => expect(deleteBriefing).toHaveBeenCalled());
  });
});
