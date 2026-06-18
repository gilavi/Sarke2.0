import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { screen, waitFor } from '@/test-utils';
import { renderPage } from '../helpers/renderPage';

vi.mock('@/lib/auth', () => ({ useAuth: vi.fn() }));
vi.mock('@/lib/documentNames', () => ({
  useInspectionName: () => () => 'tpl-name',
  equipmentInspectionName: (t: string) => `eq-${t}`,
  reportDisplayName: (s: string | null | undefined) => s ?? 'რეპორტი',
  certificateDisplayName: (s: string | null | undefined) => s ?? 'სერტიფიკატი',
  inspectionDisplayName: (s: string | null | undefined) => s ?? 'შემოწმების აქტი',
}));
vi.mock('@/components/InspectionWizard', () => ({ default: () => null }));
vi.mock('@/components/SignatureCanvas', () => ({ default: () => null }));
vi.mock('@/components/PhotoUploadWidget', () => ({ default: () => null }));
vi.mock('@/components/PhotoUploadZone', () => ({ default: () => null }));
vi.mock('@/components/web/SuccessModal', () => ({ default: () => null }));
vi.mock('@/components/DeleteButton', () => ({ default: () => null }));
vi.mock('@/components/InspectionSignatures', () => ({ default: () => null }));
vi.mock('@/components/InspectionInfoView', () => ({ default: () => null }));
// ProjectDetail sections - mock each to keep the index focused.
vi.mock('@/pages/ProjectDetail/ProjectHeader', () => ({ ProjectHeader: () => <div data-testid="header" /> }));
vi.mock('@/pages/ProjectDetail/ProjectDetailsCard', () => ({ ProjectDetailsCard: () => null }));
vi.mock('@/pages/ProjectDetail/CrewSection', () => ({ CrewSection: () => null }));
vi.mock('@/pages/ProjectDetail/SignersSection', () => ({ SignersSection: () => null }));
vi.mock('@/pages/ProjectDetail/InspectionsSection', () => ({ InspectionsSection: () => null }));
vi.mock('@/pages/ProjectDetail/IncidentsSection', () => ({ IncidentsSection: () => null }));
vi.mock('@/pages/ProjectDetail/BriefingsSection', () => ({ BriefingsSection: () => null }));
vi.mock('@/pages/ProjectDetail/ReportsSection', () => ({ ReportsSection: () => null }));
vi.mock('@/pages/ProjectDetail/FilesSection', () => ({ FilesSection: () => null }));
vi.mock('@/pages/ProjectDetail/OrdersSection', () => ({ OrdersSection: () => null }));
vi.mock('@/pages/ProjectDetail/DangerZoneSection', () => ({ DangerZoneSection: () => null }));
vi.mock('@/lib/data/projects', async (io) => ({ ...(await io<object>()), getProject: vi.fn() }));
vi.mock('@/lib/data/incidents', async (io) => ({ ...(await io<object>()), getIncident: vi.fn() }));
vi.mock('@/lib/data/briefings', async (io) => ({ ...(await io<object>()), getBriefing: vi.fn() }));
vi.mock('@/lib/data/inspections', async (io) => ({
  ...(await io<object>()),
  getInspection: vi.fn(),
  listAnswers: vi.fn(),
  listQuestions: vi.fn(),
  listInspectionPdfs: vi.fn(),
}));
vi.mock('@/lib/data/reports', async (io) => ({ ...(await io<object>()), getReport: vi.fn() }));

import { useAuth } from '@/lib/auth';
import { getProject } from '@/lib/data/projects';
import { getIncident } from '@/lib/data/incidents';
import { getBriefing } from '@/lib/data/briefings';
import { getInspection, listAnswers, listQuestions } from '@/lib/data/inspections';
import { getReport } from '@/lib/data/reports';

import IncidentDetail from '@/pages/IncidentDetail';
import BriefingDetail from '@/pages/BriefingDetail';
import HarnessInspectionDetail from '@/pages/HarnessInspectionDetail';
import ReportDetail from '@/pages/ReportDetail';
import ProjectDetail from '@/pages/ProjectDetail';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1' }, profile: null } as unknown as ReturnType<typeof useAuth>);
  vi.mocked(listAnswers).mockResolvedValue([]);
  vi.mocked(listQuestions).mockResolvedValue([]);
  vi.mocked(getProject).mockResolvedValue({ id: 'p1', name: 'პროექტი' } as never);
});

