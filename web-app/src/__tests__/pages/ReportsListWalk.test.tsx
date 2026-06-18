/**
 * Reports list page (47% covered) - covers row rendering + delete confirm path.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@/test-utils';
import { renderPage } from '../helpers/renderPage';

vi.mock('@/lib/documentNames', () => ({
  reportDisplayName: (s: string | null | undefined) => s ?? 'რეპორტი',
}));
vi.mock('@/lib/data/projects', async (io) => ({ ...(await io<object>()), listProjects: vi.fn() }));
vi.mock('@/lib/data/reports', async (io) => ({
  ...(await io<object>()),
  listReports: vi.fn(),
  deleteReport: vi.fn(),
}));

import { listProjects } from '@/lib/data/projects';
import { listReports, deleteReport } from '@/lib/data/reports';
import Reports from '@/pages/Reports';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listProjects).mockResolvedValue([
    { id: 'p1', user_id: 'u1', name: 'პროექტი', company_name: null, address: null,
      contact_phone: null, logo: null, crew: null, latitude: null, longitude: null,
      created_at: '2026-05-01' },
  ]);
});

describe('Reports list', () => {
  it('renders the empty state', async () => {
    vi.mocked(listReports).mockResolvedValue([]);
    renderPage(<Reports />);
    expect(await screen.findByText('რეპორტები ჯერ არ გაქვთ.')).toBeInTheDocument();
  });

  it('renders the report rows', async () => {
    vi.mocked(listReports).mockResolvedValue([
      { id: 'r1', project_id: 'p1', user_id: 'u1', title: 'რეპ.1', status: 'completed',
        pdf_url: null, signed_pdf_url: null, completed_at: '2026-05-01',
        created_at: '2026-05-01', slides: [{ id: 's', report_id: 'r1', order: 1, title: 'ფ', description: '',
          image_path: null, annotated_image_path: null, annotations: null, created_at: '2026-05-01' }] } as never,
    ]);
    renderPage(<Reports />);
    expect(await screen.findByText('რეპ.1')).toBeInTheDocument();
    expect(screen.getByText(/1 სლაიდი/)).toBeInTheDocument();
    expect(screen.getByText('დასრულდა')).toBeInTheDocument();
  });

  it('clicking trash → confirm → deleteReport is called', async () => {
    vi.mocked(listReports).mockResolvedValue([
      { id: 'r1', project_id: 'p1', user_id: 'u1', title: 'რეპ.1', status: 'draft',
        pdf_url: null, signed_pdf_url: null, completed_at: null,
        created_at: '2026-05-01', slides: [] } as never,
    ]);
    vi.mocked(deleteReport).mockResolvedValue(undefined);
    renderPage(<Reports />);
    await screen.findByText('რეპ.1');
    const trash = document.body.querySelectorAll('[class*="lucide-trash"]');
    fireEvent.click(trash[0].closest('button')!);
    fireEvent.click(await screen.findByRole('button', { name: 'წაშლა' }));
    await waitFor(() => expect(deleteReport).toHaveBeenCalled());
  });
});
