/**
 * Mount / smoke tests for the four equipment inspection detail components
 * (bobcat, excavator, general-equipment, cargo-platform), which render Georgian
 * legal inspection acts on the shared engine in
 * `src/features/inspections/equipment/`.
 *
 * These guard the render tree, not behavior: each test loads a COMPLETED
 * (read-only) inspection, asserts the component mounts past the loading skeleton,
 * renders its wizard step labels, and — by clicking through every step — renders
 * every step branch without throwing (where a runtime crash would otherwise
 * hide). The per-type data module is mocked so only the async fetch fns are
 * stubbed; the real checklist catalogs / label maps are kept (importActual), so
 * the components render exactly what they would in production.
 *
 * Note: the green "completed" banner is only shown after an in-session complete
 * mutation (`justCompleted`), not on a freshly-loaded completed act — so these
 * assert the completed *status* line + the read-only verdict/conclusion text
 * instead.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ReactElement } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@/test-utils';
import { routePattern, routes } from '@/app/routes';
import type { Project } from '@/lib/data/projects';

// ── Module mocks: keep real catalogs/labels, stub only the async data fns ──────
vi.mock('@/lib/data/projects', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/data/projects')>();
  return { ...actual, getProject: vi.fn() };
});
vi.mock('@/lib/data/bobcat', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/data/bobcat')>();
  return {
    ...actual,
    getBobcatInspection: vi.fn(),
    updateBobcatInspection: vi.fn(),
    deleteBobcatInspection: vi.fn(),
    createBobcatInspection: vi.fn(),
  };
});
vi.mock('@/lib/data/excavator', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/data/excavator')>();
  return {
    ...actual,
    getExcavatorInspection: vi.fn(),
    updateExcavatorInspection: vi.fn(),
    deleteExcavatorInspection: vi.fn(),
    createExcavatorInspection: vi.fn(),
  };
});
vi.mock('@/lib/data/generalEquipment', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/data/generalEquipment')>();
  return {
    ...actual,
    getGeneralEquipmentInspection: vi.fn(),
    updateGeneralEquipmentInspection: vi.fn(),
    deleteGeneralEquipmentInspection: vi.fn(),
    createGeneralEquipmentInspection: vi.fn(),
  };
});
vi.mock('@/lib/data/cargoPlatform', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/data/cargoPlatform')>();
  return {
    ...actual,
    getCargoPlatformInspection: vi.fn(),
    updateCargoPlatformInspection: vi.fn(),
    deleteCargoPlatformInspection: vi.fn(),
    createCargoPlatformInspection: vi.fn(),
  };
});

import BobcatDetail from '@/features/inspections/equipment/BobcatDetail';
import ExcavatorDetail from '@/features/inspections/equipment/ExcavatorDetail';
import GeneralEquipmentDetail from '@/features/inspections/equipment/GeneralEquipmentDetail';
import CargoPlatformDetail from '@/features/inspections/equipment/CargoPlatformDetail';

import { getProject } from '@/lib/data/projects';
import {
  getBobcatInspection,
  BOBCAT_TEMPLATE_ID,
  type BobcatInspection,
  type BobcatInspectionType,
} from '@/lib/data/bobcat';
import {
  getExcavatorInspection,
  EXCAVATOR_MACHINE_SPECS,
  EXCAVATOR_VERDICT_LABEL,
  type ExcavatorInspection,
  type ExcavatorVerdict,
} from '@/lib/data/excavator';
import {
  getGeneralEquipmentInspection,
  type GeneralEquipmentInspection,
} from '@/lib/data/generalEquipment';
import {
  getCargoPlatformInspection,
  type CargoPlatformInspection,
  type CPSignatory,
} from '@/lib/data/cargoPlatform';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Escape a string for safe use inside a RegExp text matcher. */
function textRx(s: string): RegExp {
  return new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
}

function renderDetail(element: ReactElement, pattern: string, path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
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

const stubProject: Project = {
  id: 'proj-1',
  user_id: 'u1',
  name: 'ტესტ პროექტი',
  company_name: 'ტესტ კომპანია',
  address: null,
  contact_phone: null,
  logo: null,
  crew: null,
  latitude: null,
  longitude: null,
  created_at: '2026-01-01T00:00:00.000Z',
};

const ISO = '2026-05-01T00:00:00.000Z';

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  vi.mocked(getProject).mockResolvedValue(stubProject);
});

