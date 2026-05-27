/**
 * ProjectFiles page (37% covered) — list, download, delete.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { screen, fireEvent, waitFor } from '@/test-utils';
import { renderPage } from '../helpers/renderPage';

vi.mock('@/lib/data/projects', async (io) => ({ ...(await io<object>()), getProject: vi.fn() }));
vi.mock('@/lib/data/projectFiles', async (io) => ({
  ...(await io<object>()),
  listProjectFiles: vi.fn(),
  signedFileUrl: vi.fn(),
  deleteProjectFile: vi.fn(),
  formatSize: (n: number) => `${n} B`,
}));

import { getProject } from '@/lib/data/projects';
import { listProjectFiles, signedFileUrl, deleteProjectFile } from '@/lib/data/projectFiles';
import ProjectFiles from '@/pages/ProjectFiles';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getProject).mockResolvedValue({
    id: 'p1', user_id: 'u1', name: 'პროექტი', company_name: null,
    address: null, contact_phone: null, logo: null, crew: null,
    latitude: null, longitude: null, created_at: '2026-05-01',
  } as never);
});

describe('ProjectFiles page', () => {
  it('renders the empty state', async () => {
    vi.mocked(listProjectFiles).mockResolvedValue([]);
    renderPage(
      <Routes><Route path="/projects/:id/files" element={<ProjectFiles />} /></Routes>,
      '/projects/p1/files',
    );
    expect(await screen.findByText('ფაილები ჯერ არ არის.')).toBeInTheDocument();
  });

  it('renders the file list + download/delete buttons', async () => {
    vi.mocked(listProjectFiles).mockResolvedValue([
      { id: 'f1', project_id: 'p1', user_id: 'u1', name: 'doc.pdf', size_bytes: 100,
        mime_type: 'application/pdf', storage_path: 'files/doc.pdf', created_at: '2026-05-01' } as never,
    ]);
    renderPage(
      <Routes><Route path="/projects/:id/files" element={<ProjectFiles />} /></Routes>,
      '/projects/p1/files',
    );
    expect(await screen.findByText('doc.pdf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /გახსნა/ })).toBeInTheDocument();
  });

  it('clicking download calls signedFileUrl', async () => {
    vi.mocked(listProjectFiles).mockResolvedValue([
      { id: 'f1', project_id: 'p1', user_id: 'u1', name: 'doc.pdf', size_bytes: 100,
        mime_type: null, storage_path: 'files/doc.pdf', created_at: '2026-05-01' } as never,
    ]);
    vi.mocked(signedFileUrl).mockResolvedValue('https://signed/x');
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderPage(
      <Routes><Route path="/projects/:id/files" element={<ProjectFiles />} /></Routes>,
      '/projects/p1/files',
    );
    await screen.findByText('doc.pdf');
    fireEvent.click(screen.getByRole('button', { name: /გახსნა/ }));
    await waitFor(() => expect(signedFileUrl).toHaveBeenCalledWith('files/doc.pdf'));
    openSpy.mockRestore();
  });

  it('clicking trash + confirming calls deleteProjectFile', async () => {
    vi.mocked(listProjectFiles).mockResolvedValue([
      { id: 'f1', project_id: 'p1', user_id: 'u1', name: 'doc.pdf', size_bytes: 100,
        mime_type: null, storage_path: 'files/doc.pdf', created_at: '2026-05-01' } as never,
    ]);
    vi.mocked(deleteProjectFile).mockResolvedValue(undefined);
    renderPage(
      <Routes><Route path="/projects/:id/files" element={<ProjectFiles />} /></Routes>,
      '/projects/p1/files',
    );
    await screen.findByText('doc.pdf');
    // Trash button — find by lucide-trash class.
    const trash = document.body.querySelectorAll('[class*="lucide-trash"]');
    fireEvent.click(trash[0].closest('button')!);
    // Wait for the AlertDialog to appear, then click the confirm button.
    await screen.findByText('ჩანაწერის წაშლა');
    const allBtns = screen.getAllByRole('button', { name: /^წაშლა$/ });
    fireEvent.click(allBtns[allBtns.length - 1]);
    await waitFor(() => expect(deleteProjectFile).toHaveBeenCalled());
  });
});
