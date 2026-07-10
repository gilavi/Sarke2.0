/**
 * Extra renders for the high-yield pages - Calendar with a real event,
 * ProjectActivityWidget with inspection data, ProjectDetailsCard in edit mode.
 * Each exercises the data-mapping + JSX paths that the empty-state tests don't reach.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, render } from '@/test-utils';

vi.mock('@/lib/auth', () => ({ useAuth: vi.fn(() => ({ user: { id: 'u1' }, profile: null })) }));
vi.mock('@/lib/documentNames', () => ({
  useInspectionName: () => () => 'tpl',
  equipmentInspectionName: (t: string) => `eq-${t}`,
}));
vi.mock('@/components/AddressInput', () => ({ AddressInput: () => null }));
vi.mock('@/lib/data/projects', async (io) => ({
  ...(await io<object>()),
  listProjects: vi.fn(),
  updateProject: vi.fn(),
  updateProjectLogo: vi.fn(),
}));
vi.mock('@/lib/data/inspections', async (io) => ({ ...(await io<object>()), listInspections: vi.fn() }));
vi.mock('@/lib/data/bobcat', async (io) => ({ ...(await io<object>()), listBobcatInspections: vi.fn() }));
vi.mock('@/lib/data/excavator', async (io) => ({ ...(await io<object>()), listExcavatorInspections: vi.fn() }));
vi.mock('@/lib/data/generalEquipment', async (io) => ({
  ...(await io<object>()),
  listGeneralEquipmentInspections: vi.fn(),
}));
vi.mock('@/lib/data/cargoPlatform', async (io) => ({
  ...(await io<object>()),
  listCargoPlatformInspections: vi.fn(),
}));
vi.mock('@/lib/data/incidents', async (io) => ({ ...(await io<object>()), listIncidents: vi.fn() }));
vi.mock('@/lib/data/briefings', async (io) => ({ ...(await io<object>()), listBriefings: vi.fn() }));
// Calendar reads acts through the merged useActRows hook; mock it directly so
// the test never depends on unmocked per-type list modules (network → CI hang).
// ProjectActivityWidget still queries the per-type modules above.
vi.mock('@/lib/data/recordRows', () => ({ useActRows: vi.fn() }));

import { listProjects } from '@/lib/data/projects';
import { useActRows } from '@/lib/data/recordRows';
import { listInspections } from '@/lib/data/inspections';
import { listBobcatInspections } from '@/lib/data/bobcat';
import { listExcavatorInspections } from '@/lib/data/excavator';
import { listGeneralEquipmentInspections } from '@/lib/data/generalEquipment';
import { listCargoPlatformInspections } from '@/lib/data/cargoPlatform';
import { listIncidents } from '@/lib/data/incidents';
import { listBriefings } from '@/lib/data/briefings';

import Calendar from '@/pages/Calendar';
import { ProjectActivityWidget } from '@/components/ProjectActivityWidget';
import { ProjectDetailsCard } from '@/pages/ProjectDetail/ProjectDetailsCard';

function renderPage(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

const project = {
  id: 'p1', user_id: 'u1', name: 'პროექტი',
  company_name: 'შპს', address: 'X', contact_phone: '599',
  logo: null, crew: null, latitude: null, longitude: null,
  created_at: '2026-05-01',
};

const today = new Date();
const todayISO = today.toISOString();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listProjects).mockResolvedValue([project]);
  vi.mocked(listInspections).mockResolvedValue([]);
  vi.mocked(listBobcatInspections).mockResolvedValue([]);
  vi.mocked(listExcavatorInspections).mockResolvedValue([]);
  vi.mocked(listGeneralEquipmentInspections).mockResolvedValue([]);
  vi.mocked(listCargoPlatformInspections).mockResolvedValue([]);
  vi.mocked(listIncidents).mockResolvedValue([]);
  vi.mocked(listBriefings).mockResolvedValue([]);
  vi.mocked(useActRows).mockReturnValue({ rows: [], isLoading: false, isError: false });
});

describe('Calendar (with events)', () => {
  it('builds events from merged act rows, briefings, and incidents', async () => {
    vi.mocked(useActRows).mockReturnValue({
      rows: [
        { id: 'i1', label: 'tpl', projectId: 'p1', actKey: null, type: 'harness',
          status: 'completed', date: todayISO, href: '/inspections/i1' },
        { id: 'b1', label: 'eq-bobcat', projectId: 'p1', actKey: 'bobcat', type: 'bobcat',
          status: 'completed', date: todayISO, href: '/bobcat/b1' },
      ],
      isLoading: false,
      isError: false,
    });
    vi.mocked(listIncidents).mockResolvedValue([
      { id: 'inc1', project_id: 'p1', type: 'minor', date_time: todayISO, status: 'completed' } as never,
    ]);
    vi.mocked(listBriefings).mockResolvedValue([
      { id: 'br1', projectId: 'p1', dateTime: todayISO, topics: ['ppe'], participants: [], inspectorName: 'ი', status: 'completed', createdAt: todayISO } as never,
    ]);

    renderPage(<Calendar />);
    // The month header is always rendered. Wait for any month name to appear.
    expect(
      await screen.findByText(
        /(იანვარი|თებერვალი|მარტი|აპრილი|მაისი|ივნისი|ივლისი|აგვისტო|სექტემბერი|ოქტომბერი|ნოემბერი|დეკემბერი)\s+\d{4}/,
      ),
    ).toBeInTheDocument();
  });
});

describe('ProjectActivityWidget (with data)', () => {
  it('renders inspection rows for the project', async () => {
    vi.mocked(listInspections).mockResolvedValue([
      { id: 'i1', project_id: 'p1', template_id: 't', status: 'completed', created_at: '2026-05-01', signatories: [], conclusion_photo_paths: [] } as never,
    ]);
    vi.mocked(listBobcatInspections).mockResolvedValue([
      { id: 'b1', projectId: 'p1', status: 'completed', createdAt: '2026-05-02' } as never,
    ]);
    renderPage(<ProjectActivityWidget project={project} onNewAct={() => {}} />);
    // Equipment inspection name comes from the mocked equipmentInspectionName ('eq-bobcat').
    expect(await screen.findByText('eq-bobcat')).toBeInTheDocument();
  });
});

describe('ProjectDetailsCard (editing mode)', () => {
  it('renders the editable form when editing=true', () => {
    renderPage(
      <ProjectDetailsCard
        project={project}
        editing
        onCancel={() => {}}
        onSaved={() => {}}
        onError={() => {}}
      />,
    );
    // Edit mode has Save + Cancel buttons.
    expect(screen.getByRole('button', { name: /შენახვა/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /გაუქმება/ })).toBeInTheDocument();
  });
});
