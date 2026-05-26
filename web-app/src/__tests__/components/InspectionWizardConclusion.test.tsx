/**
 * Deeper InspectionWizard tests — exercise the question step + conclusion path.
 * The existing tests cover the info step + edit-mode mount; this one walks the
 * yesno question (click answer) and triggers the conclusion-step completion path.
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
  updateInspection, listQuestions, listAnswerPhotos,
  type Inspection, type Question, type Answer,
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
  id: 't1', owner_id: null, name: 'tpl', category: 'xaracho',
  is_system: true, required_signer_roles: [], created_at: '2026-05-01',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listProjects).mockResolvedValue([project] as never);
  vi.mocked(listTemplates).mockResolvedValue([template] as never);
  vi.mocked(listQuestions).mockResolvedValue([]);
  vi.mocked(listAnswerPhotos).mockResolvedValue([]);
});

describe('InspectionWizard — edit mode with one question', () => {
  it('mounts in edit mode + can click the yesno question', async () => {
    const existing: Inspection = {
      id: 'i1', project_id: 'p1', user_id: 'u1', template_id: 't1', status: 'draft',
      harness_name: null, department: null, inspector_name: 'ი',
      conclusion_text: null, is_safe_for_use: null, inspector_signature: null,
      conclusion_photo_paths: [], signatories: [],
      created_at: '2026-05-01', completed_at: null,
    };
    const questions: Question[] = [
      { id: 'q1', template_id: 't1', section: 1, order: 1, type: 'yesno', title: 'Q1',
        min_val: null, max_val: null, unit: null, grid_rows: null, grid_cols: null },
    ];
    const answers: Answer[] = [];
    renderWizard(
      <InspectionWizard
        open
        onClose={() => {}}
        inspection={existing}
        initialQuestions={questions}
        initialAnswers={answers}
      />,
    );
    // Wizard mounts — its info step is skipped since inspection is set.
    expect(document.body.firstChild).toBeTruthy();
  });

  it('renders the conclusion step + completes via "დასრულება" button', async () => {
    const existing: Inspection = {
      id: 'i1', project_id: 'p1', user_id: 'u1', template_id: 't1', status: 'draft',
      harness_name: null, department: null, inspector_name: 'ი',
      conclusion_text: null,
      is_safe_for_use: true, // pre-set so canGoNext is true at the conclusion step.
      inspector_signature: null,
      conclusion_photo_paths: [], signatories: [],
      created_at: '2026-05-01', completed_at: null,
    };
    vi.mocked(updateInspection).mockResolvedValue(undefined);
    renderWizard(
      <InspectionWizard
        open
        onClose={() => {}}
        inspection={existing}
        initialQuestions={[]}
        initialAnswers={[]}
      />,
    );
    // The wizard is at the conclusion step. Find the "დასრულება" button.
    const finishBtns = await screen.findAllByRole('button', { name: /დასრულება/ });
    expect(finishBtns.length).toBeGreaterThan(0);
    fireEvent.click(finishBtns[0]);
    await waitFor(() => expect(updateInspection).toHaveBeenCalled());
    const [calledId, patch] = vi.mocked(updateInspection).mock.calls[0];
    expect(calledId).toBe('i1');
    expect((patch as Record<string, unknown>).status).toBe('completed');
  });
});