// ── Bobcat ──────────────────────────────────────────────────────────────────

describe('BobcatDetail', () => {
  const ID = '11111111-1111-1111-1111-111111111111';
  const fixture: BobcatInspection = {
    id: ID,
    projectId: 'proj-1',
    templateId: BOBCAT_TEMPLATE_ID,
    userId: 'u1',
    status: 'completed',
    company: 'შპს ალფა',
    address: null,
    equipmentModel: 'Bobcat S70',
    registrationNumber: 'AA-123',
    department: 'ექსპლუატაცია',
    inspectorName: 'გ. ხელაძე',
    inspectionDate: '2026-05-01',
    inspectionType: 'pre_work' as BobcatInspectionType,
    items: [],
    verdict: 'approved',
    notes: 'ბობკატის ჩანაწერი',
    inspectorSignature: null,
    signatories: [],
    createdAt: ISO,
    updatedAt: ISO,
    completedAt: ISO,
  };

  it('mounts a completed act and renders every step branch', async () => {
    vi.mocked(getBobcatInspection).mockResolvedValue(fixture);
    renderDetail(<BobcatDetail />, routePattern.bobcatDetail, routes.bobcat.detail(ID));

    // Mounted past the loading skeleton → completed status line.
    expect(await screen.findByText(/დასრულდა/)).toBeInTheDocument();

    // All three step labels present.
    expect(screen.getByRole('button', { name: /ინფო/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /შემოწმება/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /დასკვნა/ })).toBeInTheDocument();

    // Step through checklist → conclusion (renders the heavy branches).
    fireEvent.click(screen.getByRole('button', { name: /შემოწმება/ }));
    fireEvent.click(screen.getByRole('button', { name: /დასკვნა/ }));

    // Read-only verdict + notes.
    expect(screen.getByText(/დაშვებულია/)).toBeInTheDocument();
    expect(screen.getByText(/ბობკატის ჩანაწერი/)).toBeInTheDocument();
  });
});

// ── Excavator ───────────────────────────────────────────────────────────────

describe('ExcavatorDetail', () => {
  const ID = '22222222-2222-2222-2222-222222222222';
  const verdict = Object.keys(EXCAVATOR_VERDICT_LABEL)[0] as ExcavatorVerdict;
  const fixture: ExcavatorInspection = {
    id: ID,
    status: 'completed',
    projectId: 'proj-1',
    templateId: 'tpl',
    userId: 'u1',
    serialNumber: 'SN-9',
    registrationNumber: null,
    inventoryNumber: 'INV-1',
    projectName: null,
    department: 'დეპ',
    inspectorName: 'ინსპ',
    inspectorPosition: 'უფროსი',
    inspectionDate: '2026-05-01',
    lastInspectionDate: null,
    motoHours: 1200,
    machineSpecs: EXCAVATOR_MACHINE_SPECS,
    engineItems: [],
    undercarriageItems: [],
    cabinItems: [],
    safetyItems: [],
    maintenanceItems: [],
    inspectorSignature: null,
    signatories: [],
    verdict,
    notes: 'ექსკავატორის ჩანაწერი',
    createdAt: ISO,
    updatedAt: ISO,
    completedAt: ISO,
  };

  it('mounts a completed act and renders every step branch', async () => {
    vi.mocked(getExcavatorInspection).mockResolvedValue(fixture);
    renderDetail(<ExcavatorDetail />, routePattern.excavatorDetail, routes.excavator.detail(ID));

    expect(await screen.findByText(/დასრულდა/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ინფო/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /შემოწმება/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /დასკვნა/ })).toBeInTheDocument();

    // Step 1 renders the 4 checklist sections + maintenance; step 2 the verdict.
    fireEvent.click(screen.getByRole('button', { name: /შემოწმება/ }));
    fireEvent.click(screen.getByRole('button', { name: /დასკვნა/ }));

    expect(screen.getByText(textRx(EXCAVATOR_VERDICT_LABEL[verdict]))).toBeInTheDocument();
    expect(screen.getByText(/ექსკავატორის ჩანაწერი/)).toBeInTheDocument();
  });
});

// ── General equipment ─────────────────────────────────────────────────────────

