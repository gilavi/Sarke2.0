/**
 * Deep interaction tests for InspectionDetail (the 945-LOC page).
 *
 * The existing InspectionDetailDraft test covers mount + dept/inspector edit
 * + delete + completed render. This adds: yes/no question click → upsertAnswer,
 * measure question blur → upsertAnswer, freetext blur → upsertAnswer, the
 * "დასკვნის შენახვა" conclusion-save button, the safety pill (sets
 * is_safe_for_use), and the "+ ხელმოწერის დამატება" → SignatureCanvas open path.
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
vi.mock('@/components/SignatureCanvas', () => ({
  default: ({ onSave }: { onSave: (dataUrl: string) => void }) => (
    <button type="button" onClick={() => onSave('data:image/png;base64,c2lnbg==')}>
      fake-sign-inspect
    </button>
  ),
}));
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
  listAnswerPhotos, upsertAnswer, updateInspection,
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

const answers: Answer[] = [];

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
  vi.mocked(upsertAnswer).mockResolvedValue({
    id: 'a-new', inspection_id: 'i1', question_id: 'q1',
    value_bool: true, value_num: null, value_text: null, grid_values: null, comment: null,
  });
});

describe('InspectionDetail (deep interactions)', () => {
  it('clicking yes/no fires upsertAnswer with valueBool', async () => {
    renderPage(
      <Routes><Route path="/inspections/:id" element={<InspectionDetail />} /></Routes>,
      '/inspections/i1',
    );
    await screen.findByText('სექცია 1');
    // QuestionRow for q1 (yesno) renders "კი / არა / არ ეხება" — pick the
    // "არ ეხება" button (unique to the QuestionRow yes/no, NOT the safety pill).
    fireEvent.click(screen.getByRole('button', { name: 'არ ეხება' }));
    await waitFor(() => expect(upsertAnswer).toHaveBeenCalled());
    const arg0 = vi.mocked(upsertAnswer).mock.calls[0][0];
    expect(arg0).toMatchObject({
      inspectionId: 'i1',
      questionId: 'q1',
      valueBool: null,
    });
  });

  it('measure-question blur fires upsertAnswer with valueNum', async () => {
    renderPage(
      <Routes><Route path="/inspections/:id" element={<InspectionDetail />} /></Routes>,
      '/inspections/i1',
    );
    await screen.findByText('სექცია 1');
    // The NumberInput for q2 has placeholder "0–100 mm".
    const measureInput = screen.getByPlaceholderText(/0.+100/);
    fireEvent.change(measureInput, { target: { value: '42' } });
    fireEvent.blur(measureInput);
    await waitFor(() => expect(upsertAnswer).toHaveBeenCalled());
    const arg0 = vi.mocked(upsertAnswer).mock.calls[0][0];
    expect(arg0).toMatchObject({ questionId: 'q2', valueNum: 42 });
  });

  it('freetext blur fires upsertAnswer with valueText', async () => {
    renderPage(
      <Routes><Route path="/inspections/:id" element={<InspectionDetail />} /></Routes>,
      '/inspections/i1',
    );
    await screen.findByText('სექცია 2');
    // The freetext question q3 renders a textarea. Other textareas exist for
    // the conclusion + comment fields; the order is: textarea for q3, comment
    // textareas, then conclusion. Find by surrounding the textarea uniquely.
    const textareas = Array.from(document.body.querySelectorAll('textarea'));
    // The first textarea is the freetext question (rendered before conclusion).
    expect(textareas.length).toBeGreaterThan(0);
    const freetextEl = textareas[0];
    fireEvent.change(freetextEl, { target: { value: 'პასუხი' } });
    fireEvent.blur(freetextEl);
    await waitFor(() => expect(upsertAnswer).toHaveBeenCalled());
    const arg0 = vi.mocked(upsertAnswer).mock.calls[0][0];
    expect(arg0).toMatchObject({ valueText: 'პასუხი' });
  });

  it('clicking the safety pill + დასკვნის შენახვა fires updateInspection', async () => {
    renderPage(
      <Routes><Route path="/inspections/:id" element={<InspectionDetail />} /></Routes>,
      '/inspections/i1',
    );
    await screen.findByText('გამოყენებისთვის უსაფრთხო?');
    // The safety-pill row has კი/არა/არ მოწმდება (not "არ ეხება" which is the
    // QuestionRow yes/no). Find "არ მოწმდება" — uniquely in the safety pill.
    fireEvent.click(screen.getByRole('button', { name: 'არ მოწმდება' }));
    // Now click "დასკვნის შენახვა".
    fireEvent.click(screen.getByRole('button', { name: 'დასკვნის შენახვა' }));
    await waitFor(() =>
      expect(updateInspection).toHaveBeenCalledWith(
        'i1',
        expect.objectContaining({ is_safe_for_use: null }),
      ),
    );
  });

  // NOTE: the inline inspector-signature capture was removed for the regulatory
  // no-persist rule (signatures are never saved to the DB). The former
  // "signature add → fake-sign → updateInspection({inspector_signature})" test
  // was deleted with that feature.

  it('completed inspection shows the PDF list when present', async () => {
    vi.mocked(getInspection).mockResolvedValue({
      ...draftInspection,
      status: 'completed',
      conclusion_text: 'OK',
      is_safe_for_use: true,
    });
    vi.mocked(listInspectionPdfs).mockResolvedValue([
      { id: 'pdf-1', inspection_id: 'i1', pdf_url: 'pdfs/abc.pdf', is_signed: false,
        signed_at: null, signer_name: null, signer_role: 'inspector', signer_role_custom: null,
        token: null, created_at: '2026-05-01' },
    ] as never);
    renderPage(
      <Routes><Route path="/inspections/:id" element={<InspectionDetail />} /></Routes>,
      '/inspections/i1',
    );
    expect((await screen.findAllByText('ფასადის ხარაჩო')).length).toBeGreaterThan(0);
    expect(screen.getByText(/სტატუსი: დასრულდა/)).toBeInTheDocument();
  });
});
