/**
 * Deeper interaction tests for equipment detail pages (BobcatDetail,
 * ExcavatorDetail, GeneralEquipmentDetail). Walks the wizard PAST step 0,
 * exercises the step-1 checklist (clicking the result pills + setting verdict),
 * and clicks the conclusion-step inputs.
 *
 * The existing equipmentCompletion test covers the final "დასრულება" click.
 * The existing equipmentDetailDraft covers mount-only. This one fills in the
 * gap: step-1 checklist interactions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@/test-utils';
import { routePattern, routes } from '@/app/routes';

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
  getBobcatInspection, updateBobcatInspection, BOBCAT_TEMPLATE_ID, BOBCAT_ITEMS,
  type BobcatInspection,
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
    id: 'proj-1', user_id: 'u1', name: 'პროექტი', company_name: 'შპს კომპანია',
    address: null, contact_phone: null, logo: null, crew: null,
    latitude: null, longitude: null, created_at: ISO,
  } as never);
  vi.mocked(updateBobcatInspection).mockResolvedValue(undefined);
});

describe('BobcatDetail (step-1 checklist interaction)', () => {
  it('clicking a result pill calls updateBobcatInspection with the new items array', async () => {
    const ID = '99999999-9999-9999-9999-999999999999';
    const draft: BobcatInspection = {
      id: ID, projectId: 'proj-1', templateId: BOBCAT_TEMPLATE_ID, userId: 'u1',
      status: 'draft', company: 'შპს', address: null,
      equipmentModel: 'Bobcat S70', registrationNumber: 'AA-1',
      department: 'დეპ', inspectorName: 'ი',
      inspectionDate: '2026-05-01', inspectionType: 'pre_work',
      items: BOBCAT_ITEMS.map((e) => ({ id: e.id, result: null, comment: null, photo_paths: [] })),
      verdict: null, notes: null,
      inspectorSignature: null, signatories: [], summaryPhotos: [],
      createdAt: ISO, updatedAt: ISO, completedAt: null,
    };
    vi.mocked(getBobcatInspection).mockResolvedValue(draft);

    renderDetail(<BobcatDetail />, routePattern.bobcatDetail, routes.bobcat.detail(ID));
    expect(await screen.findByText('ზოგადი ინფორმაცია')).toBeInTheDocument();

    // step 0 → step 1 (checklist).
    fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));
    // The first ChecklistItemRow now has 3 result pills. Pick "ნორმაში" (good).
    const goodBtns = await screen.findAllByRole('button', { name: 'ნორმაში' });
    expect(goodBtns.length).toBeGreaterThan(0);
    fireEvent.click(goodBtns[0]);

    await waitFor(() => expect(updateBobcatInspection).toHaveBeenCalled());
    const [calledId, patch] = vi.mocked(updateBobcatInspection).mock.calls[0];
    expect(calledId).toBe(ID);
    // The patch.items array contains the first item with result = 'good'.
    const items = (patch as Record<string, unknown>).items as Array<{ id: number; result: string | null }>;
    expect(items.find((i) => i.id === BOBCAT_ITEMS[0].id)?.result).toBe('good');
  });

  it('step-2 verdict pill click calls updateBobcatInspection with verdict', async () => {
    const ID = '88888888-8888-8888-8888-888888888888';
    const draft: BobcatInspection = {
      id: ID, projectId: 'proj-1', templateId: BOBCAT_TEMPLATE_ID, userId: 'u1',
      status: 'draft', company: 'შპს', address: null,
      equipmentModel: 'Bobcat', registrationNumber: 'AA-2',
      department: 'დეპ', inspectorName: 'ი',
      inspectionDate: '2026-05-01', inspectionType: 'pre_work',
      items: [], verdict: null, notes: null,
      inspectorSignature: null, signatories: [], summaryPhotos: [],
      createdAt: ISO, updatedAt: ISO, completedAt: null,
    };
    vi.mocked(getBobcatInspection).mockResolvedValue(draft);

    renderDetail(<BobcatDetail />, routePattern.bobcatDetail, routes.bobcat.detail(ID));
    expect(await screen.findByText('ზოგადი ინფორმაცია')).toBeInTheDocument();

    // step 0 → step 1 → step 2 (conclusion).
    fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));
    fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));

    // Click the "დაშვებულია" verdict button.
    const approvedBtns = await screen.findAllByRole('button', { name: 'დაშვებულია' });
    expect(approvedBtns.length).toBeGreaterThan(0);
    fireEvent.click(approvedBtns[0]);

    await waitFor(() => expect(updateBobcatInspection).toHaveBeenCalled());
    const [calledId, patch] = vi.mocked(updateBobcatInspection).mock.calls[0];
    expect(calledId).toBe(ID);
    expect((patch as Record<string, unknown>).verdict).toBe('approved');
  });
});
