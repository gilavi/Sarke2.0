import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { screen, waitFor } from '@/test-utils';
import { renderPage } from '../helpers/renderPage';

vi.mock('@/lib/auth', () => ({ useAuth: vi.fn() }));
vi.mock('@/components/SignatureCanvas', () => ({ default: () => null }));
vi.mock('@/components/PhotoUploadWidget', () => ({ default: () => null }));
vi.mock('@/components/PhotoUploadZone', () => ({ default: () => null }));
vi.mock('@/components/web/SuccessModal', () => ({ default: () => null }));
vi.mock('@/components/DeleteButton', () => ({ default: () => null }));
// ProjectDetail sections - mock each to keep the index focused.
vi.mock('@/pages/ProjectDetail/ProjectHeader', () => ({ ProjectHeader: () => <div data-testid="header" /> }));
vi.mock('@/pages/ProjectDetail/ProjectDetailsCard', () => ({ ProjectDetailsCard: () => null }));
vi.mock('@/pages/ProjectDetail/CrewSection', () => ({ CrewSection: () => null }));
vi.mock('@/pages/ProjectDetail/SignersSection', () => ({ SignersSection: () => null }));
vi.mock('@/pages/ProjectDetail/FilesSection', () => ({ FilesSection: () => null }));
vi.mock('@/pages/ProjectDetail/DangerZoneSection', () => ({ DangerZoneSection: () => null }));
vi.mock('@/lib/data/projects', async (io) => ({ ...(await io<object>()), getProject: vi.fn() }));

import { useAuth } from '@/lib/auth';
import { getProject } from '@/lib/data/projects';
import ProjectDetail from '@/pages/ProjectDetail';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1' }, profile: null } as unknown as ReturnType<typeof useAuth>);
  vi.mocked(getProject).mockResolvedValue({ id: 'p1', name: 'პროექტი' } as never);
});

describe('ProjectDetail (loaded)', () => {
  it('renders the project with all sections mounted (sections stubbed)', async () => {
    renderPage(
      <Routes><Route path="/projects/:id" element={<ProjectDetail />} /></Routes>,
      '/projects/p1',
    );
    expect(await screen.findByTestId('header')).toBeInTheDocument();
    await waitFor(() => expect(getProject).toHaveBeenCalled());
  });

  it('shows the not-found state when the project query returns null', async () => {
    vi.mocked(getProject).mockResolvedValue(null);
    renderPage(
      <Routes><Route path="/projects/:id" element={<ProjectDetail />} /></Routes>,
      '/projects/x',
    );
    expect(await screen.findByText('პროექტი ვერ მოიძებნა.')).toBeInTheDocument();
  });
});
