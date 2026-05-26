/**
 * BobcatDetail (54% covered) — step 2 conclusion + signature flow.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@/test-utils';
import { routePattern, routes } from '@/app/routes';

vi.mock('@/components/SignatureCanvas', () => ({
  default: ({ onSave }: { onSave: (dataUrl: string) => void }) => (
    <button type="button" onClick={() => onSave('data:image/png;base64,c2lnbg==')}>
      fake-sign-bobcat
    </button>
  ),
}));
vi.mock('@/lib/data/projects', async (io) => ({ ...(await io<object>()), getProject: vi.fn() }));
vi.mock('@/lib/data/bobcat', async (io) => ({
  ...(await io<object>()),
  getBobcatInspection: vi.fn(),
  updateBobcatInspection: vi.fn(),
  deleteBobcatInspection: vi.fn(),
  createBobcatInspection: vi.fn(),
}));

import BobcatDetail from '@/features/inspections/equipment/BobcatDetail';
import { getProject } from '@/lib/data/projects';
import {
  getBobcatInspection, updateBobcatInspection,
  BOBCAT_TEMPLATE_ID, type BobcatInspection,
} from '@/lib/data/bobcat';

function renderDetail(element: React.ReactElement, pattern: string, path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={pattern} element={element} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const ISO = '2026-05-01T00:00:00.000Z';

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  vi.mocked(getProject).mockResolvedValue({
    id: 'proj-1', user_id: 'u1', name: 'პროექტი', company_name: 'შპს',
    address: null, contact_phone: null, logo: null, crew: null,
    latitude: null, longitude: null, created_at: ISO,
  } as never);
  vi.mocked(updateBobcatInspection).mockResolvedValue(undefined);
});

describe('BobcatDetail — step 2 signature + notes', () => {
  it('signature flow: click "ხელმოწერა" → fake-sign → updateBobcatInspection', async () => {
    const ID = 'bbbbcccc-1111-2222-3333-444444444444';
    const draft: BobcatInspection = {
      id: ID, projectId: 'proj-1', templateId: BOBCAT_TEMPLATE_ID, userId: 'u1',
      status: 'draft', company: 'შპს', address: null,
      equipmentModel: 'M', registrationNumber: 'AA',
      department: 'დ', inspectorName: 'ი',
      inspectionDate: '2026-05-01', inspectionType: 'pre_work',
      items: [], verdict: null, notes: null,
      inspectorSignature: null, signatories: [], summaryPhotos: [],
      createdAt: ISO, updatedAt: ISO, completedAt: null,
    };
    vi.mocked(getBobcatInspection).mockResolvedValue(draft);

    renderDetail(<BobcatDetail />, routePattern.bobcatDetail, routes.bobcat.detail(ID));
    expect(await screen.findByText('ზოგადი ინფორმაცია')).toBeInTheDocument();

    // step 0 → 1 → 2
    fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));
    fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));

    // Click "ხელმოწერა" button (signature CTA).
    const sigBtn = await screen.findByRole('button', { name: 'ხელმოწერა' });
    fireEvent.click(sigBtn);
    // SignatureCanvas mock renders "fake-sign-bobcat" button.
    fireEvent.click(screen.getByRole('button', { name: 'fake-sign-bobcat' }));

    await waitFor(() => expect(updateBobcatInspection).toHaveBeenCalled());
    const calls = vi.mocked(updateBobcatInspection).mock.calls;
    const sigCall = calls.find(([, p]) => (p as Record<string, unknown>).inspectorSignature?.includes('c2lnbg=='));
    expect(sigCall).toBeTruthy();
  });

  it.skip('step 2 notes textarea blur fires updateBobcatInspection with notes', async () => {
    const ID = 'bbbbcccc-aaaa-bbbb-cccc-555555555555';
    const draft: BobcatInspection = {
      id: ID, projectId: 'proj-1', templateId: BOBCAT_TEMPLATE_ID, userId: 'u1',
      status: 'draft', company: 'შპს', address: null,
      equipmentModel: 'M', registrationNumber: 'AA',
      department: 'დ', inspectorName: 'ი',
      inspectionDate: '2026-05-01', inspectionType: 'pre_work',
      items: [], verdict: null, notes: null,
      inspectorSignature: null, signatories: [], summaryPhotos: [],
      createdAt: ISO, updatedAt: ISO, completedAt: null,
    };
    vi.mocked(getBobcatInspection).mockResolvedValue(draft);

    renderDetail(<BobcatDetail />, routePattern.bobcatDetail, routes.bobcat.detail(ID));
    expect(await screen.findByText('ზოგადი ინფორმაცია')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));
    fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));

    // Notes textarea — labeled "შენიშვნები". Use document selector.
    const textareas = document.body.querySelectorAll('textarea');
    expect(textareas.length).toBeGreaterThan(0);
    const notesTextarea = textareas[0];
    fireEvent.change(notesTextarea, { target: { value: 'OK' } });
    fireEvent.blur(notesTextarea);

    await waitFor(() => expect(updateBobcatInspection).toHaveBeenCalled());
    const calls = vi.mocked(updateBobcatInspection).mock.calls;
    const notesCall = calls.find(([, p]) => (p as Record<string, unknown>).notes === 'OK');
    expect(notesCall).toBeTruthy();
  });
});
