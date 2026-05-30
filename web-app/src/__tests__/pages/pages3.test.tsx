/**
 * Batch mount tests for many remaining pages — each one is a render-with-empty
 * (or not-found) test that covers the component body, query setup, and the
 * relevant headline UI. Heavy children (modals, signature pad, photo zone,
 * inspection wizard) are stubbed so we exercise the page itself without dragging
 * in their deps.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { screen, waitFor } from '@/test-utils';
import { renderPage } from '../helpers/renderPage';

vi.mock('@/lib/auth', () => ({ useAuth: vi.fn() }));
vi.mock('@/lib/documentNames', () => ({
  useInspectionName: () => () => 'tpl',
  equipmentInspectionName: (t: string) => ({
    bobcat: 'ციცხვიანი დამტვირთველი',
    excavator: 'ექსკავატორი',
    general: 'ტექნიკური აღჭურვილობა',
    cargo_platform: 'ტვირთის მიმღები პლატფორმა',
  }[t] ?? t),
  inspectionDisplayName: (s: string | null | undefined) => s ?? 'შემოწმების აქტი',
  reportDisplayName: (s: string | null | undefined) => s ?? 'რეპორტი',
  certificateDisplayName: (s: string | null | undefined) => s ?? 'სერტიფიკატი',
}));
vi.mock('@/components/InspectionWizard', () => ({ default: () => null }));
vi.mock('@/components/SignatureCanvas', () => ({ default: () => null }));
vi.mock('@/components/PhotoUploadZone', () => ({ default: () => null }));
vi.mock('@/components/PhotoUploadWidget', () => ({ default: () => null }));
vi.mock('@/components/web/SuccessModal', () => ({ default: () => null }));
vi.mock('@/components/DeleteButton', () => ({ default: () => null }));
vi.mock('@/components/InspectionSignatures', () => ({ default: () => null }));
vi.mock('@/components/InspectionInfoView', () => ({ default: () => null }));
vi.mock('@/lib/data/projects', async (io) => ({
  ...(await io<object>()),
  listProjects: vi.fn(),
  getProject: vi.fn(),
}));
vi.mock('@/lib/data/inspections', async (io) => ({
  ...(await io<object>()),
  listInspections: vi.fn(),
  getInspection: vi.fn(),
  listAnswers: vi.fn(),
  listQuestions: vi.fn(),
  listInspectionPdfs: vi.fn(),
}));
vi.mock('@/lib/data/bobcat', async (io) => ({
  ...(await io<object>()),
  listBobcatInspections: vi.fn(),
  createBobcatInspection: vi.fn(),
}));
vi.mock('@/lib/data/excavator', async (io) => ({
  ...(await io<object>()),
  listExcavatorInspections: vi.fn(),
  createExcavatorInspection: vi.fn(),
}));
vi.mock('@/lib/data/generalEquipment', async (io) => ({
  ...(await io<object>()),
  listGeneralEquipmentInspections: vi.fn(),
  createGeneralEquipmentInspection: vi.fn(),
}));
vi.mock('@/lib/data/cargoPlatform', async (io) => ({
  ...(await io<object>()),
  listCargoPlatformInspections: vi.fn(),
  createCargoPlatformInspection: vi.fn(),
}));
vi.mock('@/lib/data/incidents', async (io) => ({
  ...(await io<object>()),
  listIncidents: vi.fn(),
  createIncident: vi.fn(),
  getIncident: vi.fn(),
}));
vi.mock('@/lib/data/briefings', async (io) => ({
  ...(await io<object>()),
  listBriefings: vi.fn(),
  getBriefing: vi.fn(),
}));
vi.mock('@/lib/data/reports', async (io) => ({
  ...(await io<object>()),
  getReport: vi.fn(),
}));
vi.mock('@/lib/data/templates', async (io) => ({
  ...(await io<object>()),
  listTemplates: vi.fn(),
}));

import { useAuth } from '@/lib/auth';
import { listProjects } from '@/lib/data/projects';
import { listInspections, getInspection, listInspectionPdfs } from '@/lib/data/inspections';
import { listBobcatInspections } from '@/lib/data/bobcat';
import { listExcavatorInspections } from '@/lib/data/excavator';
import { listGeneralEquipmentInspections } from '@/lib/data/generalEquipment';
import { listCargoPlatformInspections } from '@/lib/data/cargoPlatform';
import { listIncidents } from '@/lib/data/incidents';
import { listBriefings } from '@/lib/data/briefings';
import { getReport } from '@/lib/data/reports';
import { listTemplates } from '@/lib/data/templates';

import Calendar from '@/pages/Calendar';
import NewIncident from '@/pages/NewIncident';
import NewOrder from '@/pages/NewOrder';
import NewInspection from '@/pages/NewInspection';
import InspectionDetail from '@/pages/InspectionDetail';
import ReportDetail from '@/pages/ReportDetail';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1' }, profile: null } as unknown as ReturnType<typeof useAuth>);
  vi.mocked(listProjects).mockResolvedValue([]);
  vi.mocked(listInspections).mockResolvedValue([]);
  vi.mocked(listInspectionPdfs).mockResolvedValue([]);
  vi.mocked(listBobcatInspections).mockResolvedValue([]);
  vi.mocked(listExcavatorInspections).mockResolvedValue([]);
  vi.mocked(listGeneralEquipmentInspections).mockResolvedValue([]);
  vi.mocked(listCargoPlatformInspections).mockResolvedValue([]);
  vi.mocked(listIncidents).mockResolvedValue([]);
  vi.mocked(listBriefings).mockResolvedValue([]);
  vi.mocked(listTemplates).mockResolvedValue([]);
});

describe('Calendar', () => {
  it('renders the month/year header for the current month', async () => {
    renderPage(<Calendar />);
    // Header shows `{MONTH_NAMES[month]} {year}` — match any Georgian month name.
    expect(
      await screen.findByText(
        /(იანვარი|თებერვალი|მარტი|აპრილი|მაისი|ივნისი|ივლისი|აგვისტო|სექტემბერი|ოქტომბერი|ნოემბერი|დეკემბერი)\s+\d{4}/,
      ),
    ).toBeInTheDocument();
  });
});

describe('NewIncident', () => {
  it('renders the incident wizard at step 0', () => {
    renderPage(<NewIncident />, '/incidents/new');
    expect(screen.getByText('ახალი ინციდენტი')).toBeInTheDocument();
  });
});

describe('NewOrder', () => {
  it('renders the new-order wizard', () => {
    renderPage(<NewOrder />, '/orders/new');
    expect(screen.getByText('ახალი ბრძანება')).toBeInTheDocument();
  });
});

// The per-type New*Inspection pages were removed when all equipment acts moved to
// the unified structured engine (StructuredActPage); their create flow is now the
// structured wizard, covered by its own tests.

describe('NewInspection', () => {
  it('renders the generic-inspection wizard', () => {
    renderPage(<NewInspection />, '/inspections/new');
    expect(screen.getByText('ახალი შემოწმების აქტი')).toBeInTheDocument();
  });
});

describe('InspectionDetail', () => {
  it('mounts and queries the inspection by id', async () => {
    vi.mocked(getInspection).mockResolvedValue(null);
    renderPage(
      <Routes><Route path="/inspections/:id" element={<InspectionDetail />} /></Routes>,
      '/inspections/x',
    );
    // The mounted component should call getInspection with the route param.
    await waitFor(() => expect(getInspection).toHaveBeenCalledWith('x'));
  });
});

describe('ReportDetail', () => {
  it('shows the not-found state for a missing report', async () => {
    vi.mocked(getReport).mockResolvedValue(null);
    renderPage(
      <Routes><Route path="/reports/:id" element={<ReportDetail />} /></Routes>,
      '/reports/x',
    );
    expect(await screen.findByText('რეპორტი ვერ მოიძებნა.')).toBeInTheDocument();
  });
});
