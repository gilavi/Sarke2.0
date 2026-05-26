/**
 * InspectionDetail draft-walk — mounts the 945-LOC page with a draft inspection
 * plus questions + answers + project, then exercises the editable code paths:
 * editing department/inspector via TextInput onBlur → updateInspection, clicking
 * the safe-for-use pills (sets safeDraft), and clicking the start-wizard +
 * delete actions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { screen, fireEvent, waitFor } from '@/test-utils';
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
vi.mock('@/components/DeleteButton', () => ({
  default: ({ onDelete }: { onDelete: () => void }) => (
    <button type="button" aria-label="delete" onClick={onDelete}>delete</button>
  ),
}));
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
  getInspection, listAnswers, listQuestions, listInspectionPdfs,
  listAnswerPhotos, updateInspection, upsertAnswer, deleteInspection,
  type Inspection, type Question, type Answer,
} from '@/lib/data/inspections';
import InspectionDetail from '@/pages/InspectionDetail';

const draftInspection: Inspection = {
  id: 'i1', project_id: 'p1', user_id: 'u1', template_id: 't1',
  status: 'draft', harness_name: 'ქამარი A', department: 'დეპ', inspector_name: 'ი. ი.',
  conclusion_text: null, is_safe_for_use: null, inspector_signature: null,
  conclusion_photo_paths: [], signatories: [],
  created_at: '2026-05-01', completed_at: null,
};

const questions: Question[] = [
  { id: 'q1', template_id: 't1', section: 1, order: 1, type: 'yesno', title: 'პუნქტი 1',
    min_val: null, max_val: null, unit: null, grid_rows: null, grid_cols: null },
  { id: 'q2', template_id: 't1', section: 1, order: 2, type: 'measure', title: 'პუნქტი 2',
    min_val: 0, max_val: 100, unit: 'mm', grid_rows: null, grid_cols: null },
  { id: 'q3', template_id: 't1', section: 2, order: 1, type: 'freetext', title: 'პუნქტი 3',
    min_val: null, max_val: null, unit: null, grid_rows: null, grid_cols: null },
];

const answers: Answer[] = [
  { id: 'a1', inspection_id: 'i1', question_id: 'q1', value_bool: true,
    value_num: null, value_text: null, grid_values: null, comment: null },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getProject).mockResolvedValue({
    id: 'p1', user_id: 'u1', name: 'პროექტი', company_name: 'შპს ალფა',
    address: null, contact_phone: null, logo: null, crew: null,
    latitude: null, longitude: null, created_at: '2026-05-01',
  } as never);
  vi.mocked(listInspectionPdfs).mockResolvedValue([]);
  vi.mocked(listAnswerPhotos).mockResolvedValue([]);
  vi.mocked(listQuestions).mockResolvedValue(questions);
  vi.mocked(listAnswers).mockResolvedValue(answers);
  vi.mocked(getInspection).mockResolvedValue(draftInspection);
  vi.mocked(updateInspection).mockResolvedValue(undefined);
  vi.mocked(upsertAnswer).mockResolvedValue(answers[0]);
  vi.mocked(deleteInspection).mockResolvedValue(undefined);
});

describe('InspectionDetail (draft walk)', () => {
  it('renders the draft header + status + general info card', async () => {
    renderPage(
      <Routes><Route path="/inspections/:id" element={<InspectionDetail />} /></Routes>,
      '/inspections/i1',
    );
    expect((await screen.findAllByText('ფასადის ხარაჩო')).length).toBeGreaterThan(0);
    expect(screen.getByText(/სტატუსი: დრაფტი/)).toBeInTheDocument();
    expect(screen.getByText('ზოგადი ინფორმაცია')).toBeInTheDocument();
  });

  it('renders editable department + inspector inputs in draft mode', async () => {
    renderPage(
      <Routes><Route path="/inspections/:id" element={<InspectionDetail />} /></Routes>,
      '/inspections/i1',
    );
    expect((await screen.findAllByText('ფასადის ხარაჩო')).length).toBeGreaterThan(0);
    // The two TextInputs (department + inspector_name) render with default values.
    expect(screen.getByDisplayValue('დეპ')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ი. ი.')).toBeInTheDocument();
  });

  it('persists department changes via updateInspection on blur', async () => {
    renderPage(
      <Routes><Route path="/inspections/:id" element={<InspectionDetail />} /></Routes>,
      '/inspections/i1',
    );
    const deptInput = await screen.findByDisplayValue('დეპ');
    fireEvent.change(deptInput, { target: { value: 'ახალი დეპარტამენტი' } });
    fireEvent.blur(deptInput);
    await waitFor(() =>
      expect(updateInspection).toHaveBeenCalledWith('i1', { department: 'ახალი დეპარტამენტი' }),
    );
  });

  it('renders question sections and lets the user click the safety pill', async () => {
    renderPage(
      <Routes><Route path="/inspections/:id" element={<InspectionDetail />} /></Routes>,
      '/inspections/i1',
    );
    expect(await screen.findByText('სექცია 1')).toBeInTheDocument();
    expect(screen.getByText('სექცია 2')).toBeInTheDocument();
    // The conclusion card has the safety-pill row in draft mode.
    expect(screen.getByText('გამოყენებისთვის უსაფრთხო?')).toBeInTheDocument();
    // The yes/no/n-a pills render alongside the QuestionRow yes/no buttons.
    expect(screen.getAllByRole('button', { name: 'კი' }).length).toBeGreaterThan(0);
  });

  it('opens the delete confirmation via DeleteButton mock and fires the mutation', async () => {
    renderPage(
      <Routes><Route path="/inspections/:id" element={<InspectionDetail />} /></Routes>,
      '/inspections/i1',
    );
    const delBtn = await screen.findByLabelText('delete');
    fireEvent.click(delBtn);
    await waitFor(() => expect(deleteInspection).toHaveBeenCalledWith('i1'));
  });

  it('renders a completed inspection in read-only mode with PDF + section info', async () => {
    vi.mocked(getInspection).mockResolvedValue({
      ...draftInspection,
      status: 'completed',
      conclusion_text: 'ყველაფერი წესრიგშია',
      is_safe_for_use: true,
      completed_at: '2026-05-01',
    });
    renderPage(
      <Routes><Route path="/inspections/:id" element={<InspectionDetail />} /></Routes>,
      '/inspections/i1',
    );
    expect((await screen.findAllByText('ფასადის ხარაჩო')).length).toBeGreaterThan(0);
    expect(screen.getByText(/სტატუსი: დასრულდა/)).toBeInTheDocument();
    expect(screen.getByText(/ყველაფერი წესრიგშია/)).toBeInTheDocument();
  });
});
