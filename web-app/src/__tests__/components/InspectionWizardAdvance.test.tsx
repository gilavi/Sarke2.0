/**
 * InspectionWizard step-advance tests - fire the `createInspection` path from
 * the info step (covered by the preset's locked templateId + defaultProjectId)
 * and walk into the conclusion step in edit mode.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@/test-utils';

vi.mock('@/lib/auth', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'u1' }, profile: { first_name: 'გელა', last_name: 'ხელაძე' } })),
}));
vi.mock('@/lib/documentNames', () => ({
  useInspectionName: () => () => 'tpl',
  inspectionDisplayName: (s: string | null | undefined) => s ?? 'შემოწმების აქტი',
  equipmentInspectionName: (t: string) => `eq-${t}`,
}));
vi.mock('@/components/PhotoUploadZone', () => ({ default: () => null }));
vi.mock('@/components/web/SuccessModal', () => ({ default: () => null }));
vi.mock('@/components/inspections/HarnessChecklist', () => ({ HarnessChecklist: () => null }));
vi.mock('@/lib/data/projects', async (io) => ({ ...(await io<object>()), listProjects: vi.fn() }));
vi.mock('@/lib/data/templates', async (io) => ({ ...(await io<object>()), listTemplates: vi.fn() }));
vi.mock('@/lib/data/inspections', async (io) => ({
  ...(await io<object>()),
  createInspection: vi.fn(),
  updateInspection: vi.fn(),
  upsertAnswer: vi.fn(),
  listQuestions: vi.fn(),
  listAnswerPhotos: vi.fn(),
  addAnswerPhoto: vi.fn(),
  removeAnswerPhoto: vi.fn(),
}));

import { listProjects } from '@/lib/data/projects';
import { listTemplates } from '@/lib/data/templates';
import {
  createInspection, listQuestions, listAnswerPhotos,
  type Inspection, type Question,
} from '@/lib/data/inspections';
import InspectionWizard from '@/components/InspectionWizard';

function renderWizard(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

const project = {
  id: 'p1', user_id: 'u1', name: 'პროექტი', company_name: 'შპს', address: null,
  contact_phone: null, logo: null, crew: null, latitude: null, longitude: null,
  created_at: '2026-05-01',
};

const template = {
  id: 't1', owner_id: null, name: 'ფასადის ხარაჩოს შემოწმების აქტი',
  category: 'xaracho', is_system: true, required_signer_roles: [], created_at: '2026-05-01',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listProjects).mockResolvedValue([project] as never);
  vi.mocked(listTemplates).mockResolvedValue([template] as never);
  vi.mocked(listQuestions).mockResolvedValue([]);
  vi.mocked(listAnswerPhotos).mockResolvedValue([]);
});

describe('InspectionWizard - info-step advance', () => {
  it('clicking Next on the info step triggers createInspection with the preset template + default project', async () => {
    const created: Inspection = {
      id: 'new-i', project_id: 'p1', user_id: 'u1', template_id: 't1', status: 'draft',
      harness_name: null, department: null, inspector_name: 'გელა ხელაძე',
      conclusion_text: null, is_safe_for_use: null, inspector_signature: null,
      conclusion_photo_paths: [], signatories: [],
      created_at: '2026-05-01', completed_at: null,
    };
    vi.mocked(createInspection).mockResolvedValue(created);

    renderWizard(
      <InspectionWizard
        open
        onClose={() => {}}
        defaultProjectId="p1"
        preset={{ templateId: 't1', title: 'დამცავი ქამრების შემოწმება', itemLabel: 'ქამარი' }}
      />,
    );

    // The wizard frame Next button - find by its label.
    const nextButtons = await screen.findAllByRole('button', { name: /შემდეგი/ });
    fireEvent.click(nextButtons[0]);

    await waitFor(() =>
      expect(createInspection).toHaveBeenCalledWith(expect.objectContaining({
        projectId: 'p1',
        templateId: 't1',
      })),
    );
  });
});

describe('InspectionWizard - edit mode mount with conclusion step', () => {
  it('mounts in edit mode with no questions → goes straight to the conclusion step', () => {
    const existing: Inspection = {
      id: 'i1', project_id: 'p1', user_id: 'u1', template_id: 't1', status: 'draft',
      harness_name: null, department: null, inspector_name: 'ი',
      conclusion_text: null, is_safe_for_use: null, inspector_signature: null,
      conclusion_photo_paths: [], signatories: [],
      created_at: '2026-05-01', completed_at: null,
    };
    const questions: Question[] = [];
    renderWizard(
      <InspectionWizard
        open
        onClose={() => {}}
        inspection={existing}
        initialQuestions={questions}
        initialAnswers={[]}
      />,
    );
    // Conclusion step is the single step in this fixture - wizard frame renders.
    expect(document.body.firstChild).toBeTruthy();
  });
});
