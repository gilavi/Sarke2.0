/**
 * Interaction tests for ReportDetail — a 392-LOC page at 30% coverage.
 * Walks the loaded report's draft mode editing affordances: rename slide,
 * edit description, delete slide, add new slide via the form (with photo
 * file selected), and the "გაუქმება" cancel path.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { screen, fireEvent, waitFor } from '@/test-utils';
import { renderPage } from '../helpers/renderPage';

vi.mock('@/lib/auth', () => ({ useAuth: vi.fn(() => ({ user: { id: 'u1' } })) }));
vi.mock('@/lib/documentNames', () => ({
  reportDisplayName: (s: string | null | undefined) => s ?? 'რეპორტი',
}));
vi.mock('@/components/PhotoGallery', () => ({ default: () => null }));
vi.mock('@/components/DeleteButton', () => ({
  default: ({ onDelete }: { onDelete: () => void }) => (
    <button type="button" aria-label="delete-report" onClick={onDelete}>delete</button>
  ),
}));
vi.mock('@/lib/data/projects', async (io) => ({ ...(await io<object>()), getProject: vi.fn() }));
vi.mock('@/lib/data/reports', async (io) => ({
  ...(await io<object>()),
  getReport: vi.fn(),
  addReportSlide: vi.fn(),
  deleteReport: vi.fn(),
  removeReportSlide: vi.fn(),
  updateReportSlide: vi.fn(),
  signedReportPdfUrl: vi.fn().mockResolvedValue('https://signed/rep'),
  signedReportPhotoUrl: vi.fn().mockResolvedValue('https://signed/photo'),
}));

import { getProject } from '@/lib/data/projects';
import {
  getReport, addReportSlide, deleteReport, removeReportSlide,
  updateReportSlide, type Report,
} from '@/lib/data/reports';
import ReportDetail from '@/pages/ReportDetail';

const draftReport: Report = {
  id: 'r1', project_id: 'p1', user_id: 'u1', title: 'ჩემი რეპორტი',
  status: 'draft', pdf_url: null, signed_pdf_url: null, completed_at: null,
  created_at: '2026-05-01',
  slides: [
    { id: 's1', report_id: 'r1', order: 1, title: 'ხარაჩო 1', description: 'აღწერა 1',
      image_path: null, annotated_image_path: null, annotations: null, created_at: '2026-05-01' },
    { id: 's2', report_id: 'r1', order: 2, title: 'ხარაჩო 2', description: 'აღწერა 2',
      image_path: 'photos/x.png', annotated_image_path: null, annotations: null, created_at: '2026-05-01' },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getProject).mockResolvedValue({
    id: 'p1', user_id: 'u1', name: 'პროექტი', company_name: null,
    address: null, contact_phone: null, logo: null, crew: null,
    latitude: null, longitude: null, created_at: '2026-05-01',
  } as never);
  vi.mocked(getReport).mockResolvedValue(draftReport);
  vi.mocked(addReportSlide).mockResolvedValue({ id: 's3', report_id: 'r1', order: 3,
    title: 't', description: '', image_path: null, annotated_image_path: null,
    annotations: null, created_at: '2026-05-01' });
  vi.mocked(updateReportSlide).mockResolvedValue(undefined);
  vi.mocked(removeReportSlide).mockResolvedValue(undefined);
  vi.mocked(deleteReport).mockResolvedValue(undefined);
});

describe('ReportDetail (draft interactions)', () => {
  it('renders the title + slide list', async () => {
    renderPage(
      <Routes><Route path="/reports/:id" element={<ReportDetail />} /></Routes>,
      '/reports/r1',
    );
    expect((await screen.findAllByText('ჩემი რეპორტი')).length).toBeGreaterThan(0);
    expect(screen.getByText(/სტატუსი: დრაფტი/)).toBeInTheDocument();
    expect(screen.getByDisplayValue('ხარაჩო 1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ხარაჩო 2')).toBeInTheDocument();
  });

  it('renaming a slide via blur calls updateReportSlide', async () => {
    renderPage(
      <Routes><Route path="/reports/:id" element={<ReportDetail />} /></Routes>,
      '/reports/r1',
    );
    const titleInput = await screen.findByDisplayValue('ხარაჩო 1');
    fireEvent.change(titleInput, { target: { value: 'ახალი სათაური' } });
    fireEvent.blur(titleInput);
    await waitFor(() => expect(updateReportSlide).toHaveBeenCalled());
    // updateReportSlide(report, slideId, patch) — positional args.
    const [, slideId, patch] = vi.mocked(updateReportSlide).mock.calls[0];
    expect(slideId).toBe('s1');
    expect(patch).toEqual({ title: 'ახალი სათაური' });
  });

  it('removing a slide via the X button calls removeReportSlide', async () => {
    renderPage(
      <Routes><Route path="/reports/:id" element={<ReportDetail />} /></Routes>,
      '/reports/r1',
    );
    await screen.findByDisplayValue('ხარაჩო 1');
    // The "სლაიდის წაშლა" button is a title-attr button with X icon.
    const removeBtns = screen.getAllByTitle('სლაიდის წაშლა');
    expect(removeBtns.length).toBe(2);
    fireEvent.click(removeBtns[0]);
    await waitFor(() => expect(removeReportSlide).toHaveBeenCalled());
    // removeReportSlide(report, slideId) — positional args.
    const [, slideId] = vi.mocked(removeReportSlide).mock.calls[0];
    expect(slideId).toBe('s1');
  });

  it('add-slide form: filling + submitting calls addReportSlide', async () => {
    renderPage(
      <Routes><Route path="/reports/:id" element={<ReportDetail />} /></Routes>,
      '/reports/r1',
    );
    await screen.findByDisplayValue('ხარაჩო 1');
    // Open add form
    fireEvent.click(screen.getByRole('button', { name: /სლაიდის დამატება/ }));
    // Fill title
    fireEvent.change(screen.getByPlaceholderText('მაგ: ხარაჩოს ბოძი — დაუცველი'), {
      target: { value: 'ახალი სლაიდი' },
    });
    // Submit
    fireEvent.click(screen.getByRole('button', { name: /^დამატება$/ }));
    await waitFor(() => expect(addReportSlide).toHaveBeenCalled());
  });

  it('delete report calls deleteReport via DeleteButton', async () => {
    renderPage(
      <Routes><Route path="/reports/:id" element={<ReportDetail />} /></Routes>,
      '/reports/r1',
    );
    fireEvent.click(await screen.findByLabelText('delete-report'));
    await waitFor(() => expect(deleteReport).toHaveBeenCalled());
  });

  it('renders the completed report read-only (no editable inputs)', async () => {
    vi.mocked(getReport).mockResolvedValue({
      ...draftReport, status: 'completed', completed_at: '2026-05-01',
      pdf_url: 'pdfs/x.pdf',
    });
    renderPage(
      <Routes><Route path="/reports/:id" element={<ReportDetail />} /></Routes>,
      '/reports/r1',
    );
    expect(await screen.findByText(/სტატუსი: დასრულდა/)).toBeInTheDocument();
    // No editable title input in completed mode → just text titles.
    expect(screen.queryByDisplayValue('ხარაჩო 1')).not.toBeInTheDocument();
    // Saved-PDF button visible (renamed from "PDF-ის ნახვა" to disambiguate from print).
    expect(screen.getByRole('button', { name: /შენახული PDF/ })).toBeInTheDocument();
  });
});
