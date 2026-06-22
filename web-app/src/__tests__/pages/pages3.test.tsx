import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@/test-utils';
import { renderPage } from '../helpers/renderPage';

vi.mock('@/lib/auth', () => ({ useAuth: vi.fn() }));
vi.mock('@/lib/documentNames', () => ({
  useInspectionName: () => () => 'tpl',
  equipmentInspectionName: (t: string) => t,
  inspectionDisplayName: (s: string | null | undefined) => s ?? 'შემოწმების აქტი',
  reportDisplayName: (s: string | null | undefined) => s ?? 'რეპორტი',
  certificateDisplayName: (s: string | null | undefined) => s ?? 'სერტიფიკატი',
}));
vi.mock('@/lib/data/projects', async (io) => ({
  ...(await io<object>()),
  listProjects: vi.fn(),
  getProject: vi.fn(),
}));
vi.mock('@/lib/data/inspections', async (io) => ({
  ...(await io<object>()),
  listInspections: vi.fn(),
}));
vi.mock('@/lib/data/bobcat', async (io) => ({
  ...(await io<object>()),
  listBobcatInspections: vi.fn(),
}));
vi.mock('@/lib/data/excavator', async (io) => ({
  ...(await io<object>()),
  listExcavatorInspections: vi.fn(),
}));
vi.mock('@/lib/data/generalEquipment', async (io) => ({
  ...(await io<object>()),
  listGeneralEquipmentInspections: vi.fn(),
}));
vi.mock('@/lib/data/briefings', async (io) => ({
  ...(await io<object>()),
  listBriefings: vi.fn(),
}));
vi.mock('@/lib/data/incidents', async (io) => ({
  ...(await io<object>()),
  listIncidents: vi.fn(),
}));
vi.mock('@/lib/data/templates', async (io) => ({
  ...(await io<object>()),
  listTemplates: vi.fn(),
}));

import { useAuth } from '@/lib/auth';
import { listProjects } from '@/lib/data/projects';
import { listInspections } from '@/lib/data/inspections';
import { listBobcatInspections } from '@/lib/data/bobcat';
import { listExcavatorInspections } from '@/lib/data/excavator';
import { listGeneralEquipmentInspections } from '@/lib/data/generalEquipment';
import { listBriefings } from '@/lib/data/briefings';
import { listIncidents } from '@/lib/data/incidents';
import { listTemplates } from '@/lib/data/templates';

import Calendar from '@/pages/Calendar';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1' }, profile: null } as unknown as ReturnType<typeof useAuth>);
  vi.mocked(listProjects).mockResolvedValue([]);
  vi.mocked(listInspections).mockResolvedValue([]);
  vi.mocked(listBobcatInspections).mockResolvedValue([]);
  vi.mocked(listExcavatorInspections).mockResolvedValue([]);
  vi.mocked(listGeneralEquipmentInspections).mockResolvedValue([]);
  vi.mocked(listIncidents).mockResolvedValue([]);
  vi.mocked(listBriefings).mockResolvedValue([]);
  vi.mocked(listTemplates).mockResolvedValue([]);
});

describe('Calendar', () => {
  it('renders the month/year header for the current month', async () => {
    renderPage(<Calendar />);
    expect(
      await screen.findByText(
        /(იანვარი|თებერვალი|მარტი|აპრილი|მაისი|ივნისი|ივლისი|აგვისტო|სექტემბერი|ოქტომბერი|ნოემბერი|დეკემბერი)\s+\d{4}/,
      ),
    ).toBeInTheDocument();
  });
});
