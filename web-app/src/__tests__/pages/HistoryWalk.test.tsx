/**
 * History page (40% covered) - list aggregation + delete walk.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@/test-utils';

vi.mock('@/lib/documentNames', () => ({
  useInspectionName: () => () => 'tpl',
  equipmentInspectionName: (t: string) => `eq-${t}`,
}));
vi.mock('@/lib/data/projects', async (io) => ({ ...(await io<object>()), listProjects: vi.fn() }));
vi.mock('@/lib/data/inspections', async (io) => ({
  ...(await io<object>()),
  listInspections: vi.fn(),
  deleteInspection: vi.fn(),
}));
vi.mock('@/lib/data/bobcat', async (io) => ({
  ...(await io<object>()),
  listBobcatInspections: vi.fn(),
  deleteBobcatInspection: vi.fn(),
}));
vi.mock('@/lib/data/excavator', async (io) => ({
  ...(await io<object>()),
  listExcavatorInspections: vi.fn(),
  deleteExcavatorInspection: vi.fn(),
}));
vi.mock('@/lib/data/generalEquipment', async (io) => ({
  ...(await io<object>()),
  listGeneralEquipmentInspections: vi.fn(),
  deleteGeneralEquipmentInspection: vi.fn(),
}));
vi.mock('@/lib/data/cargoPlatform', async (io) => ({
  ...(await io<object>()),
  listCargoPlatformInspections: vi.fn(),
  deleteCargoPlatformInspection: vi.fn(),
}));

import { listProjects } from '@/lib/data/projects';
import { listInspections, deleteInspection } from '@/lib/data/inspections';
import { listBobcatInspections } from '@/lib/data/bobcat';
import { listExcavatorInspections } from '@/lib/data/excavator';
import { listGeneralEquipmentInspections } from '@/lib/data/generalEquipment';
import { listCargoPlatformInspections } from '@/lib/data/cargoPlatform';
import History from '@/pages/History';

function renderPage(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

const today = new Date().toISOString();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listProjects).mockResolvedValue([
    { id: 'p1', user_id: 'u1', name: 'პროექტი', company_name: null, address: null,
      contact_phone: null, logo: null, crew: null, latitude: null, longitude: null,
      created_at: today },
  ]);
});

describe('History', () => {
  it('renders the empty state when all lists are empty', async () => {
    vi.mocked(listInspections).mockResolvedValue([]);
    vi.mocked(listBobcatInspections).mockResolvedValue([]);
    vi.mocked(listExcavatorInspections).mockResolvedValue([]);
    vi.mocked(listGeneralEquipmentInspections).mockResolvedValue([]);
    vi.mocked(listCargoPlatformInspections).mockResolvedValue([]);
    renderPage(<History />);
    expect(await screen.findByText('ჩანაწერები არ არის')).toBeInTheDocument();
  });

  it('aggregates rows from all 5 sources and groups by date header', async () => {
    vi.mocked(listInspections).mockResolvedValue([
      { id: 'h1', project_id: 'p1', template_id: 't1', status: 'completed',
        template: [{ category: 'harness' }] as never, created_at: today, signatories: [],
        conclusion_photo_paths: [] } as never,
    ]);
    vi.mocked(listBobcatInspections).mockResolvedValue([
      { id: 'b1', projectId: 'p1', status: 'completed', createdAt: today } as never,
    ]);
    vi.mocked(listExcavatorInspections).mockResolvedValue([
      { id: 'e1', projectId: 'p1', status: 'draft', createdAt: today } as never,
    ]);
    vi.mocked(listGeneralEquipmentInspections).mockResolvedValue([
      { id: 'g1', projectId: 'p1', status: 'draft', createdAt: today } as never,
    ]);
    vi.mocked(listCargoPlatformInspections).mockResolvedValue([
      { id: 'c1', projectId: 'p1', status: 'completed', createdAt: today } as never,
    ]);
    renderPage(<History />);
    expect(await screen.findByText('დღეს')).toBeInTheDocument();
    expect(screen.getByText('eq-bobcat')).toBeInTheDocument();
    expect(screen.getByText('eq-excavator')).toBeInTheDocument();
    expect(screen.getByText('eq-general')).toBeInTheDocument();
    expect(screen.getByText('eq-cargo_platform')).toBeInTheDocument();
  });

  it('clicking trash → confirm → deleteInspection is called', async () => {
    vi.mocked(listInspections).mockResolvedValue([
      { id: 'h1', project_id: 'p1', template_id: 't1', status: 'completed',
        template: [{ category: 'harness' }] as never, created_at: today, signatories: [],
        conclusion_photo_paths: [] } as never,
    ]);
    vi.mocked(listBobcatInspections).mockResolvedValue([]);
    vi.mocked(listExcavatorInspections).mockResolvedValue([]);
    vi.mocked(listGeneralEquipmentInspections).mockResolvedValue([]);
    vi.mocked(listCargoPlatformInspections).mockResolvedValue([]);
    vi.mocked(deleteInspection).mockResolvedValue(undefined);

    renderPage(<History />);
    await screen.findByText('tpl');
    const trash = document.body.querySelectorAll('[class*="lucide-trash"]');
    expect(trash.length).toBeGreaterThan(0);
    fireEvent.click(trash[0].closest('button')!);
    fireEvent.click(await screen.findByRole('button', { name: 'წაშლა' }));
    await waitFor(() => expect(deleteInspection).toHaveBeenCalled());
    expect(vi.mocked(deleteInspection).mock.calls[0][0]).toBe('h1');
  });
});
