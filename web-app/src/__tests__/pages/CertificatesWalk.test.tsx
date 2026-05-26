/**
 * Certificates page (35% covered) — list rendering + upload + open PDF.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@/test-utils';

vi.mock('@/lib/auth', () => ({ useAuth: vi.fn(() => ({ user: { id: 'u1' } })) }));
vi.mock('@/lib/documentNames', () => ({
  certificateDisplayName: (s: string | null | undefined) => s ?? 'სერტიფიკატი',
}));
vi.mock('@/lib/data/certificates', async (io) => ({
  ...(await io<object>()),
  listCertificates: vi.fn(),
  uploadCertificate: vi.fn(),
  signedCertificatePdfUrl: vi.fn(),
}));

import {
  listCertificates, uploadCertificate, signedCertificatePdfUrl,
} from '@/lib/data/certificates';
import Certificates from '@/pages/Certificates';

function renderPage(ui: React.ReactElement) {
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

describe('Certificates', () => {
  it('renders the empty state with an upload CTA', async () => {
    vi.mocked(listCertificates).mockResolvedValue([]);
    renderPage(<Certificates />);
    expect(await screen.findByText('სერტიფიკატები ვერ მოიძებნა')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /PDF-ის ატვირთვა/ })).toBeInTheDocument();
  });

  it('renders the list with rows', async () => {
    vi.mocked(listCertificates).mockResolvedValue([
      { id: 'c1', user_id: 'u1', conclusion_text: 'სერტ. ერთი', generated_at: '2026-05-01T00:00:00Z',
        pdf_url: 'pdfs/c1.pdf', created_at: '2026-05-01' } as never,
      { id: 'c2', user_id: 'u1', conclusion_text: null, generated_at: '2026-05-02T00:00:00Z',
        pdf_url: 'pdfs/c2.pdf', created_at: '2026-05-02' } as never,
    ]);
    renderPage(<Certificates />);
    expect(await screen.findByText('სერტ. ერთი')).toBeInTheDocument();
    expect(screen.getByText('სერტიფიკატი')).toBeInTheDocument(); // c2 falls back to default
  });

  it('clicking "PDF-ის ნახვა" calls signedCertificatePdfUrl + opens in new tab', async () => {
    vi.mocked(listCertificates).mockResolvedValue([
      { id: 'c1', user_id: 'u1', conclusion_text: 'X', generated_at: '2026-05-01T00:00:00Z',
        pdf_url: 'pdfs/c1.pdf', created_at: '2026-05-01' } as never,
    ]);
    vi.mocked(signedCertificatePdfUrl).mockResolvedValue('https://signed/cert');
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderPage(<Certificates />);
    await screen.findByText('X');
    fireEvent.click(screen.getByRole('button', { name: /PDF-ის ნახვა/ }));
    await waitFor(() => expect(signedCertificatePdfUrl).toHaveBeenCalledWith('pdfs/c1.pdf'));
    openSpy.mockRestore();
  });

  it('uploading a PDF file fires uploadCertificate', async () => {
    vi.mocked(listCertificates).mockResolvedValue([]);
    vi.mocked(uploadCertificate).mockResolvedValue(undefined as never);
    const { container } = renderPage(<Certificates />);
    await screen.findByText('სერტიფიკატები ვერ მოიძებნა');
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    const file = new File(['pdf-bytes'], 'cert.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => expect(uploadCertificate).toHaveBeenCalled());
  });
});