describe('GeneralEquipmentDetail', () => {
  const ID = '33333333-3333-3333-3333-333333333333';
  const fixture: GeneralEquipmentInspection = {
    id: ID,
    status: 'completed',
    projectId: 'proj-1',
    templateId: null,
    userId: 'u1',
    objectName: 'ობიექტი A',
    address: null,
    activityType: 'სამშენებლო',
    actNumber: 'N-1',
    department: 'დეპ',
    inspectorName: 'ინსპ',
    inspectionDate: '2026-05-01',
    inspectionType: 'initial',
    equipment: [
      { id: 'row-1', name: 'ხერხი', model: 'M1', serialNumber: 'S1', condition: 'good', note: '', photo_paths: [] },
    ],
    inspectorSignature: null,
    signatories: [],
    signerName: 'ხელმომწერი',
    signerRole: 'technician',
    signerRoleCustom: null,
    summaryPhotos: [],
    conclusion: 'ტექ. დასკვნა OK',
    createdAt: ISO,
    updatedAt: ISO,
    completedAt: ISO,
  };

  it('mounts a completed act and renders every step branch', async () => {
    vi.mocked(getGeneralEquipmentInspection).mockResolvedValue(fixture);
    renderDetail(
      <GeneralEquipmentDetail />,
      routePattern.generalEquipmentDetail,
      routes.generalEquipment.detail(ID),
    );

    expect(await screen.findByText(/დასრულდა/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ინფო/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /შემოწმება/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /დასკვნა/ })).toBeInTheDocument();

    // Step 1 renders the equipment row; the condition pills render as text
    // (the row name is an <input> value, not a text node).
    fireEvent.click(screen.getByRole('button', { name: /შემოწმება/ }));
    expect(screen.getByText(/ნორმაში/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /დასკვნა/ }));
    expect(screen.getByText(/ტექ\. დასკვნა OK/)).toBeInTheDocument();
  });
});

// ── Cargo platform (6 steps, mobile-only signing) ─────────────────────────────

describe('CargoPlatformDetail', () => {
  const ID = '44444444-4444-4444-4444-444444444444';
  const emptySig = (): CPSignatory => ({ name: '', position: '', organization: '', signature: null, date: null });
  const fixture: CargoPlatformInspection = {
    id: ID,
    projectId: 'proj-1',
    templateId: null,
    userId: 'u1',
    status: 'completed',
    company: 'შპს ბეტა',
    address: 'თბილისი',
    inspectorName: 'ინსპ',
    floorZone: '2',
    inspectionDate: '2026-05-01',
    platformTypeModel: 'P-100',
    platformLength: 4,
    platformWidth: 2,
    platformColorDesc: 'ლურჯი',
    sideGuardrail: 'complete',
    frontGuardrail: 'complete',
    guardrailHeight: 'standard',
    cargo: [
      { id: 'c-1', name: 'ფილა', unit_weight_kg: 10, total_weight_kg: 100, note: '' },
    ],
    items: [{ id: 1, result: 'fix', comment: 'გამოსასწორებელია', photo_paths: [] }],
    verdict: 'approved',
    verdictComment: 'ყველაფერი წესრიგშია',
    summaryPhotos: [],
    signatures: [emptySig(), emptySig()],
    signatories: [],
    completedAt: ISO,
    createdAt: ISO,
    updatedAt: ISO,
  };

  it('mounts a completed act and renders all six step branches', async () => {
    vi.mocked(getCargoPlatformInspection).mockResolvedValue(fixture);
    renderDetail(
      <CargoPlatformDetail />,
      routePattern.cargoPlatformDetail,
      routes.cargoPlatform.detail(ID),
    );

    expect(await screen.findByText(/დასრულდა/)).toBeInTheDocument();

    // Six step labels (info / platform / cargo / checklist / verdict / signatures).
    for (const label of [/ინფო/, /პლატფ/, /ტვირთი/, /შემოწმება/, /დასკვნა/, /ხელმოწ/]) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }

    // Walk every step so each branch renders. The cargo total renders as text
    // (the row name/weight are <input> values, not text nodes).
    fireEvent.click(screen.getByRole('button', { name: /პლატფ/ }));
    fireEvent.click(screen.getByRole('button', { name: /ტვირთი/ }));
    expect(screen.getByText(/სულ:/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^\d.*შემოწმება/ }));
    fireEvent.click(screen.getByRole('button', { name: /დასკვნა/ }));
    expect(screen.getByText(/ყველაფერი წესრიგშია/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /ხელმოწ/ }));
    // Both signatory slots are unsigned in the fixture → mobile-signing placeholder.
    expect(screen.getAllByText(/მობილური აპიდან/)).toHaveLength(2);
  });
});
