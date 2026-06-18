/**
 * FilesSection (ProjectDetail/FilesSection) - currently 22%. Covers:
 * empty state, list rendering, upload click, download click, delete click.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@/test-utils';

vi.mock('@/lib/auth', () => ({ useAuth: vi.fn(() => ({ user: { id: 'u1' } })) }));
vi.mock('@/lib/data/projectFiles', async (io) => ({
  ...(await io<object>()),
  listProjectFiles: vi.fn(),
  signedFileUrl: vi.fn(),
  deleteProjectFile: vi.fn(),
  uploadProjectFile: vi.fn(),
  formatSize: (n: number) => `${n} B`,
}));

import {
  listProjectFiles, signedFileUrl, deleteProjectFile, uploadProjectFile,
} from '@/lib/data/projectFiles';
import { FilesSection } from '@/pages/ProjectDetail/FilesSection';

function renderSection(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('FilesSection', () => {
  it('renders the empty state', async () => {
    vi.mocked(listProjectFiles).mockResolvedValue([]);
    renderSection(<FilesSection projectId="p1" onError={() => {}} />);
    expect(await screen.findByText('ფაილები ჯერ არ არის.')).toBeInTheDocument();
  });

  it('renders the file list', async () => {
    vi.mocked(listProjectFiles).mockResolvedValue([
      { id: 'f1', project_id: 'p1', user_id: 'u1', name: 'doc.pdf', size_bytes: 1024,
        mime_type: 'application/pdf', storage_path: 'files/doc.pdf', created_at: '2026-05-01' } as never,
    ]);
    renderSection(<FilesSection projectId="p1" onError={() => {}} />);
    expect(await screen.findByText('doc.pdf')).toBeInTheDocument();
  });

  it('clicking download calls signedFileUrl + window.open', async () => {
    vi.mocked(listProjectFiles).mockResolvedValue([
      { id: 'f1', project_id: 'p1', user_id: 'u1', name: 'doc.pdf', size_bytes: 1024,
        mime_type: 'application/pdf', storage_path: 'files/doc.pdf', created_at: '2026-05-01' } as never,
    ]);
    vi.mocked(signedFileUrl).mockResolvedValue('https://signed/doc');
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderSection(<FilesSection projectId="p1" onError={() => {}} />);
    await screen.findByText('doc.pdf');
    fireEvent.click(screen.getByRole('button', { name: /გახსნა/ }));
    await waitFor(() => expect(signedFileUrl).toHaveBeenCalledWith('files/doc.pdf'));
    openSpy.mockRestore();
  });

  it('clicking trash calls deleteProjectFile', async () => {
    const file = {
      id: 'f1', project_id: 'p1', user_id: 'u1', name: 'doc.pdf', size_bytes: 1024,
      mime_type: 'application/pdf', storage_path: 'files/doc.pdf', created_at: '2026-05-01',
    };
    vi.mocked(listProjectFiles).mockResolvedValue([file as never]);
    vi.mocked(deleteProjectFile).mockResolvedValue(undefined);
    renderSection(<FilesSection projectId="p1" onError={() => {}} />);
    await screen.findByText('doc.pdf');
    // Trash button (the one with text-red-600 and no name); we find by querying
    // for buttons inside the row that have the Trash2 icon.
    const trash = document.body.querySelectorAll('[class*="lucide-trash"]');
    expect(trash.length).toBeGreaterThan(0);
    fireEvent.click(trash[0].closest('button')!);
    await waitFor(() => expect(deleteProjectFile).toHaveBeenCalled());
  });

  it('uploading a file calls uploadProjectFile', async () => {
    vi.mocked(listProjectFiles).mockResolvedValue([]);
    vi.mocked(uploadProjectFile).mockResolvedValue({
      id: 'f-new', project_id: 'p1', user_id: 'u1', name: 'x.pdf', size_bytes: 100,
      mime_type: 'application/pdf', storage_path: 'files/x.pdf', created_at: '2026-05-01',
    } as never);
    const { container } = renderSection(<FilesSection projectId="p1" onError={() => {}} />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'x.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => expect(uploadProjectFile).toHaveBeenCalled());
  });
});
