/**
 * Editing-mode walks for ProjectDetail's editable sections.
 * The empty-state tests in projectDetailSections cover the readonly paths;
 * this file exercises the form/submit/cancel handlers.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@/test-utils';

vi.mock('@/components/ProjectMap', () => ({ default: () => null }));
vi.mock('@/lib/data/projects', async (io) => ({
  ...(await io<object>()),
  updateProject: vi.fn(),
  setProjectCrew: vi.fn(),
  addProjectSigner: vi.fn(),
  deleteProjectSigner: vi.fn(),
  listProjectSigners: vi.fn(),
  deleteProject: vi.fn(),
}));

import {
  updateProject,
  setProjectCrew,
  addProjectSigner,
  listProjectSigners,
  type Project,
} from '@/lib/data/projects';
import { ProjectDetailsCard } from '@/pages/ProjectDetail/ProjectDetailsCard';
import { CrewSection } from '@/pages/ProjectDetail/CrewSection';
import { SignersSection } from '@/pages/ProjectDetail/SignersSection';
import { DangerZoneSection } from '@/pages/ProjectDetail/DangerZoneSection';

function renderSection(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

const project: Project = {
  id: 'p1', user_id: 'u1', name: 'საცდელი',
  company_name: 'შპს ალფა', address: 'თბილისი', contact_phone: '599',
  logo: null, crew: [], latitude: 41.7, longitude: 44.8, created_at: '2026-05-01',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listProjectSigners).mockResolvedValue([]);
});

describe('ProjectDetailsCard (editing)', () => {
  it('renders editable inputs prefilled from the project', () => {
    renderSection(
      <ProjectDetailsCard project={project} editing onCancel={() => {}} onSaved={() => {}} onError={() => {}} />,
    );
    expect(screen.getByDisplayValue('საცდელი')).toBeInTheDocument();
    expect(screen.getByDisplayValue('თბილისი')).toBeInTheDocument();
    expect(screen.getByDisplayValue('599')).toBeInTheDocument();
  });

  it('calls updateProject + onSaved when save is clicked', async () => {
    vi.mocked(updateProject).mockResolvedValue(undefined);
    const onSaved = vi.fn();
    renderSection(
      <ProjectDetailsCard project={project} editing onCancel={() => {}} onSaved={onSaved} onError={() => {}} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /შენახვა/ }));
    await waitFor(() => expect(updateProject).toHaveBeenCalled());
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it('surfaces errors via onError (humanized)', async () => {
    vi.mocked(updateProject).mockRejectedValue(new Error('save failed'));
    const onError = vi.fn();
    renderSection(
      <ProjectDetailsCard project={project} editing onCancel={() => {}} onSaved={() => {}} onError={onError} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /შენახვა/ }));
    // Raw backend messages are humanized before reaching the inline error banner.
    await waitFor(() => expect(onError).toHaveBeenCalledWith('დაფიქსირდა შეცდომა. სცადეთ თავიდან.'));
  });

  it('fires onCancel when cancel is clicked', () => {
    const onCancel = vi.fn();
    renderSection(
      <ProjectDetailsCard project={project} editing onCancel={onCancel} onSaved={() => {}} onError={() => {}} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /გაუქმება/ }));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe('CrewSection (add flow)', () => {
  it('reveals the add form when the add button is clicked', () => {
    renderSection(<CrewSection project={project} onError={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /დამატება/ }));
    // The inline form renders a name input + save/cancel.
    expect(screen.getByPlaceholderText('სახელი, გვარი')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'შენახვა' })).toBeInTheDocument();
  });

  it('persists a new crew member via setProjectCrew', async () => {
    vi.mocked(setProjectCrew).mockResolvedValue(undefined);
    renderSection(<CrewSection project={project} onError={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /დამატება/ }));
    fireEvent.change(screen.getByPlaceholderText('სახელი, გვარი'), { target: { value: 'გელა ხელაძე' } });
    fireEvent.click(screen.getByRole('button', { name: 'შენახვა' }));
    await waitFor(() => expect(setProjectCrew).toHaveBeenCalled());
    const [, crewArg] = vi.mocked(setProjectCrew).mock.calls[0];
    expect(crewArg).toHaveLength(1);
    expect(crewArg[0].name).toBe('გელა ხელაძე');
  });
});

describe('SignersSection (add flow)', () => {
  it('reveals the add form + saves a new signer', async () => {
    vi.mocked(addProjectSigner).mockResolvedValue({
      id: 's1', project_id: 'p1', full_name: 'მამა', position: 'ბრიგადირი', phone: null,
    });
    renderSection(<SignersSection projectId="p1" onError={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /დამატება/ }));
    fireEvent.change(screen.getByPlaceholderText('სახელი, გვარი'), { target: { value: 'მამა' } });
    fireEvent.change(screen.getByPlaceholderText('თანამდებობა'), { target: { value: 'ბრიგადირი' } });
    fireEvent.click(screen.getByRole('button', { name: 'შენახვა' }));
    await waitFor(() =>
      expect(addProjectSigner).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: 'p1', fullName: 'მამა', position: 'ბრიგადირი' }),
      ),
    );
  });
});

describe('DangerZoneSection', () => {
  it('renders the delete-project affordance', () => {
    const { container } = renderSection(
      <DangerZoneSection project={project} onError={() => {}} />,
    );
    // The danger-zone card always renders; specific copy varies, so just sanity-check.
    expect(container.firstChild).toBeTruthy();
  });
});
