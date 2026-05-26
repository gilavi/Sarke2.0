/**
 * Deeper interaction tests for ExcavatorDetail (30% coverage) and
 * GeneralEquipmentDetail (34%). Walks step 0 → 1 → 2 and exercises the
 * checklist-result + verdict pills.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@/test-utils';
import { routePattern, routes } from '@/app/routes';

vi.mock('@/lib/data/projects', async (io) => ({ ...(await io<object>()), getProject: vi.fn() }));
vi.mock('@/lib/data/excavator', async (io) => ({
  ...(await io<object>()),
  getExcavatorInspection: vi.fn(),
  updateExcavatorInspection: vi.fn(),
  deleteExcavatorInspection: vi.fn(),
  createExcavatorInspection: vi.fn(),
}));
vi.mock('@/lib/data/generalEquipment', async (io) => ({
  ...(await io<object>()),
  getGeneralEquipmentInspection: vi.fn(),
  updateGeneralEquipmentInspection: vi.fn(),
  deleteGeneralEquipmentInspection: vi.fn(),
  createGeneralEquipmentInspection: vi.fn(),
}));

import ExcavatorDetail from '@/features/inspections/equipment/ExcavatorDetail';
import GeneralEquipmentDetail from '@/features/inspections/equipment/GeneralEquipmentDetail';

import { getProject } from '@/lib/data/projects';
import {
  getExcavatorInspection, updateExcavatorInspection,
  EXCAVATOR_MACHINE_SPECS, ENGINE_ITEMS,
  type ExcavatorInspection,
} from '@/lib/data/excavator';
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
const proj = {
  id: 'proj-1', user_id: 'u1', name: 'პროექტი', company_name: 'შპს',
  address: null, contact_phone: null, logo: null, crew: null,
  latitude: null, longitude: null, created_at: ISO,
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  vi.mocked(getProject).mockResolvedValue(proj as never);
});

describe('ExcavatorDetail (checklist walk)', () => {
  it('clicking the ნორმაში pill on a checklist row fires updateExcavatorInspection', async () => {
    const ID = '77777777-7777-7777-7777-777777777777';
    const draft: ExcavatorInspection = {
      id: ID, status: 'draft',
      projectId: 'proj-1', templateId: 'tpl', userId: 'u1',
      serialNumber: 'SN-9', registrationNumber: null, inventoryNumber: 'INV-1',
      projectName: null, department: 'დეპ', inspectorName: 'ი', inspectorPosition: 'უფ',
      inspectionDate: '2026-05-01', lastInspectionDate: null,
      motoHours: 1200, machineSpecs: EXCAVATOR_MACHINE_SPECS,
      engineItems: ENGINE_ITEMS.map((e) => ({ id: e.id, result: null, comment: null, photo_paths: [] })),
      undercarriageItems: [], cabinItems: [], safetyItems: [], maintenanceItems: [],
      inspectorSignature: null, signatories: [],
      verdict: null, notes: null,
      createdAt: ISO, updatedAt: ISO, completedAt: null,
    };
    vi.mocked(getExcavatorInspection).mockResolvedValue(draft);
    vi.mocked(updateExcavatorInspection).mockResolvedValue(undefined);

    renderDetail(<ExcavatorDetail />, routePattern.excavatorDetail, routes.excavator.detail(ID));
    expect(await screen.findByText('ზოგადი ინფორმაცია')).toBeInTheDocument();

    // step 0 → step 1 (checklist).
    fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));

    const goodBtns = await screen.findAllByRole('button', { name: 'ნორმაში' });
    fireEvent.click(goodBtns[0]);
    await waitFor(() => expect(updateExcavatorInspection).toHaveBeenCalled());
  });

  it('step 2 verdict pill click fires updateExcavatorInspection with verdict', async () => {
    const ID = '66666666-6666-6666-6666-666666666666';
    const draft: ExcavatorInspection = {
      id: ID, status: 'draft',
      projectId: 'proj-1', templateId: 'tpl', userId: 'u1',
      serialNumber: 'SN-9', registrationNumber: null, inventoryNumber: 'INV-1',
      projectName: null, department: 'დეპ', inspectorName: 'ი', inspectorPosition: 'უფ',
      inspectionDate: '2026-05-01', lastInspectionDate: null,
      motoHours: 1200, machineSpecs: EXCAVATOR_MACHINE_SPECS,
      engineItems: [], undercarriageItems: [], cabinItems: [],
      safetyItems: [], maintenanceItems: [],
      inspectorSignature: null, signatories: [], verdict: null, notes: null,
      createdAt: ISO, updatedAt: ISO, completedAt: null,
    };
    vi.mocked(getExcavatorInspection).mockResolvedValue(draft);
    vi.mocked(updateExcavatorInspection).mockResolvedValue(undefined);

    renderDetail(<ExcavatorDetail />, routePattern.excavatorDetail, routes.excavator.detail(ID));
    expect(await screen.findByText('ზოგადი ინფორმაცია')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));
    fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));

    // The conclusion step has a verdict SegmentedControl with "გამართულია — სამუშაოდ დაიშვება".
    const approvedBtns = await screen.findAllByRole('button', { name: /გამართულია/ });
    expect(approvedBtns.length).toBeGreaterThan(0);
    fireEvent.click(approvedBtns[0]);
    await waitFor(() =>
      expect(updateExcavatorInspection).toHaveBeenCalledWith(
        ID,
        expect.objectContaining({ verdict: 'approved' }),
      ),
    );
  });
});

describe('GeneralEquipmentDetail (checklist walk)', () => {
  it('mounts a draft with one equipment row and can advance to step 1', async () => {
    const ID = '55555555-5555-5555-5555-555555555555';
    const draft: GeneralEquipmentInspection = {
      id: ID, status: 'draft',
      projectId: 'proj-1', templateId: null, userId: 'u1',
      objectName: 'ობიექტი A', address: null, activityType: 'სამშენებლო',
      actNumber: 'N-1', department: 'დეპ', inspectorName: 'ი',
      inspectionDate: '2026-05-01', inspectionType: 'initial',
      equipment: [
        { id: 'row-1', name: 'ხერხი', model: 'M1', serialNumber: 'S1', condition: 'good', note: '', photo_paths: [] },
      ],
      inspectorSignature: null, signatories: [],
      signerName: 'ხელმომწერი', signerRole: 'technician', signerRoleCustom: null,
      summaryPhotos: [], conclusion: 'OK',
      createdAt: ISO, updatedAt: ISO, completedAt: null,
    };
    vi.mocked(getGeneralEquipmentInspection).mockResolvedValue(draft);
    vi.mocked(updateGeneralEquipmentInspection).mockResolvedValue(undefined);

    renderDetail(<GeneralEquipmentDetail />, routePattern.generalEquipmentDetail, routes.generalEquipment.detail(ID));
    expect(await screen.findByText('ზოგადი ინფორმაცია')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));
    // Step 1 — the row name "ხერხი" appears.
    expect(await screen.findByDisplayValue('ხერხი')).toBeInTheDocument();
  });
});
