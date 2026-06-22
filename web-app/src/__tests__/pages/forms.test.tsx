import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@/test-utils';
import { renderPage } from '../helpers/renderPage';

vi.mock('@/lib/auth', () => ({ useAuth: vi.fn() }));
vi.mock('@/components/ProjectAvatar', () => ({ EditableProjectAvatar: () => null, ProjectAvatar: () => null }));
vi.mock('@/components/AddressInput', () => ({ AddressInput: () => null }));
vi.mock('@/components/SignatureCanvas', () => ({ default: () => null }));
vi.mock('@/lib/data/projects', async (io) => ({
  ...(await io<object>()),
  createProject: vi.fn(),
  updateProjectLogo: vi.fn(),
  listProjects: vi.fn(),
  getProject: vi.fn(),
}));

import { useAuth } from '@/lib/auth';
import { createProject, listProjects, getProject } from '@/lib/data/projects';
import NewProject from '@/pages/NewProject';

function fill(container: HTMLElement, id: string, value: string) {
  fireEvent.change(container.querySelector(`#${id}`) as HTMLInputElement, { target: { value } });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1', email: 'a@b.com' } } as unknown as ReturnType<typeof useAuth>);
  vi.mocked(listProjects).mockResolvedValue([]);
  vi.mocked(createProject).mockResolvedValue({ id: 'p1' } as never);
  vi.mocked(getProject).mockResolvedValue({ id: 'p1', name: 'პროექტი' } as never);
});

describe('NewProject', () => {
  it('creates a project from the form', async () => {
    const { container } = renderPage(<NewProject />, '/projects/new');
    expect(screen.getByRole('heading', { name: 'ახალი პროექტი' })).toBeInTheDocument();
    fill(container, 'name', 'ჩემი პროექტი');
    fireEvent.click(screen.getByRole('button', { name: 'შექმნა' }));
    await waitFor(() =>
      expect(createProject).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', name: 'ჩემი პროექტი' })),
    );
  });
});
