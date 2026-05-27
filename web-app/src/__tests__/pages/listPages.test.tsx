import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@/test-utils';
import { renderPage } from '../helpers/renderPage';

vi.mock('@/lib/auth', () => ({ useAuth: vi.fn() }));
vi.mock('@/lib/data/projects', async (io) => ({ ...(await io<object>()), listProjects: vi.fn() }));
vi.mock('@/lib/data/incidents', async (io) => ({ ...(await io<object>()), listIncidents: vi.fn(), deleteIncident: vi.fn() }));
vi.mock('@/lib/data/reports', async (io) => ({ ...(await io<object>()), listReports: vi.fn(), deleteReport: vi.fn() }));
vi.mock('@/lib/data/briefings', async (io) => ({ ...(await io<object>()), listBriefings: vi.fn(), deleteBriefing: vi.fn() }));
vi.mock('@/lib/data/orders', async (io) => ({ ...(await io<object>()), listOrders: vi.fn() }));
vi.mock('@/lib/data/certificates', async (io) => ({ ...(await io<object>()), listCertificates: vi.fn() }));
vi.mock('@/lib/data/qualifications', async (io) => ({ ...(await io<object>()), listQualifications: vi.fn() }));

import { useAuth } from '@/lib/auth';
import { listProjects } from '@/lib/data/projects';
import { listIncidents } from '@/lib/data/incidents';
import { listReports } from '@/lib/data/reports';
import { listBriefings } from '@/lib/data/briefings';
import { listOrders } from '@/lib/data/orders';
import { listCertificates } from '@/lib/data/certificates';
import { listQualifications } from '@/lib/data/qualifications';

import Incidents from '@/pages/Incidents';
import Reports from '@/pages/Reports';
import Briefings from '@/pages/Briefings';
import Orders from '@/pages/Orders';
import Certificates from '@/pages/Certificates';
import Qualifications from '@/pages/Qualifications';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1' } } as unknown as ReturnType<typeof useAuth>);
  vi.mocked(listProjects).mockResolvedValue([]);
  vi.mocked(listIncidents).mockResolvedValue([]);
  vi.mocked(listReports).mockResolvedValue([]);
  vi.mocked(listBriefings).mockResolvedValue([]);
  vi.mocked(listOrders).mockResolvedValue([]);
  vi.mocked(listCertificates).mockResolvedValue([]);
  vi.mocked(listQualifications).mockResolvedValue([]);
});

describe('Incidents page', () => {
  it('renders the empty state', async () => {
    renderPage(<Incidents />);
    expect(await screen.findByRole('heading', { name: 'ინციდენტები' })).toBeInTheDocument();
    expect(await screen.findByText('ინციდენტები ჯერ არ გაქვთ.')).toBeInTheDocument();
  });

  it('renders an incident row', async () => {
    vi.mocked(listIncidents).mockResolvedValue([
      { id: 'i1', project_id: 'p1', type: 'minor', injured_name: 'დაშავებული', date_time: '2026-05-01', photos: [] },
    ] as never);
    renderPage(<Incidents />);
    expect(await screen.findByText('დაშავებული')).toBeInTheDocument();
  });
});

describe('Reports page', () => {
  it('renders the empty state', async () => {
    renderPage(<Reports />);
    expect(await screen.findByRole('heading', { name: 'რეპორტები' })).toBeInTheDocument();
    expect(await screen.findByText('რეპორტები ჯერ არ გაქვთ.')).toBeInTheDocument();
  });
});

describe('Briefings page', () => {
  it('renders the empty state', async () => {
    renderPage(<Briefings />);
    expect(await screen.findByRole('heading', { name: 'ინსტრუქტაჟები' })).toBeInTheDocument();
    expect(await screen.findByText('ინსტრუქტაჟები ჯერ არ გაქვთ.')).toBeInTheDocument();
  });
});

describe('Orders page', () => {
  it('renders the empty state', async () => {
    renderPage(<Orders />);
    expect(await screen.findByRole('heading', { name: 'ბრძანებები' })).toBeInTheDocument();
    expect(await screen.findByText('ბრძანებები ჯერ არ გაქვთ.')).toBeInTheDocument();
  });

  it('renders an order card with its document-type label', async () => {
    vi.mocked(listOrders).mockResolvedValue([
      { id: 'o1', projectId: 'p1', userId: 'u1', documentType: 'fire_safety_order', formData: {}, status: 'completed', pdfUrl: null, pdfHash: null, createdAt: '2026-05-01', updatedAt: '2026-05-01' },
    ] as never);
    renderPage(<Orders />);
    expect(await screen.findByText('სახანძრო უსაფრთხოებაზე პასუხისმგებელი პირის დანიშვნა')).toBeInTheDocument();
  });
});

describe('Certificates page', () => {
  it('renders the empty state', async () => {
    renderPage(<Certificates />);
    expect(await screen.findByRole('heading', { name: 'სერტიფიკატები' })).toBeInTheDocument();
    expect(await screen.findByText('სერტიფიკატები ვერ მოიძებნა')).toBeInTheDocument();
  });
});

describe('Qualifications page', () => {
  it('renders the empty state', async () => {
    renderPage(<Qualifications />);
    expect(await screen.findByRole('heading', { name: 'კვალიფიკაციები' })).toBeInTheDocument();
    expect(await screen.findByText('სერტიფიკატები არ არის ატვირთული.')).toBeInTheDocument();
  });
});
