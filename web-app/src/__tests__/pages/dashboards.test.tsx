import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@/test-utils';
import { renderPage } from '../helpers/renderPage';

vi.mock('@/lib/auth', () => ({ useAuth: vi.fn() }));
vi.mock('@/lib/documentNames', () => ({
  useInspectionName: () => () => 'tpl',
  equipmentInspectionName: (t: string) => `eq-${t}`,
  certificateDisplayName: (s: string | null) => s ?? 'cert',
  reportDisplayName: (s: string | null) => s ?? 'report',
}));
vi.mock('@/lib/subscription', () => ({ usePaymentHistory: vi.fn(), cancelSubscription: vi.fn() }));
vi.mock('@/lib/usePdfUsage', () => ({ usePdfUsage: vi.fn(), useInvalidatePdfUsage: () => () => {} }));
vi.mock('@/components/InspectionWizard', () => ({ default: () => null }));
vi.mock('@/components/SubscriptionCard', () => ({ SubscriptionCard: () => null }));
vi.mock('@/components/ProjectActivityWidget', () => ({ ProjectActivityWidget: () => null }));
vi.mock('@/lib/data/projects', async (io) => ({ ...(await io<object>()), listProjects: vi.fn() }));
vi.mock('@/lib/data/inspections', async (io) => ({ ...(await io<object>()), listInspections: vi.fn(), deleteInspection: vi.fn() }));
vi.mock('@/lib/data/bobcat', async (io) => ({ ...(await io<object>()), listBobcatInspections: vi.fn(), deleteBobcatInspection: vi.fn() }));
vi.mock('@/lib/data/generalEquipment', async (io) => ({ ...(await io<object>()), listGeneralEquipmentInspections: vi.fn(), deleteGeneralEquipmentInspection: vi.fn() }));
vi.mock('@/lib/data/excavator', async (io) => ({ ...(await io<object>()), listExcavatorInspections: vi.fn(), deleteExcavatorInspection: vi.fn() }));
vi.mock('@/lib/data/cargoPlatform', async (io) => ({ ...(await io<object>()), listCargoPlatformInspections: vi.fn(), deleteCargoPlatformInspection: vi.fn() }));
vi.mock('@/lib/data/safetyNet', async (io) => ({ ...(await io<object>()), listSafetyNetInspections: vi.fn(), deleteSafetyNetInspection: vi.fn() }));
vi.mock('@/lib/data/mobileLadder', async (io) => ({ ...(await io<object>()), listMobileLadderInspections: vi.fn(), deleteMobileLadderInspection: vi.fn() }));
vi.mock('@/lib/data/forklift', async (io) => ({ ...(await io<object>()), listForkliftInspections: vi.fn(), deleteForkliftInspection: vi.fn() }));
vi.mock('@/lib/data/liftingAccessories', async (io) => ({ ...(await io<object>()), listLiftingAccessoriesInspections: vi.fn(), deleteLiftingAccessoriesInspection: vi.fn() }));
vi.mock('@/lib/data/fallProtection', async (io) => ({ ...(await io<object>()), listFallProtectionInspections: vi.fn(), deleteFallProtectionInspection: vi.fn() }));
vi.mock('@/lib/data/orders', async (io) => ({ ...(await io<object>()), listOrders: vi.fn(), deleteOrder: vi.fn() }));
vi.mock('@/lib/data/incidents', async (io) => ({ ...(await io<object>()), listIncidents: vi.fn() }));
vi.mock('@/lib/data/briefings', async (io) => ({ ...(await io<object>()), listBriefings: vi.fn() }));
vi.mock('@/lib/data/certificates', async (io) => ({ ...(await io<object>()), listCertificates: vi.fn() }));
vi.mock('@/lib/data/qualifications', async (io) => ({ ...(await io<object>()), listQualifications: vi.fn() }));

import { useAuth } from '@/lib/auth';
import { usePaymentHistory } from '@/lib/subscription';
import { usePdfUsage } from '@/lib/usePdfUsage';
import { listProjects } from '@/lib/data/projects';
import { listInspections } from '@/lib/data/inspections';
import { listBobcatInspections } from '@/lib/data/bobcat';
import { listGeneralEquipmentInspections } from '@/lib/data/generalEquipment';
import { listExcavatorInspections } from '@/lib/data/excavator';
import { listCargoPlatformInspections } from '@/lib/data/cargoPlatform';
import { listSafetyNetInspections } from '@/lib/data/safetyNet';
import { listMobileLadderInspections } from '@/lib/data/mobileLadder';
import { listForkliftInspections } from '@/lib/data/forklift';
import { listLiftingAccessoriesInspections } from '@/lib/data/liftingAccessories';
import { listFallProtectionInspections } from '@/lib/data/fallProtection';
import { listOrders } from '@/lib/data/orders';
import { listIncidents } from '@/lib/data/incidents';
import { listBriefings } from '@/lib/data/briefings';
import { listCertificates } from '@/lib/data/certificates';
import { listQualifications } from '@/lib/data/qualifications';

import Home from '@/pages/Home';
import History from '@/pages/History';
import Account from '@/pages/Account';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue({ profile: null, user: { id: 'u1', email: 'a@b.com' } } as unknown as ReturnType<typeof useAuth>);
  vi.mocked(usePaymentHistory).mockReturnValue({ data: [], isLoading: false } as never);
  vi.mocked(usePdfUsage).mockReturnValue({
    data: { status: 'free', count: 0, limit: 30, isLocked: false, expiresAt: null, cancelledAt: null },
  } as never);
  for (const fn of [
    listProjects, listInspections, listBobcatInspections, listGeneralEquipmentInspections,
    listExcavatorInspections, listCargoPlatformInspections, listSafetyNetInspections,
    listMobileLadderInspections, listForkliftInspections, listLiftingAccessoriesInspections,
    listFallProtectionInspections, listOrders, listIncidents, listBriefings,
    listCertificates, listQualifications,
  ]) {
    vi.mocked(fn).mockResolvedValue([] as never);
  }
});

describe('Home page', () => {
  it('greets the user and renders the dashboard', async () => {
    renderPage(<Home />);
    expect(await screen.findByRole('heading', { name: /მოგესალმებით/ })).toBeInTheDocument();
  });
});

describe('History page', () => {
  it('renders the empty state', async () => {
    renderPage(<History />);
    expect(await screen.findByRole('heading', { name: 'ისტორია' })).toBeInTheDocument();
    expect(await screen.findByText('ჩანაწერები არ არის')).toBeInTheDocument();
  });
});

describe('Account page', () => {
  it('renders the account header and payment-history empty state', async () => {
    renderPage(<Account />);
    expect(await screen.findByRole('heading', { name: 'ანგარიში' })).toBeInTheDocument();
    expect(screen.getByText('გადახდის ისტორია')).toBeInTheDocument();
    expect(screen.getByText('ჩანაწერები არ არის')).toBeInTheDocument();
  });
});
