/**
 * Inspections list page (43% covered): exercises the row aggregation across all
 * five inspection types + the project filter + the delete confirmation flow.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@/test-utils';

vi.mock('@/components/InspectionWizard', () => ({ default: () => null }));
vi.mock('@/lib/documentNames', () => ({
  useInspectionName: () => () => 'tpl-name',
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
import Inspections from '@/pages/Inspections';

function renderPage(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listProjects).mockResolvedValue([
    { id: 'p1', user_id: 'u1', name: 'პროექტი ალფა', company_name: 'შპს', address: null,
      contact_phone: null, logo: null, crew: null, latitude: null, longitude: null, created_at: '2026-05-01' },
    { id: 'p2', user_id: 'u1', name: 'პროექტი ბეტა', company_name: 'შპს', address: null,
      contact_phone: null, logo: null, crew: null, latitude: null, longitude: null, created_at: '2026-05-01' },
  ]);
  vi.mocked(listInspections).mockResolvedValue([
    { id: 'h1', project_id: 'p1', template_id: 't1', status: 'completed',
      template: [{ category: 'harness' }] as never, created_at: '2026-05-01', signatories: [],
      conclusion_photo_paths: [] } as never,
  ]);
  vi.mocked(listBobcatInspections).mockResolvedValue([
    { id: 'b1', projectId: 'p1', status: 'draft', createdAt: '2026-05-01' } as never,
  ]);
  vi.mocked(listExcavatorInspections).mockResolvedValue([
    { id: 'e1', projectId: 'p2', status: 'completed', createdAt: '2026-05-01' } as never,
  ]);
  vi.mocked(listGeneralEquipmentInspections).mockResolvedValue([
    { id: 'g1', projectId: 'p2', status: 'draft', createdAt: '2026-05-01' } as never,
  ]);
  vi.mocked(listCargoPlatformInspections).mockResolvedValue([
    { id: 'c1', projectId: 'p1', status: 'completed', createdAt: '2026-05-01' } as never,
  ]);
});

describe('Inspections list', () => {
  it('renders rows from all inspection types (data-driven)', async () => {
    renderPage(<Inspections />);
    // One <a href> row per seeded type — generic harness + 4 structured equipment.
    await waitFor(() => expect(document.querySelector('a[href="/bobcat/b1"]')).toBeInTheDocument());
    expect(document.querySelector('a[href="/excavator/e1"]')).toBeInTheDocument();
    expect(document.querySelector('a[href="/general-equipment/g1"]')).toBeInTheDocument();
    expect(document.querySelector('a[href="/cargo-platform/c1"]')).toBeInTheDocument();
    expect(document.querySelector('a[href="/harness/h1"]')).toBeInTheDocument();
  });

  it('the project filter pills filter rows', async () => {
    renderPage(<Inspections />);
    await waitFor(() => expect(document.querySelector('a[href="/bobcat/b1"]')).toBeInTheDocument());
    // Filter to პროექტი ბეტა (p2) — bobcat (p1) hides, excavator (p2) stays.
    fireEvent.click(screen.getByRole('button', { name: 'პროექტი ბეტა' }));
    await waitFor(() => expect(document.querySelector('a[href="/bobcat/b1"]')).not.toBeInTheDocument());
    expect(document.querySelector('a[href="/excavator/e1"]')).toBeInTheDocument();
  });

  it('clicking the trash → confirm modal → confirm fires the delete', async () => {
    vi.mocked(deleteInspection).mockResolvedValue(undefined);
    renderPage(<Inspections />);
    await waitFor(() => expect(document.querySelector('a[href="/harness/h1"]')).toBeInTheDocument());
    // First row (sorted by date, generic harness leads) — click its trash button.
    const allTrash = document.body.querySelectorAll('[class*="lucide-trash"]');
    expect(allTrash.length).toBeGreaterThan(0);
    const trashBtn = allTrash[0].closest('button');
    expect(trashBtn).toBeTruthy();
    fireEvent.click(trashBtn!);
    const confirmBtn = await screen.findByRole('button', { name: 'წაშლა' });
    fireEvent.click(confirmBtn);
    await waitFor(() => expect(deleteInspection).toHaveBeenCalled());
  });
});
