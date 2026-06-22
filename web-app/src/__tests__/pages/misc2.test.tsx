import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { screen } from '@/test-utils';
import { renderPage } from '../helpers/renderPage';

vi.mock('@/components/AddressInput', () => ({ AddressInput: () => null }));
vi.mock('@/lib/supabase', () => ({
  supabase: { functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: { message: 'offline' } }) } },
}));
vi.mock('@/lib/data/templates', async (io) => ({ ...(await io<object>()), listTemplates: vi.fn() }));
vi.mock('@/lib/data/projects', async (io) => ({
  ...(await io<object>()),
  getProject: vi.fn(),
  updateProject: vi.fn(),
  updateProjectLogo: vi.fn(),
}));
vi.mock('@/lib/data/projectFiles', async (io) => ({
  ...(await io<object>()),
  listProjectFiles: vi.fn(),
}));

import { listTemplates, type Template } from '@/lib/data/templates';
import { getProject } from '@/lib/data/projects';
import { listProjectFiles } from '@/lib/data/projectFiles';
import Templates from '@/pages/Templates';
import Regulations from '@/pages/Regulations';
import ProjectFiles from '@/pages/ProjectFiles';
import EditProject from '@/pages/EditProject';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.mocked(listTemplates).mockResolvedValue([]);
  vi.mocked(getProject).mockResolvedValue({ id: 'p1', name: 'პროექტი' } as never);
  vi.mocked(listProjectFiles).mockResolvedValue([]);
});

describe('Templates', () => {
  it('renders the empty state', async () => {
    renderPage(<Templates />);
    expect(await screen.findByRole('heading', { name: 'შაბლონები' })).toBeInTheDocument();
    expect(await screen.findByText('შაბლონები ჯერ არ არის.')).toBeInTheDocument();
  });

  it('renders a template card', async () => {
    const tpl: Template = {
      id: 't1', owner_id: null,
      name: 'ფასადის ხარაჩოს შემოწმების აქტი',
      category: 'xaracho', is_system: true,
      required_signer_roles: ['safety_engineer'],
      created_at: '2026-05-01',
    };
    vi.mocked(listTemplates).mockResolvedValue([tpl]);
    renderPage(<Templates />);
    expect((await screen.findAllByText('ფასადის ხარაჩო')).length).toBeGreaterThan(0);
    expect(screen.getByText(/უსაფრთხოების ინჟინერი/)).toBeInTheDocument();
  });
});

describe('Regulations', () => {
  it('renders the five tracked regulations', async () => {
    renderPage(<Regulations />);
    expect(await screen.findByRole('heading', { name: 'რეგულაციები' })).toBeInTheDocument();
    expect(screen.getByText(/შრომის უსაფრთხოების შესახებ \(ორგანული კანონი\)/)).toBeInTheDocument();
    expect(screen.getByText(/საქართველოს შრომის კოდექსი/)).toBeInTheDocument();
  });
});

describe('ProjectFiles', () => {
  it('renders the empty state for a project with no files', async () => {
    renderPage(
      <Routes><Route path="/projects/:id/files" element={<ProjectFiles />} /></Routes>,
      '/projects/p1/files',
    );
    expect(await screen.findByRole('heading', { name: 'ფაილები' })).toBeInTheDocument();
    expect(await screen.findByText('ფაილები ჯერ არ არის.')).toBeInTheDocument();
  });

  it('renders a file row', async () => {
    vi.mocked(listProjectFiles).mockResolvedValue([
      { id: 'f1', project_id: 'p1', name: 'doc.pdf', storage_path: 'p1/doc.pdf', size_bytes: 2048, mime_type: 'application/pdf', created_at: '2026-05-01' },
    ]);
    renderPage(
      <Routes><Route path="/projects/:id/files" element={<ProjectFiles />} /></Routes>,
      '/projects/p1/files',
    );
    expect(await screen.findByText('doc.pdf')).toBeInTheDocument();
    expect(screen.getByText(/2\.0 KB/)).toBeInTheDocument();
  });
});

describe('EditProject', () => {
  it('renders the edit form populated from the project', async () => {
    vi.mocked(getProject).mockResolvedValue({
      id: 'p1', user_id: 'u1', name: 'საცდელი პროექტი',
      company_name: 'შპს ალფა', address: 'თბილისი', contact_phone: null,
      logo: null, crew: null, latitude: null, longitude: null,
      created_at: '2026-05-01',
    } as never);
    renderPage(
      <Routes><Route path="/projects/:id/edit" element={<EditProject />} /></Routes>,
      '/projects/p1/edit',
    );
    expect(await screen.findByRole('heading', { name: 'პროექტის რედაქტირება' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('საცდელი პროექტი')).toBeInTheDocument();
    expect(screen.getByDisplayValue('შპს ალფა')).toBeInTheDocument();
  });

  it('shows the not-found state for a missing project', async () => {
    vi.mocked(getProject).mockResolvedValue(null);
    renderPage(
      <Routes><Route path="/projects/:id/edit" element={<EditProject />} /></Routes>,
      '/projects/x/edit',
    );
    expect(await screen.findByText('პროექტი ვერ მოიძებნა.')).toBeInTheDocument();
  });
});