describe('IncidentDetail (loaded)', () => {
  it('renders the incident header for a minor incident', async () => {
    vi.mocked(getIncident).mockResolvedValue({
      id: 'i1', project_id: 'p1', type: 'minor', injured_name: 'დაშავებული',
      injured_role: 'მუშა', date_time: '2026-05-01T10:00:00Z', location: 'X',
      description: 'აღწერა', cause: 'მიზეზი', actions_taken: 'ქმედება',
      witnesses: [], photos: [], status: 'completed',
      pdf_url: null, inspector_signature: null, created_at: '2026-05-01',
    } as never);
    renderPage(
      <Routes><Route path="/incidents/:id" element={<IncidentDetail />} /></Routes>,
      '/incidents/i1',
    );
    expect(await screen.findByRole('heading', { level: 1, name: 'მსუბუქი' })).toBeInTheDocument();
  });
});

describe('BriefingDetail (loaded)', () => {
  it('renders the briefing detail with a date in the header', async () => {
    vi.mocked(getBriefing).mockResolvedValue({
      id: 'b1', projectId: 'p1', dateTime: '2026-05-01T09:00:00Z',
      topics: ['ppe'], participants: [], inspectorName: 'ი',
      status: 'completed', createdAt: '2026-05-01',
    } as never);
    renderPage(
      <Routes><Route path="/briefings/:id" element={<BriefingDetail />} /></Routes>,
      '/briefings/b1',
    );
    expect(await screen.findByRole('heading', { level: 1, name: /ინსტრუქტაჟი -/ })).toBeInTheDocument();
  });
});

describe('HarnessInspectionDetail (loaded)', () => {
  it('renders the inspection detail with the template name as the title', async () => {
    vi.mocked(getInspection).mockResolvedValue({
      id: 'h1', project_id: 'p1', user_id: 'u1', template_id: 't1', status: 'completed',
      harness_name: null, department: null, inspector_name: 'ი',
      conclusion_text: null, is_safe_for_use: true, inspector_signature: null,
      conclusion_photo_paths: [], signatories: [],
      created_at: '2026-05-01', completed_at: '2026-05-01',
    } as never);
    renderPage(
      <Routes><Route path="/harness/:id" element={<HarnessInspectionDetail />} /></Routes>,
      '/harness/h1',
    );
    expect(await screen.findByRole('heading', { level: 1, name: 'tpl-name' })).toBeInTheDocument();
  });
});

describe('ReportDetail (loaded)', () => {
  it('renders the report title as the h1', async () => {
    vi.mocked(getReport).mockResolvedValue({
      id: 'r1', project_id: 'p1', user_id: 'u1', title: 'ჩემი რეპორტი',
      status: 'completed', slides: [], pdf_url: null, created_at: '2026-05-01',
    } as never);
    renderPage(
      <Routes><Route path="/reports/:id" element={<ReportDetail />} /></Routes>,
      '/reports/r1',
    );
    expect(await screen.findByRole('heading', { level: 1, name: 'ჩემი რეპორტი' })).toBeInTheDocument();
  });
});

describe('ProjectDetail (loaded)', () => {
  it('renders the project with all sections mounted (sections stubbed)', async () => {
    renderPage(
      <Routes><Route path="/projects/:id" element={<ProjectDetail />} /></Routes>,
      '/projects/p1',
    );
    // The ProjectHeader stub renders a sentinel testid.
    expect(await screen.findByTestId('header')).toBeInTheDocument();
    await waitFor(() => expect(getProject).toHaveBeenCalled());
  });

  it('shows the not-found state when the project query returns null', async () => {
    vi.mocked(getProject).mockResolvedValue(null);
    renderPage(
      <Routes><Route path="/projects/:id" element={<ProjectDetail />} /></Routes>,
      '/projects/x',
    );
    expect(await screen.findByText('პროექტი ვერ მოიძებნა.')).toBeInTheDocument();
  });
});
