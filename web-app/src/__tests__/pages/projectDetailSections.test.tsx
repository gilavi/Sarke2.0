import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@/test-utils';
import type { Project } from '@/lib/data/projects';

vi.mock('@/components/AddressInput', () => ({ AddressInput: () => null }));
vi.mock('@/lib/auth', () => ({ useAuth: vi.fn(() => ({ user: { id: 'u1' } })) }));
vi.mock('@/lib/documentNames', () => ({
  useInspectionName: () => () => 'tpl',
  equipmentInspectionName: (t: string) => `eq-${t}`,
}));
vi.mock('@/lib/data/projects', async (io) => ({
  ...(await io<object>()),
  updateProject: vi.fn(),
  updateProjectLogo: vi.fn(),
  deleteProject: vi.fn(),
  setProjectCrew: vi.fn(),
  addProjectSigner: vi.fn(),
  deleteProjectSigner: vi.fn(),
  listProjectSigners: vi.fn(),
}));
vi.mock('@/lib/data/inspections', async (io) => ({ ...(await io<object>()), listInspections: vi.fn() }));
vi.mock('@/lib/data/bobcat', async (io) => ({ ...(await io<object>()), listBobcatInspections: vi.fn() }));
vi.mock('@/lib/data/excavator', async (io) => ({ ...(await io<object>()), listExcavatorInspections: vi.fn() }));
vi.mock('@/lib/data/generalEquipment', async (io) => ({
  ...(await io<object>()),
  listGeneralEquipmentInspections: vi.fn(),
}));
vi.mock('@/lib/data/incidents', async (io) => ({ ...(await io<object>()), listIncidents: vi.fn() }));
vi.mock('@/lib/data/briefings', async (io) => ({ ...(await io<object>()), listBriefings: vi.fn() }));
vi.mock('@/lib/data/reports', async (io) => ({ ...(await io<object>()), listReports: vi.fn() }));
vi.mock('@/lib/data/orders', async (io) => ({ ...(await io<object>()), listOrdersByProject: vi.fn() }));
vi.mock('@/lib/data/projectFiles', async (io) => ({ ...(await io<object>()), listProjectFiles: vi.fn() }));

import { listProjectSigners } from '@/lib/data/projects';
import { listInspections } from '@/lib/data/inspections';
import { listBobcatInspections } from '@/lib/data/bobcat';
import { listExcavatorInspections } from '@/lib/data/excavator';
import { listGeneralEquipmentInspections } from '@/lib/data/generalEquipment';
import { listIncidents } from '@/lib/data/incidents';
import { listBriefings } from '@/lib/data/briefings';
import { listReports } from '@/lib/data/reports';
import { listOrdersByProject } from '@/lib/data/orders';
import { listProjectFiles } from '@/lib/data/projectFiles';

import { ProjectHeader } from '@/pages/ProjectDetail/ProjectHeader';
import { ProjectDetailsCard } from '@/pages/ProjectDetail/ProjectDetailsCard';
import { CrewSection } from '@/pages/ProjectDetail/CrewSection';
import { SignersSection } from '@/pages/ProjectDetail/SignersSection';
import { InspectionsSection } from '@/pages/ProjectDetail/InspectionsSection';
import { IncidentsSection } from '@/pages/ProjectDetail/IncidentsSection';
import { BriefingsSection } from '@/pages/ProjectDetail/BriefingsSection';
import { ReportsSection } from '@/pages/ProjectDetail/ReportsSection';
import { FilesSection } from '@/pages/ProjectDetail/FilesSection';
import { OrdersSection } from '@/pages/ProjectDetail/OrdersSection';
import { DangerZoneSection } from '@/pages/ProjectDetail/DangerZoneSection';

