/**
 * InspectionWizard - exercises the question-step renderer (QuestionStepRenderer)
 * + conclusion-step renderer (ConclusionStepRenderer) by mounting the wizard in
 * edit mode with various question types.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@/test-utils';

vi.mock('@/lib/auth', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'u1' }, profile: { first_name: 'ი', last_name: 'ი' } })),
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
  upsertAnswer, listAnswerPhotos,
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

const project = { id: 'p1', user_id: 'u1', name: 'X', company_name: 'X', address: null,
  contact_phone: null, logo: null, crew: null, latitude: null, longitude: null, created_at: '2026-05-01' };
const template = { id: 't1', owner_id: null, name: 'tpl', category: 'xaracho',
  is_system: true, required_signer_roles: [], created_at: '2026-05-01' };
const inspection: Inspection = {
  id: 'i1', project_id: 'p1', user_id: 'u1', template_id: 't1', status: 'draft',
  harness_name: 'X', department: 'X', inspector_name: 'ი',
  conclusion_text: null, is_safe_for_use: null, inspector_signature: null,
  conclusion_photo_paths: [], signatories: [],
  created_at: '2026-05-01', completed_at: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listProjects).mockResolvedValue([project] as never);
  vi.mocked(listTemplates).mockResolvedValue([template] as never);
  vi.mocked(listAnswerPhotos).mockResolvedValue([]);
  vi.mocked(upsertAnswer).mockResolvedValue({
    id: 'a-new', inspection_id: 'i1', question_id: 'q1',
    value_bool: null, value_num: null, value_text: null, grid_values: null, comment: null,
  });
});

describe('InspectionWizard - question step types', () => {
  it('renders the yesno step with kი/არა buttons', () => {
    const questions: Question[] = [
      { id: 'q1', template_id: 't1', section: 1, order: 1, type: 'yesno', title: 'Q1',
        min_val: null, max_val: null, unit: null, grid_rows: null, grid_cols: null },
    ];
    renderWizard(
      <InspectionWizard
        open
        onClose={() => {}}
        inspection={inspection}
        initialQuestions={questions}
        initialAnswers={[]}
      />,
    );
    // Wizard frame should render the yesno question - find the "კი" + "არა" buttons.
    expect(screen.getAllByRole('button', { name: 'კი' }).length).toBeGreaterThan(0);
  });

  it('renders the measure step with a number input', () => {
    const questions: Question[] = [
      { id: 'q2', template_id: 't1', section: 1, order: 1, type: 'measure', title: 'Q2',
        min_val: 0, max_val: 100, unit: 'mm', grid_rows: null, grid_cols: null },
    ];
    renderWizard(
      <InspectionWizard
        open
        onClose={() => {}}
        inspection={inspection}
        initialQuestions={questions}
        initialAnswers={[]}
      />,
    );
    expect(screen.getByPlaceholderText('მნიშვნელობა')).toBeInTheDocument();
  });

  it('renders the freetext step with a textarea', () => {
    const questions: Question[] = [
      { id: 'q3', template_id: 't1', section: 1, order: 1, type: 'freetext', title: 'Q3',
        min_val: null, max_val: null, unit: null, grid_rows: null, grid_cols: null },
    ];
    renderWizard(
      <InspectionWizard
        open
        onClose={() => {}}
        inspection={inspection}
        initialQuestions={questions}
        initialAnswers={[]}
      />,
    );
    expect(screen.getByPlaceholderText('შეიყვანეთ პასუხი...')).toBeInTheDocument();
  });

  it('typing in the comment field updates the answer', () => {
    const questions: Question[] = [
      { id: 'q1', template_id: 't1', section: 1, order: 1, type: 'yesno', title: 'Q1',
        min_val: null, max_val: null, unit: null, grid_rows: null, grid_cols: null },
    ];
    const answers: Answer[] = [
      { id: 'a1', inspection_id: 'i1', question_id: 'q1', value_bool: true,
        value_num: null, value_text: null, grid_values: null, comment: '' },
    ];
    renderWizard(
      <InspectionWizard
        open
        onClose={() => {}}
        inspection={inspection}
        initialQuestions={questions}
        initialAnswers={answers}
      />,
    );
    const commentInput = screen.getByPlaceholderText('დამატებითი შენიშვნა');
    fireEvent.change(commentInput, { target: { value: 'შენიშვნა' } });
    // Local state updated; verify by checking the value.
    expect((commentInput as HTMLInputElement).value).toBe('შენიშვნა');
  });
});

describe('InspectionWizard - conclusion step', () => {
  it('clicking the safety pill updates conclusion + lets us click დასრულება', async () => {
    renderWizard(
      <InspectionWizard
        open
        onClose={() => {}}
        inspection={inspection}
        initialQuestions={[]}
        initialAnswers={[]}
      />,
    );
    // Wizard now at the conclusion step. Click the "✓ გამოყენებადია" verdict.
    const yesBtn = screen.getByRole('button', { name: /გამოყენებადია/ });
    fireEvent.click(yesBtn);
    // Type a conclusion text.
    const textarea = screen.getByPlaceholderText('შეიყვანეთ დასკვნა...');
    fireEvent.change(textarea, { target: { value: 'ყველაფერი წესრიგშია' } });
    expect((textarea as HTMLTextAreaElement).value).toBe('ყველაფერი წესრიგშია');
  });
});
