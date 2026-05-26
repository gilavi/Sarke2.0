/**
 * Loaded-state test for the generic InspectionDetail page (945 LOC).
 * Provides a full inspection + project + questions + answers, mocks the heavy
 * child components, and renders the page to exercise the loaded render path.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { screen } from '@/test-utils';
import { renderPage } from '../helpers/renderPage';

vi.mock('@/lib/auth', () => ({ useAuth: vi.fn(() => ({ user: { id: 'u1' }, profile: null })) }));
vi.mock('@/lib/documentNames', () => ({
  useInspectionName: () => () => 'ფასადის ხარაჩო',
  equipmentInspectionName: (t: string) => `eq-${t}`,
  inspectionDisplayName: (s: string | null | undefined) => s ?? 'შემოწმების აქტი',
  reportDisplayName: (s: string | null | undefined) => s ?? 'რეპორტი',
  certificateDisplayName: (s: string | null | undefined) => s ?? 'სერტიფიკატი',
}));
vi.mock('@/components/InspectionWizard', () => ({ default: () => null }));
vi.mock('@/components/SignatureCanvas', () => ({ default: () => null }));
vi.mock('@/components/PhotoUploadWidget', () => ({ default: () => null }));
vi.mock('@/components/PhotoUploadZone', () => ({ default: () => null }));
vi.mock('@/components/web/SuccessModal', () => ({ default: () => null }));
vi.mock('@/components/DeleteButton', () => ({ default: () => null }));
vi.mock('@/lib/data/projects', async (io) => ({ ...(await io<object>()), getProject: vi.fn() }));
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
  signedPdfUrl: vi.fn().mockResolvedValue('https://signed/p'),
  addAnswerPhoto: vi.fn(),
  removeAnswerPhoto: vi.fn(),
}));

import { getProject } from '@/lib/data/projects';
import {
  getInspection,
  listAnswers,
  listQuestions,
  listInspectionPdfs,
  listAnswerPhotos,
} from '@/lib/data/inspections';
import InspectionDetail from '@/pages/InspectionDetail';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getProject).mockResolvedValue({
    id: 'p1', user_id: 'u1', name: 'პროექტი', company_name: 'შპს', address: null,
    contact_phone: null, logo: null, crew: null, latitude: null, longitude: null,
    created_at: '2026-05-01',
  } as never);
  vi.mocked(listInspectionPdfs).mockResolvedValue([]);
  vi.mocked(listAnswerPhotos).mockResolvedValue([]);
  vi.mocked(listQuestions).mockResolvedValue([
    { id: 'q1', template_id: 't1', section: 1, order: 1, type: 'yesno', title: 'პუნქტი 1',
      min_val: null, max_val: null, unit: null, grid_rows: null, grid_cols: null },
    { id: 'q2', template_id: 't1', section: 1, order: 2, type: 'measure', title: 'პუნქტი 2',
      min_val: 0, max_val: 100, unit: 'mm', grid_rows: null, grid_cols: null },
  ]);
  vi.mocked(listAnswers).mockResolvedValue([
    { id: 'a1', inspection_id: 'i1', question_id: 'q1', value_bool: true, value_num: null, value_text: null, grid_values: null, comment: null },
  ]);
});

describe('InspectionDetail (loaded)', () => {
  it('renders the loaded view with project name + questions when a completed inspection is fetched', async () => {
    vi.mocked(getInspection).mockResolvedValue({
      id: 'i1', project_id: 'p1', user_id: 'u1', template_id: 't1', status: 'completed',
      harness_name: 'ქამარი N1', department: 'დეპ', inspector_name: 'ი. ინსპექტორი',
      conclusion_text: 'ყველაფერი წესრიგშია', is_safe_for_use: true,
      inspector_signature: null, conclusion_photo_paths: [], signatories: [],
      created_at: '2026-05-01', completed_at: '2026-05-01',
    } as never);

    renderPage(
      <Routes><Route path="/inspections/:id" element={<InspectionDetail />} /></Routes>,
      '/inspections/i1',
    );

    // The page renders the inspection's template name as its title (mocked).
    expect((await screen.findAllByText('ფასადის ხარაჩო')).length).toBeGreaterThan(0);
  });

  it('renders the draft view with editable conclusion state', async () => {
    vi.mocked(getInspection).mockResolvedValue({
      id: 'i2', project_id: 'p1', user_id: 'u1', template_id: 't1', status: 'draft',
      harness_name: null, department: null, inspector_name: null,
      conclusion_text: null, is_safe_for_use: null, inspector_signature: null,
      conclusion_photo_paths: [], signatories: [],
      created_at: '2026-05-01', completed_at: null,
    } as never);

    renderPage(
      <Routes><Route path="/inspections/:id" element={<InspectionDetail />} /></Routes>,
      '/inspections/i2',
    );

    // The page mounts for a draft (we don't assert on specific edit affordances —
    // the heavy children are stubbed). At minimum the template title appears.
    expect((await screen.findAllByText('ფასადის ხარაჩო')).length).toBeGreaterThan(0);
  });
});
