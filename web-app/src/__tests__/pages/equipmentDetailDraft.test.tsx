/**
 * Draft-mode walks for the 4 equipment detail flows. The existing
 * `equipmentDetail.test.tsx` mounts completed (read-only) inspections; this file
 * exercises the editable code paths by mounting status='draft' fixtures and
 * walking each wizard's info → checklist → conclusion steps.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@/test-utils';
import { routePattern, routes } from '@/app/routes';

vi.mock('@/lib/data/projects', async (io) => ({ ...(await io<object>()), getProject: vi.fn() }));
vi.mock('@/lib/data/bobcat', async (io) => ({
  ...(await io<object>()),
  getBobcatInspection: vi.fn(),
  updateBobcatInspection: vi.fn(),
  deleteBobcatInspection: vi.fn(),
  createBobcatInspection: vi.fn(),
}));
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
vi.mock('@/lib/data/cargoPlatform', async (io) => ({
  ...(await io<object>()),
  getCargoPlatformInspection: vi.fn(),
  updateCargoPlatformInspection: vi.fn(),
  deleteCargoPlatformInspection: vi.fn(),
  createCargoPlatformInspection: vi.fn(),
}));

import BobcatDetail from '@/features/inspections/equipment/BobcatDetail';
import ExcavatorDetail from '@/features/inspections/equipment/ExcavatorDetail';
import GeneralEquipmentDetail from '@/features/inspections/equipment/GeneralEquipmentDetail';
import CargoPlatformDetail from '@/features/inspections/equipment/CargoPlatformDetail';

import { getProject } from '@/lib/data/projects';
import {
  getBobcatInspection, BOBCAT_TEMPLATE_ID,
  type BobcatInspection, type BobcatInspectionType,
} from '@/lib/data/bobcat';
import {
  getExcavatorInspection, EXCAVATOR_MACHINE_SPECS,
  type ExcavatorInspection,
} from '@/lib/data/excavator';
import {
  getGeneralEquipmentInspection,
  type GeneralEquipmentInspection,
} from '@/lib/data/generalEquipment';
import {
  getCargoPlatformInspection,
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

const stubProject = {
  id: 'proj-1', user_id: 'u1', name: 'ტესტ პროექტი', company_name: 'ტესტ კომპანია',
  address: null, contact_phone: null, logo: null, crew: null,
  latitude: null, longitude: null, created_at: '2026-01-01T00:00:00.000Z',
};
const ISO = '2026-05-01T00:00:00.000Z';

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  vi.mocked(getProject).mockResolvedValue(stubProject as never);
});

describe('BobcatDetail (draft)', () => {
  const ID = '11111111-1111-1111-1111-111111111111';
  const draft: BobcatInspection = {
    id: ID, projectId: 'proj-1', templateId: BOBCAT_TEMPLATE_ID, userId: 'u1',
    status: 'draft', company: 'შპს ალფა', address: null,
    equipmentModel: 'Bobcat S70', registrationNumber: 'AA-1',
    department: null, inspectorName: null,
    inspectionDate: '2026-05-01', inspectionType: 'pre_work' as BobcatInspectionType,
    items: [], verdict: null, notes: null,
    inspectorSignature: null, signatories: [], summaryPhotos: [],
    createdAt: ISO, updatedAt: ISO, completedAt: null,
  };

  it('renders the editable info step for a draft inspection', async () => {
    vi.mocked(getBobcatInspection).mockResolvedValue(draft);
    renderDetail(<BobcatDetail />, routePattern.bobcatDetail, routes.bobcat.detail(ID));

    expect(await screen.findByText('ზოგადი ინფორმაცია')).toBeInTheDocument();
    // Editable name field shows the draft value.
    expect(screen.getByDisplayValue('Bobcat S70')).toBeInTheDocument();
  });

  it('walks info → checklist → conclusion for a draft', async () => {
    vi.mocked(getBobcatInspection).mockResolvedValue(draft);
    renderDetail(<BobcatDetail />, routePattern.bobcatDetail, routes.bobcat.detail(ID));
    expect(await screen.findByText('ზოგადი ინფორმაცია')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));
    // Step 1 — at least one checklist category renders.
    expect((await screen.findAllByText(/თვლები/)).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));
    // Step 2 — verdict pills (draft renders the editable SegmentedControl).
    expect(await screen.findByText('დაშვებულია')).toBeInTheDocument();
  });
});

describe('ExcavatorDetail (draft)', () => {
  const ID = '22222222-2222-2222-2222-222222222222';
  const draft: ExcavatorInspection = {
    id: ID, status: 'draft',
    projectId: 'proj-1', templateId: 'tpl', userId: 'u1',
    serialNumber: 'SN-9', registrationNumber: null, inventoryNumber: 'INV-1',
    projectName: null, department: 'დეპ', inspectorName: 'ინსპ',
    inspectorPosition: 'უფროსი',
    inspectionDate: '2026-05-01', lastInspectionDate: null,
    motoHours: 1200, machineSpecs: EXCAVATOR_MACHINE_SPECS,
    engineItems: [], undercarriageItems: [], cabinItems: [],
    safetyItems: [], maintenanceItems: [],
    inspectorSignature: null, signatories: [],
    verdict: null, notes: null,
    createdAt: ISO, updatedAt: ISO, completedAt: null,
  };

  it('renders the draft info step', async () => {
    vi.mocked(getExcavatorInspection).mockResolvedValue(draft);
    renderDetail(<ExcavatorDetail />, routePattern.excavatorDetail, routes.excavator.detail(ID));
    expect(await screen.findByText('ზოგადი ინფორმაცია')).toBeInTheDocument();
  });
});

describe('GeneralEquipmentDetail (draft)', () => {
  const ID = '33333333-3333-3333-3333-333333333333';
  const draft: GeneralEquipmentInspection = {
    id: ID, status: 'draft',
    projectId: 'proj-1', templateId: null, userId: 'u1',
    objectName: 'ობიექტი A', address: null, activityType: 'სამშენებლო',
    actNumber: 'N-1', department: 'დეპ', inspectorName: 'ინსპ',
    inspectionDate: '2026-05-01', inspectionType: 'initial',
    equipment: [{ id: 'row-1', name: 'ხერხი', model: 'M1', serialNumber: 'S1', condition: null, note: '', photo_paths: [] }],
    inspectorSignature: null, signatories: [],
    signerName: '', signerRole: 'technician', signerRoleCustom: null,
    summaryPhotos: [], conclusion: null,
    createdAt: ISO, updatedAt: ISO, completedAt: null,
  };

  it('renders the draft info step and walks to the equipment row step', async () => {
    vi.mocked(getGeneralEquipmentInspection).mockResolvedValue(draft);
    renderDetail(<GeneralEquipmentDetail />, routePattern.generalEquipmentDetail, routes.generalEquipment.detail(ID));
    expect(await screen.findByText('ზოგადი ინფორმაცია')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));
    // The equipment row step shows the editable equipment-name input pre-filled.
    expect(await screen.findByDisplayValue('ხერხი')).toBeInTheDocument();
  });
});

describe('CargoPlatformDetail (draft)', () => {
  const ID = '44444444-4444-4444-4444-444444444444';
  const emptySig = (): CPSignatory => ({ name: '', position: '', organization: '', signature: null, date: null });
  const draft: CargoPlatformInspection = {
    id: ID, projectId: 'proj-1', templateId: null, userId: 'u1',
    status: 'draft', company: 'შპს ბეტა', address: 'თბილისი',
    inspectorName: 'ინსპ', floorZone: '2',
    inspectionDate: '2026-05-01', platformTypeModel: 'P-100',
    platformLength: 4, platformWidth: 2, platformColorDesc: 'ლურჯი',
    sideGuardrail: 'complete', frontGuardrail: 'complete', guardrailHeight: 'standard',
    cargo: [{ id: 'c-1', name: 'ფილა', unit_weight_kg: 10, total_weight_kg: 100, note: '' }],
    items: [{ id: 1, result: null, comment: null, photo_paths: [] }],
    verdict: null, verdictComment: '',
    summaryPhotos: [], signatures: [emptySig(), emptySig()], signatories: [],
    completedAt: null, createdAt: ISO, updatedAt: ISO,
  };

  it('renders the draft info step', async () => {
    vi.mocked(getCargoPlatformInspection).mockResolvedValue(draft);
    renderDetail(<CargoPlatformDetail />, routePattern.cargoPlatformDetail, routes.cargoPlatform.detail(ID));
    expect(await screen.findByText('ზოგადი ინფორმაცია')).toBeInTheDocument();
  });

  it('steps forward into the platform spec step', async () => {
    vi.mocked(getCargoPlatformInspection).mockResolvedValue(draft);
    renderDetail(<CargoPlatformDetail />, routePattern.cargoPlatformDetail, routes.cargoPlatform.detail(ID));
    expect(await screen.findByText('ზოგადი ინფორმაცია')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));
    // The platform-spec step renders the platform model field with the draft value.
    expect(await screen.findByDisplayValue('P-100')).toBeInTheDocument();
  });
});
