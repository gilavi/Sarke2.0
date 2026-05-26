import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@/test-utils';
import { renderPage } from '../helpers/renderPage';

vi.mock('@/lib/data/projects', () => ({ listProjects: vi.fn(), deleteProject: vi.fn() }));
vi.mock('@/components/ProjectModal', () => ({ ProjectModal: () => null }));

import { listProjects, type Project } from '@/lib/data/projects';
import Projects from '@/pages/Projects';

const project = (over: Partial<Project> = {}): Project => ({
  id: 'p1',
  user_id: 'u',
  name: 'პროექტი',
  company_name: 'შპს ალფა',
  address: 'თბილისი',
  contact_phone: null,
  logo: null,
  crew: null,
  latitude: null,
  longitude: null,
  created_at: '2026-05-01T00:00:00Z',
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe('Projects page', () => {
  it('renders the empty state when there are no projects', async () => {
    vi.mocked(listProjects).mockResolvedValue([]);
    renderPage(<Projects />);
    expect(await screen.findByRole('heading', { name: 'პროექტები' })).toBeInTheDocument();
    expect(await screen.findByText(/პროექტები ჯერ არ არის/)).toBeInTheDocument();
  });

  it('renders a project card with the company name', async () => {
    vi.mocked(listProjects).mockResolvedValue([project()]);
    renderPage(<Projects />);
    expect(await screen.findByText('შპს ალფა')).toBeInTheDocument();
  });
});