function renderSection(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

const project: Project = {
  id: 'p1',
  user_id: 'u1',
  name: 'საცდელი პროექტი',
  company_name: 'შპს ალფა',
  address: 'თბილისი',
  contact_phone: '599',
  logo: null,
  crew: [],
  latitude: null,
  longitude: null,
  created_at: '2026-05-01',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listProjectSigners).mockResolvedValue([]);
  vi.mocked(listInspections).mockResolvedValue([]);
  vi.mocked(listBobcatInspections).mockResolvedValue([]);
  vi.mocked(listExcavatorInspections).mockResolvedValue([]);
  vi.mocked(listGeneralEquipmentInspections).mockResolvedValue([]);
  vi.mocked(listIncidents).mockResolvedValue([]);
  vi.mocked(listBriefings).mockResolvedValue([]);
  vi.mocked(listReports).mockResolvedValue([]);
  vi.mocked(listOrdersByProject).mockResolvedValue([]);
  vi.mocked(listProjectFiles).mockResolvedValue([]);
});

describe('ProjectHeader', () => {
  it('renders the project name + edit button', () => {
    renderSection(<ProjectHeader project={project} editing={false} onEdit={() => {}} onError={() => {}} />);
    expect(screen.getByRole('heading', { level: 1, name: 'საცდელი პროექტი' })).toBeInTheDocument();
    expect(screen.getByText('შპს ალფა')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /რედაქტირება/ })).toBeInTheDocument();
  });

  it('hides the edit button while editing', () => {
    renderSection(<ProjectHeader project={project} editing={true} onEdit={() => {}} onError={() => {}} />);
    expect(screen.queryByRole('button', { name: /რედაქტირება/ })).not.toBeInTheDocument();
  });
});

describe('ProjectDetailsCard', () => {
  it('renders the details card', () => {
    renderSection(
      <ProjectDetailsCard
        project={project}
        editing={false}
        onCancel={() => {}}
        onSaved={() => {}}
        onError={() => {}}
      />,
    );
    expect(screen.getByText('დეტალები')).toBeInTheDocument();
  });
});

describe('CrewSection', () => {
  it('renders the empty state for a project with no crew', () => {
    renderSection(<CrewSection project={project} onError={() => {}} />);
    expect(screen.getByText('გუნდის წევრები ჯერ არ არიან.')).toBeInTheDocument();
  });
});

describe('SignersSection', () => {
  it('renders the empty state', async () => {
    renderSection(<SignersSection projectId="p1" onError={() => {}} />);
    expect(await screen.findByText('ხელმომწერები ჯერ არ არის.')).toBeInTheDocument();
  });
});

describe('InspectionsSection', () => {
  it('renders the empty state across all four inspection types', async () => {
    renderSection(<InspectionsSection projectId="p1" onNew={() => {}} />);
    expect(await screen.findByText('აქტები ჯერ არ არის.')).toBeInTheDocument();
  });
});

describe('IncidentsSection', () => {
  it('renders the empty state', async () => {
    renderSection(<IncidentsSection projectId="p1" />);
    expect(await screen.findByText('ინციდენტები ჯერ არ არის.')).toBeInTheDocument();
  });
});

describe('BriefingsSection', () => {
  it('renders the empty state', async () => {
    renderSection(<BriefingsSection projectId="p1" />);
    expect(await screen.findByText('ინსტრუქტაჟები ჯერ არ არის.')).toBeInTheDocument();
  });
});

describe('ReportsSection', () => {
  it('renders the empty state', async () => {
    renderSection(<ReportsSection projectId="p1" />);
    expect(await screen.findByText('რეპორტები ჯერ არ არის.')).toBeInTheDocument();
  });
});

describe('FilesSection', () => {
  it('renders the empty state', async () => {
    renderSection(<FilesSection projectId="p1" onError={() => {}} />);
    expect(await screen.findByText('ფაილები ჯერ არ არის.')).toBeInTheDocument();
  });
});

describe('OrdersSection', () => {
  it('renders the empty state', async () => {
    renderSection(<OrdersSection projectId="p1" />);
    expect(await screen.findByText('ბრძანებები ჯერ არ არის.')).toBeInTheDocument();
  });
});

describe('DangerZoneSection', () => {
  it('mounts the danger zone for a project', () => {
    const { container } = renderSection(<DangerZoneSection project={project} onError={() => {}} />);
    expect(container.firstChild).toBeTruthy();
  });
});
