/**
 * GeneralEquipmentDetail (34% covered) — walk step 1 to step 2, exercise the
 * row condition pill + the conclusion textarea.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@/test-utils';
import { routePattern, routes } from '@/app/routes';

vi.mock('@/lib/data/projects', async (io) => ({ ...(await io<object>()), getProject: vi.fn() }));
vi.mock('@/lib/data/generalEquipment', async (io) => ({
  ...(await io<object>()),
  getGeneralEquipmentInspection: vi.fn(),
  updateGeneralEquipmentInspection: vi.fn(),
  deleteGeneralEquipmentInspection: vi.fn(),
  createGeneralEquipmentInspection: vi.fn(),
}));

import GeneralEquipmentDetail from '@/features/inspections/equipment/GeneralEquipmentDetail';

import { getProject } from '@/lib/data/projects';
import {
  getGeneralEquipmentInspection, updateGeneralEquipmentInspection,
  type GeneralEquipmentInspection,
} from '@/lib/data/generalEquipment';

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
    id: 'proj-1', user_id: 'u1', name: 'პროექტი', company_name: 'შპს კ',
    address: null, contact_phone: null, logo: null, crew: null,
    latitude: null, longitude: null, created_at: ISO,
  } as never);
  vi.mocked(updateGeneralEquipmentInspection).mockResolvedValue(undefined);
});

describe('GeneralEquipmentDetail — step-1 condition pill', () => {
  it('clicking a row condition pill calls updateGeneralEquipmentInspection', async () => {
    const ID = '11111111-2222-3333-4444-555555555555';
    const draft: GeneralEquipmentInspection = {
      id: ID, status: 'draft',
      projectId: 'proj-1', templateId: null, userId: 'u1',
      objectName: 'A', address: null, activityType: 'სამშენებლო',
      actNumber: 'N-1', department: 'დეპ', inspectorName: 'ი',
      inspectionDate: '2026-05-01', inspectionType: 'initial',
      equipment: [
        { id: 'r1', name: 'ხერხი', model: 'M1', serialNumber: 'S1', condition: null, note: '', photo_paths: [] },
      ],
      inspectorSignature: null, signatories: [],
      signerName: 'X', signerRole: 'technician', signerRoleCustom: null,
      summaryPhotos: [], conclusion: '',
      createdAt: ISO, updatedAt: ISO, completedAt: null,
    };
    vi.mocked(getGeneralEquipmentInspection).mockResolvedValue(draft);

    renderDetail(<GeneralEquipmentDetail />, routePattern.generalEquipmentDetail, routes.generalEquipment.detail(ID));
    expect(await screen.findByText('ზოგადი ინფორმაცია')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));
    await screen.findByDisplayValue('ხერხი');

    // Click ნორმაში on the row.
    const goodBtns = screen.getAllByRole('button', { name: 'ნორმაში' });
    fireEvent.click(goodBtns[0]);

    await waitFor(() => expect(updateGeneralEquipmentInspection).toHaveBeenCalled());
    const [calledId, patch] = vi.mocked(updateGeneralEquipmentInspection).mock.calls[0];
    expect(calledId).toBe(ID);
    expect((patch as Record<string, unknown>).equipment[0].condition).toBe('good');
  });

  it('step-2: conclusion textarea blur fires updateGeneralEquipmentInspection', async () => {
    const ID = '22222222-aaaa-bbbb-cccc-555555555555';
    const draft: GeneralEquipmentInspection = {
      id: ID, status: 'draft',
      projectId: 'proj-1', templateId: null, userId: 'u1',
      objectName: 'A', address: null, activityType: 'სამშენებლო',
      actNumber: 'N-1', department: 'დეპ', inspectorName: 'ი',
      inspectionDate: '2026-05-01', inspectionType: 'initial',
      equipment: [],
      inspectorSignature: null, signatories: [],
      signerName: 'X', signerRole: 'technician', signerRoleCustom: null,
      summaryPhotos: [], conclusion: '',
      createdAt: ISO, updatedAt: ISO, completedAt: null,
    };
    vi.mocked(getGeneralEquipmentInspection).mockResolvedValue(draft);

    renderDetail(<GeneralEquipmentDetail />, routePattern.generalEquipmentDetail, routes.generalEquipment.detail(ID));
    expect(await screen.findByText('ზოგადი ინფორმაცია')).toBeInTheDocument();

    // step 0 → 1 → 2.
    fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));
    fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));

    const conclusionTextarea = await screen.findByPlaceholderText('დასკვნის ტექსტი');
    fireEvent.change(conclusionTextarea, { target: { value: 'OK' } });
    fireEvent.blur(conclusionTextarea);

    await waitFor(() => expect(updateGeneralEquipmentInspection).toHaveBeenCalled());
    const calls = vi.mocked(updateGeneralEquipmentInspection).mock.calls;
    const conclusionCall = calls.find(([, p]) => (p as Record<string, unknown>).conclusion === 'OK');
    expect(conclusionCall).toBeTruthy();
  });
});
