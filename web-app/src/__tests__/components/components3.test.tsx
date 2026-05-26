import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Award } from 'lucide-react';
import { screen, render } from '@/test-utils';

vi.mock('@/lib/auth', () => ({ useAuth: vi.fn(() => ({ user: { id: 'u1' }, profile: null })) }));
vi.mock('@/lib/documentNames', () => ({
  useInspectionName: () => () => 'tpl',
  equipmentInspectionName: (t: string) => `eq-${t}`,
}));
vi.mock('@/components/AddressInput', () => ({ AddressInput: () => null }));
vi.mock('@/lib/data/projects', async (io) => ({
  ...(await io<object>()),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  updateProjectLogo: vi.fn(),
  getProject: vi.fn(),
}));
vi.mock('@/lib/data/inspections', async (io) => ({ ...(await io<object>()), listInspections: vi.fn() }));
vi.mock('@/lib/data/bobcat', async (io) => ({ ...(await io<object>()), listBobcatInspections: vi.fn() }));
vi.mock('@/lib/data/excavator', async (io) => ({ ...(await io<object>()), listExcavatorInspections: vi.fn() }));
vi.mock('@/lib/data/generalEquipment', async (io) => ({
  ...(await io<object>()),
  listGeneralEquipmentInspections: vi.fn(),
}));

import { listInspections } from '@/lib/data/inspections';
import { listBobcatInspections } from '@/lib/data/bobcat';
import { listExcavatorInspections } from '@/lib/data/excavator';
import { listGeneralEquipmentInspections } from '@/lib/data/generalEquipment';
import { ListRow } from '@/components/ListRow';
import { ExpandableRow } from '@/components/ExpandableRow';
import FieldInput from '@/components/FieldInput';
import { ProjectActivityWidget } from '@/components/ProjectActivityWidget';
import { Sidebar } from '@/components/layout/Sidebar';
import { ProjectModal } from '@/components/ProjectModal';

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

const project = {
  id: 'p1', user_id: 'u1', name: 'საცდელი',
  company_name: 'შპს', address: 'X', contact_phone: null,
  logo: null, crew: null, latitude: null, longitude: null,
  created_at: '2026-05-01',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listInspections).mockResolvedValue([]);
  vi.mocked(listBobcatInspections).mockResolvedValue([]);
  vi.mocked(listExcavatorInspections).mockResolvedValue([]);
  vi.mocked(listGeneralEquipmentInspections).mockResolvedValue([]);
});

describe('ListRow', () => {
  it('renders a navigable row with title, subtitle, and trailing', () => {
    renderWithProviders(
      <ListRow to="/x" title="Title" subtitle="subtitle" trailing="trail" icon={<Award size={14} />} />,
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('subtitle')).toBeInTheDocument();
    expect(screen.getByText('trail')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/x');
  });
});

describe('ExpandableRow', () => {
  it('renders the title and child content inside an accordion', () => {
    renderWithProviders(
      <ExpandableRow title="ჩამოშლადი" subtitle="subtitle">
        <p>inner content</p>
      </ExpandableRow>,
    );
    expect(screen.getByText('ჩამოშლადი')).toBeInTheDocument();
    // Accordion renders the panel collapsed by default; testing-library still finds it.
    expect(screen.getByText('inner content')).toBeInTheDocument();
  });
});

describe('FieldInput', () => {
  it('renders the label and accepts input', () => {
    renderWithProviders(
      <FieldInput label="სახელი" value="გელა" disabled={false} onSave={() => {}} />,
    );
    expect(screen.getByText('სახელი')).toBeInTheDocument();
    expect(screen.getByDisplayValue('გელა')).toBeInTheDocument();
  });
});

describe('ProjectActivityWidget', () => {
  it('renders the project name with no-activity state when there are no inspections', async () => {
    renderWithProviders(<ProjectActivityWidget project={project} onNewAct={() => {}} />);
    expect(await screen.findByText('საცდელი')).toBeInTheDocument();
  });
});

describe('Sidebar', () => {
  it('renders the sidebar shell on the desktop layout', () => {
    const { container } = renderWithProviders(<Sidebar open={false} onClose={() => {}} />);
    expect(container.firstChild).toBeTruthy();
    // Sidebar shows "Hubble" brand text in its header.
    expect(screen.getAllByText('Hubble').length).toBeGreaterThan(0);
  });
});

describe('ProjectModal', () => {
  it('renders nothing when closed', () => {
    renderWithProviders(<ProjectModal open={false} onClose={() => {}} />);
    expect(screen.queryByText('ახალი პროექტი')).not.toBeInTheDocument();
  });

  it('renders the new-project form when opened without an id', () => {
    renderWithProviders(<ProjectModal open onClose={() => {}} />);
    // Modal title for create mode.
    expect(screen.getByText('ახალი პროექტი')).toBeInTheDocument();
  });
});
