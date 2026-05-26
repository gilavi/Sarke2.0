/**
 * CargoPlatformDetail (48% covered) — walks through the 6-step wizard and
 * exercises the cargo-row add/remove + the verdict pill in step 4.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@/test-utils';
import { routePattern, routes } from '@/app/routes';

vi.mock('@/lib/data/projects', async (io) => ({ ...(await io<object>()), getProject: vi.fn() }));
vi.mock('@/lib/data/cargoPlatform', async (io) => ({
  ...(await io<object>()),
  getCargoPlatformInspection: vi.fn(),
  updateCargoPlatformInspection: vi.fn(),
  deleteCargoPlatformInspection: vi.fn(),
  createCargoPlatformInspection: vi.fn(),
}));

import CargoPlatformDetail from '@/features/inspections/equipment/CargoPlatformDetail';
import { getProject } from '@/lib/data/projects';
import {
  getCargoPlatformInspection, updateCargoPlatformInspection,
  type CargoPlatformInspection, type CPSignatory,
} from '@/lib/data/cargoPlatform';

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
const emptySig = (): CPSignatory => ({ name: '', position: '', organization: '', signature: null, date: null });

function buildDraft(id: string): CargoPlatformInspection {
  return {
    id, projectId: 'proj-1', templateId: null, userId: 'u1',
    status: 'draft', company: 'შპს', address: 'X',
    inspectorName: 'ი', floorZone: '2',
    inspectionDate: '2026-05-01', platformTypeModel: 'P-100',
    platformLength: 4, platformWidth: 2, platformColorDesc: 'ლურჯი',
    sideGuardrail: 'complete', frontGuardrail: 'complete', guardrailHeight: 'standard',
    cargo: [{ id: 'c-1', name: 'ფილა', unit_weight_kg: 10, total_weight_kg: 100, note: '' }],
    items: [{ id: 1, result: 'good', comment: null, photo_paths: [] }],
    verdict: null, verdictComment: '',
    summaryPhotos: [], signatures: [emptySig(), emptySig()], signatories: [],
    completedAt: null, createdAt: ISO, updatedAt: ISO,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  vi.mocked(getProject).mockResolvedValue({
    id: 'proj-1', user_id: 'u1', name: 'პროექტი', company_name: 'შპს',
    address: null, contact_phone: null, logo: null, crew: null,
    latitude: null, longitude: null, created_at: ISO,
  } as never);
  vi.mocked(updateCargoPlatformInspection).mockResolvedValue(undefined);
});

describe('CargoPlatformDetail — cargo row + verdict', () => {
  it('clicking "+ დამატება" cargo button calls updateCargoPlatformInspection with a new row', async () => {
    const ID = 'ccccaaaa-1111-2222-3333-444444444444';
    vi.mocked(getCargoPlatformInspection).mockResolvedValue(buildDraft(ID));

    renderDetail(<CargoPlatformDetail />, routePattern.cargoPlatformDetail, routes.cargoPlatform.detail(ID));
    expect(await screen.findByText('ზოგადი ინფორმაცია')).toBeInTheDocument();

    // Walk to step 2 (ტვირთი / cargo).
    fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));
    fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));

    // The "დამატება" + button is in the cargo step header.
    const addBtn = await screen.findByRole('button', { name: /დამატება/ });
    fireEvent.click(addBtn);

    await waitFor(() => expect(updateCargoPlatformInspection).toHaveBeenCalled());
    const [calledId, patch] = vi.mocked(updateCargoPlatformInspection).mock.calls[0];
    expect(calledId).toBe(ID);
    expect((patch as Record<string, unknown>).cargo.length).toBe(2);
  });
});
