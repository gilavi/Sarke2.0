import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@/test-utils';
import { renderPage } from '../helpers/renderPage';

// InspectionWizard calls useAuth(); stub it so the list page renders without an
// AuthProvider in the test tree.
vi.mock('@/components/InspectionWizard', () => ({ default: () => null }));
vi.mock('@/lib/documentNames', async (io) => ({
  ...(await io<object>()),
  useInspectionName: () => (id: string | null | undefined) => `tpl-${id ?? ''}`,
}));

// The Inspections list is data-driven over the structured-act registry, which
// dispatches to the per-type list functions exported from lib/data/*. Mocking
// those exports covers both the generic and the structured queries.
vi.mock('@/lib/data/inspections', async (io) => ({ ...(await io<object>()), listInspections: vi.fn() }));
vi.mock('@/lib/data/bobcat', async (io) => ({ ...(await io<object>()), listBobcatInspections: vi.fn() }));
vi.mock('@/lib/data/excavator', async (io) => ({ ...(await io<object>()), listExcavatorInspections: vi.fn() }));
vi.mock('@/lib/data/generalEquipment', async (io) => ({ ...(await io<object>()), listGeneralEquipmentInspections: vi.fn() }));
vi.mock('@/lib/data/cargoPlatform', async (io) => ({ ...(await io<object>()), listCargoPlatformInspections: vi.fn() }));
vi.mock('@/lib/data/safetyNet', async (io) => ({ ...(await io<object>()), listSafetyNetInspections: vi.fn() }));
vi.mock('@/lib/data/mobileLadder', async (io) => ({ ...(await io<object>()), listMobileLadderInspections: vi.fn() }));
vi.mock('@/lib/data/forklift', async (io) => ({ ...(await io<object>()), listForkliftInspections: vi.fn() }));
vi.mock('@/lib/data/liftingAccessories', async (io) => ({ ...(await io<object>()), listLiftingAccessoriesInspections: vi.fn() }));
vi.mock('@/lib/data/fallProtection', async (io) => ({ ...(await io<object>()), listFallProtectionInspections: vi.fn() }));
vi.mock('@/lib/data/projects', async (io) => ({ ...(await io<object>()), listProjects: vi.fn() }));

import { listInspections } from '@/lib/data/inspections';
import { listBobcatInspections } from '@/lib/data/bobcat';
import { listExcavatorInspections } from '@/lib/data/excavator';
import { listGeneralEquipmentInspections } from '@/lib/data/generalEquipment';
import { listCargoPlatformInspections } from '@/lib/data/cargoPlatform';
import { listSafetyNetInspections } from '@/lib/data/safetyNet';
import { listMobileLadderInspections } from '@/lib/data/mobileLadder';
import { listForkliftInspections } from '@/lib/data/forklift';
import { listLiftingAccessoriesInspections } from '@/lib/data/liftingAccessories';
import { listFallProtectionInspections } from '@/lib/data/fallProtection';
import { listProjects } from '@/lib/data/projects';
import Inspections from '@/pages/Inspections';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listInspections).mockResolvedValue([]);
  vi.mocked(listBobcatInspections).mockResolvedValue([]);
  vi.mocked(listExcavatorInspections).mockResolvedValue([]);
  vi.mocked(listGeneralEquipmentInspections).mockResolvedValue([]);
  vi.mocked(listCargoPlatformInspections).mockResolvedValue([]);
  vi.mocked(listSafetyNetInspections).mockResolvedValue([]);
  vi.mocked(listMobileLadderInspections).mockResolvedValue([]);
  vi.mocked(listForkliftInspections).mockResolvedValue([]);
  vi.mocked(listLiftingAccessoriesInspections).mockResolvedValue([]);
  vi.mocked(listFallProtectionInspections).mockResolvedValue([]);
  vi.mocked(listProjects).mockResolvedValue([]);
});

describe('Inspections list page', () => {
  it('renders the empty state when there are no inspections', async () => {
    renderPage(<Inspections />);
    expect(await screen.findByText('შემოწმების აქტები ჯერ არ გაქვთ.')).toBeInTheDocument();
  });

  it('renders the page header and new-inspection button', async () => {
    renderPage(<Inspections />);
    expect(await screen.findByRole('heading', { name: 'შემოწმების აქტები' })).toBeInTheDocument();
    expect(screen.getByText('+ ახალი შემოწმება')).toBeInTheDocument();
  });

  it('renders an equipment inspection row from the registry', async () => {
    vi.mocked(listBobcatInspections).mockResolvedValue([
      { id: 'b1', projectId: 'p1', status: 'completed', createdAt: '2026-05-01' },
    ] as never);
    renderPage(<Inspections />);
    // The data-driven page renders one <a href="/bobcat/b1"> row.
    await vi.waitFor(() => expect(document.querySelector('a[href="/bobcat/b1"]')).toBeInTheDocument());
  });
});
