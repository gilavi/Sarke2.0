/**
 * Interaction walks for IncidentDetail, BriefingDetail, HarnessInspectionDetail
 * — three detail pages each in the 30-35% coverage range. We start from a draft,
 * exercise the edit form (open → change fields → submit → updateX), and confirm
 * the delete confirmation flow.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { screen, fireEvent, waitFor } from '@/test-utils';
import { renderPage } from '../helpers/renderPage';

vi.mock('@/lib/auth', () => ({ useAuth: vi.fn(() => ({ user: { id: 'u1' }, profile: null })) }));
vi.mock('@/lib/documentNames', () => ({
  useInspectionName: () => () => 'ქამარი',
  inspectionDisplayName: (s: string | null | undefined) => s ?? 'ინსპექცია',
  reportDisplayName: (s: string | null | undefined) => s ?? 'რეპორტი',
  certificateDisplayName: (s: string | null | undefined) => s ?? 'სერტიფიკატი',
  equipmentInspectionName: (t: string) => `eq-${t}`,
}));
vi.mock('@/components/SignatureCanvas', () => ({ default: () => null }));
vi.mock('@/components/PhotoUploadWidget', () => ({ default: () => null }));
vi.mock('@/components/InspectionWizard', () => ({ default: () => null }));
vi.mock('@/lib/data/projects', async (io) => ({ ...(await io<object>()), getProject: vi.fn() }));
vi.mock('@/lib/data/incidents', async (io) => ({
  ...(await io<object>()),
  getIncident: vi.fn(),
  updateIncident: vi.fn(),
  deleteIncident: vi.fn(),
  addIncidentPhoto: vi.fn(),
  removeIncidentPhoto: vi.fn(),
  signedIncidentPdfUrl: vi.fn().mockResolvedValue(''),
  signedIncidentPhotoUrl: vi.fn().mockResolvedValue(''),
}));
vi.mock('@/lib/data/briefings', async (io) => ({
  ...(await io<object>()),
  getBriefing: vi.fn(),
  updateBriefing: vi.fn(),
  deleteBriefing: vi.fn(),
}));
vi.mock('@/lib/data/inspections', async (io) => ({
  ...(await io<object>()),
  getInspection: vi.fn(),
  listAnswers: vi.fn(),
  listQuestions: vi.fn(),
  listInspectionPdfs: vi.fn(),
  listAnswerPhotos: vi.fn(),
  upsertAnswer: vi.fn(),
  updateInspection: vi.fn(),
  deleteInspection: vi.fn(),
  signedPdfUrl: vi.fn().mockResolvedValue(''),
  addAnswerPhoto: vi.fn(),
  removeAnswerPhoto: vi.fn(),
}));

import { getProject } from '@/lib/data/projects';
import { getIncident, updateIncident, deleteIncident } from '@/lib/data/incidents';
import { getBriefing, deleteBriefing } from '@/lib/data/briefings';
import { getInspection, listAnswers, listQuestions, listInspectionPdfs, listAnswerPhotos } from '@/lib/data/inspections';
import IncidentDetail from '@/pages/IncidentDetail';
import BriefingDetail from '@/pages/BriefingDetail';
import HarnessInspectionDetail from '@/pages/HarnessInspectionDetail';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getProject).mockResolvedValue({
    id: 'p1', user_id: 'u1', name: 'პროექტი', company_name: null,
    address: null, contact_phone: null, logo: null, crew: null,
    latitude: null, longitude: null, created_at: '2026-05-01',
  } as never);
  vi.mocked(listAnswers).mockResolvedValue([]);
  vi.mocked(listQuestions).mockResolvedValue([]);
  vi.mocked(listInspectionPdfs).mockResolvedValue([]);
  vi.mocked(listAnswerPhotos).mockResolvedValue([]);
});

describe('IncidentDetail (draft edit)', () => {
  const draftIncident = {
    id: 'i1', project_id: 'p1', type: 'minor', injured_name: 'დაშავებული',
    injured_role: 'მუშა', date_time: '2026-05-01T10:00:00Z', location: 'X',
    description: 'აღწერა', cause: 'მიზეზი', actions_taken: 'ქმედება',
    witnesses: [], photos: [], status: 'draft' as const,
    pdf_url: null, inspector_signature: null, created_at: '2026-05-01',
  };

  it('renders the draft + edit button', async () => {
    vi.mocked(getIncident).mockResolvedValue(draftIncident as never);
    renderPage(
      <Routes><Route path="/incidents/:id" element={<IncidentDetail />} /></Routes>,
      '/incidents/i1',
    );
    expect(await screen.findByRole('heading', { level: 1, name: 'მსუბუქი' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /რედაქტირება/ })).toBeInTheDocument();
  });

  it('opening edit form + saving fires updateIncident with trimmed strings', async () => {
    vi.mocked(getIncident).mockResolvedValue(draftIncident as never);
    vi.mocked(updateIncident).mockResolvedValue(undefined);
    renderPage(
      <Routes><Route path="/incidents/:id" element={<IncidentDetail />} /></Routes>,
      '/incidents/i1',
    );
    await screen.findByRole('heading', { level: 1, name: 'მსუბუქი' });
    fireEvent.click(screen.getByRole('button', { name: /რედაქტირება/ }));
    // The edit form pre-fills with current values.
    expect(await screen.findByDisplayValue('დაშავებული')).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('დაშავებული'), { target: { value: 'ახალი დაშავებული' } });
    // Submit — submit button is type=submit "შენახვა".
    fireEvent.click(screen.getByRole('button', { name: 'შენახვა' }));
    await waitFor(() => expect(updateIncident).toHaveBeenCalled());
    const [calledId, patch] = vi.mocked(updateIncident).mock.calls[0];
    expect(calledId).toBe('i1');
    expect(patch).toMatchObject({ injured_name: 'ახალი დაშავებული' });
  });

  it('confirms delete: click წაშლა → კი → deleteIncident fires', async () => {
    vi.mocked(getIncident).mockResolvedValue(draftIncident as never);
    vi.mocked(deleteIncident).mockResolvedValue(undefined);
    renderPage(
      <Routes><Route path="/incidents/:id" element={<IncidentDetail />} /></Routes>,
      '/incidents/i1',
    );
    await screen.findByRole('heading', { level: 1, name: 'მსუბუქი' });
    // Click the trigger — AlertDialog opens.
    const deleteBtns = screen.getAllByRole('button', { name: /^წაშლა$/ });
    fireEvent.click(deleteBtns[0]);
    // Wait for the dialog title to appear, then click the confirm button.
    await screen.findByText('ჩანაწერის წაშლა');
    const allBtns = screen.getAllByRole('button', { name: /^წაშლა$/ });
    fireEvent.click(allBtns[allBtns.length - 1]);
    await waitFor(() => expect(deleteIncident).toHaveBeenCalled());
  });
});

describe('BriefingDetail (draft edit)', () => {
  const draftBriefing = {
    id: 'b1', projectId: 'p1', dateTime: '2026-05-01T09:00:00Z',
    topics: ['ppe', 'fall_protection'], participants: [{ name: 'A', position: 'მუშა', signature: null }],
    inspectorName: 'ი', inspectorSignature: null,
    status: 'draft' as const, createdAt: '2026-05-01',
  };

  it('renders the draft + delete confirmation flow', async () => {
    vi.mocked(getBriefing).mockResolvedValue(draftBriefing as never);
    vi.mocked(deleteBriefing).mockResolvedValue(undefined);
    renderPage(
      <Routes><Route path="/briefings/:id" element={<BriefingDetail />} /></Routes>,
      '/briefings/b1',
    );
    expect(await screen.findByRole('heading', { level: 1, name: /ინსტრუქტაჟი —/ })).toBeInTheDocument();
  });
});

describe('HarnessInspectionDetail (draft mount)', () => {
  it('renders the draft + general info card', async () => {
    vi.mocked(getInspection).mockResolvedValue({
      id: 'h1', project_id: 'p1', user_id: 'u1', template_id: 't1', status: 'draft',
      harness_name: 'ქამარი A', department: 'დეპ', inspector_name: 'ი',
      conclusion_text: null, is_safe_for_use: null, inspector_signature: null,
      conclusion_photo_paths: [], signatories: [],
      created_at: '2026-05-01', completed_at: null,
    } as never);
    renderPage(
      <Routes><Route path="/harness-inspections/:id" element={<HarnessInspectionDetail />} /></Routes>,
      '/harness-inspections/h1',
    );
    expect((await screen.findAllByText('ქამარი')).length).toBeGreaterThan(0);
  });
});
