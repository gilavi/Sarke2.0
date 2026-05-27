import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Routes, Route } from 'react-router-dom';
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
vi.mock('@/lib/data/reports', async (io) => ({ ...(await io<object>()), createReport: vi.fn() }));
vi.mock('@/lib/data/briefings', async (io) => ({ ...(await io<object>()), createBriefing: vi.fn() }));
vi.mock('@/lib/data/orders', async (io) => ({
  ...(await io<object>()),
  getOrder: vi.fn(),
  updateOrder: vi.fn(),
  deleteOrder: vi.fn(),
}));

import { useAuth } from '@/lib/auth';
import { createProject, listProjects, getProject } from '@/lib/data/projects';
import { getOrder } from '@/lib/data/orders';
import NewProject from '@/pages/NewProject';
import NewReport from '@/pages/NewReport';
import NewBriefing from '@/pages/NewBriefing';
import OrderDetail from '@/pages/OrderDetail';

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

describe('NewReport', () => {
  it('renders the new-report wizard', async () => {
    renderPage(<NewReport />, '/reports/new');
    expect(await screen.findByText('ახალი რეპორტი')).toBeInTheDocument();
  });
});

describe('NewBriefing', () => {
  it('renders the first step of the briefing wizard', async () => {
    renderPage(<NewBriefing />, '/briefings/new');
    expect(await screen.findByText('ახალი ინსტრუქტაჟი')).toBeInTheDocument();
    expect(screen.getByText(/ინსტრუქტორი/)).toBeInTheDocument();
  });
});

describe('OrderDetail', () => {
  it('renders a fire-safety order with its label and PDF action', async () => {
    vi.mocked(getOrder).mockResolvedValue({
      id: 'o1',
      projectId: 'p1',
      userId: 'u1',
      documentType: 'fire_safety_order',
      formData: {
        orderNumber: '5', city: 'თბილისი', orderDate: '2026-05-01', companyName: 'შპს ალფა',
        identificationCode: '', legalAddress: '', directorName: 'გელა ხელაძე', appointedName: 'დანიშნული',
        appointedPhone: '', objectName: 'ობიექტი XYZ', objectAddress: '',
        directorSignature: null, directorSignedAt: null, appointedSignature: null, appointedSignedAt: null,
      },
      status: 'draft',
      pdfUrl: null,
      pdfHash: null,
      createdAt: '2026-05-01',
      updatedAt: '2026-05-01',
    } as never);

    renderPage(
      <Routes>
        <Route path="/orders/:id" element={<OrderDetail />} />
      </Routes>,
      '/orders/o1',
    );

    expect(await screen.findByRole('heading', { name: 'სახანძრო უსაფრთხოებაზე პასუხისმგებელი პირის დანიშვნა' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /PDF-ის ნახვა/ })).toBeInTheDocument();
    expect(screen.getByText('გელა ხელაძე')).toBeInTheDocument();
    expect(screen.getByText('ობიექტი XYZ')).toBeInTheDocument();
  });
});
