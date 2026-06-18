/**
 * ProjectModal - create + edit flows. Currently 34% covered; this exercises:
 * - mounting in create mode (no projectId)
 * - mounting in edit mode (pre-fills from getProject)
 * - validation: empty name shows error
 * - submit: createProject called with normalized form
 * - cancel: onClose fired
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@/test-utils';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/components/AddressInput', () => ({
  AddressInput: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input data-testid="address" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));
vi.mock('@/lib/auth', () => ({ useAuth: vi.fn(() => ({ user: { id: 'u1' } })) }));
vi.mock('@/lib/data/projects', async (io) => ({
  ...(await io<object>()),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  updateProjectLogo: vi.fn(),
  getProject: vi.fn(),
}));

import { ProjectModal } from '@/components/ProjectModal';
import { createProject, updateProject, getProject, type Project } from '@/lib/data/projects';

function renderModal(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

const existing: Project = {
  id: 'p1', user_id: 'u1', name: 'ჩემი პროექტი', company_name: 'შპს ალფა',
  address: 'თბილისი', contact_phone: '599100100', logo: null, crew: [],
  latitude: 41.7, longitude: 44.8, created_at: '2026-05-01',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createProject).mockResolvedValue({ ...existing, id: 'p-new' } as never);
  vi.mocked(updateProject).mockResolvedValue(undefined);
  vi.mocked(getProject).mockResolvedValue(existing);
});

describe('ProjectModal (create)', () => {
  it('renders the create-mode form with empty inputs', () => {
    renderModal(<ProjectModal open onClose={() => {}} />);
    expect(screen.getByText('ახალი პროექტი')).toBeInTheDocument();
    // Label "პროექტის სახელი *" is rendered.
    expect(screen.getByText(/პროექტის სახელი/)).toBeInTheDocument();
  });

  it('shows validation error when name is empty + submit clicked', async () => {
    renderModal(<ProjectModal open onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'შექმნა' }));
    expect(await screen.findByText('სახელი სავალდებულოა')).toBeInTheDocument();
    expect(createProject).not.toHaveBeenCalled();
  });

  it('cancel button fires onClose', () => {
    const onClose = vi.fn();
    renderModal(<ProjectModal open onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'გაუქმება' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('submitting a filled form calls createProject with trimmed strings', async () => {
    renderModal(<ProjectModal open onClose={() => {}} />);
    // The Mantine TextInput labels are clickable, click the name input via id.
    const nameInput = document.getElementById('pm-name') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'ახალი პროექტი' } });
    const companyInput = document.getElementById('pm-company') as HTMLInputElement;
    fireEvent.change(companyInput, { target: { value: 'შპს' } });
    const phoneInput = document.getElementById('pm-phone') as HTMLInputElement;
    fireEvent.change(phoneInput, { target: { value: '599100100' } });

    fireEvent.click(screen.getByRole('button', { name: 'შექმნა' }));
    await waitFor(() => expect(createProject).toHaveBeenCalled());
    const arg = vi.mocked(createProject).mock.calls[0][0];
    expect(arg.name).toBe('ახალი პროექტი');
    expect(arg.companyName).toBe('შპს');
    expect(arg.contactPhone).toBe('599100100');
  });
});

describe('ProjectModal (edit)', () => {
  it('pre-fills the inputs from getProject when projectId is given', async () => {
    renderModal(<ProjectModal open onClose={() => {}} projectId="p1" />);
    expect(await screen.findByDisplayValue('ჩემი პროექტი')).toBeInTheDocument();
    expect(screen.getByDisplayValue('შპს ალფა')).toBeInTheDocument();
    expect(screen.getByDisplayValue('599100100')).toBeInTheDocument();
  });

  it('save calls updateProject with the patched values', async () => {
    renderModal(<ProjectModal open onClose={() => {}} projectId="p1" />);
    const nameInput = await screen.findByDisplayValue('ჩემი პროექტი');
    fireEvent.change(nameInput, { target: { value: 'ახალი სახელი' } });
    fireEvent.click(screen.getByRole('button', { name: 'შენახვა' }));
    await waitFor(() => expect(updateProject).toHaveBeenCalled());
    const [calledId, patch] = vi.mocked(updateProject).mock.calls[0];
    expect(calledId).toBe('p1');
    expect((patch as Record<string, unknown>).name).toBe('ახალი სახელი');
  });

  it('shows phone validation when too-short phone is entered', async () => {
    renderModal(<ProjectModal open onClose={() => {}} projectId="p1" />);
    await screen.findByDisplayValue('599100100');
    const phoneInput = document.getElementById('pm-phone') as HTMLInputElement;
    // Too few digits → validation rejects.
    fireEvent.change(phoneInput, { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'შენახვა' }));
    expect(await screen.findByText('ტელეფონი: 6–15 ციფრი')).toBeInTheDocument();
  });
});
