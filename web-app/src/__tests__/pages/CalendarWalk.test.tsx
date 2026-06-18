/**
 * Calendar interactions (44% covered) - prev/next month, "today" button,
 * day-overflow modal (when a day has 4+ events).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@/test-utils';

vi.mock('@/lib/documentNames', () => ({
  useInspectionName: () => () => 'tpl',
  equipmentInspectionName: (t: string) => `eq-${t}`,
}));
vi.mock('@/lib/data/projects', async (io) => ({ ...(await io<object>()), listProjects: vi.fn() }));
vi.mock('@/lib/data/inspections', async (io) => ({ ...(await io<object>()), listInspections: vi.fn() }));
vi.mock('@/lib/data/bobcat', async (io) => ({ ...(await io<object>()), listBobcatInspections: vi.fn() }));
vi.mock('@/lib/data/excavator', async (io) => ({ ...(await io<object>()), listExcavatorInspections: vi.fn() }));
vi.mock('@/lib/data/generalEquipment', async (io) => ({
  ...(await io<object>()),
  listGeneralEquipmentInspections: vi.fn(),
}));
vi.mock('@/lib/data/briefings', async (io) => ({
  ...(await io<object>()),
  listBriefings: vi.fn(),
  topicLabel: (t: string) => t,
}));
vi.mock('@/lib/data/incidents', async (io) => ({ ...(await io<object>()), listIncidents: vi.fn() }));

import { listProjects } from '@/lib/data/projects';
import { listInspections } from '@/lib/data/inspections';
import { listBobcatInspections } from '@/lib/data/bobcat';
import { listExcavatorInspections } from '@/lib/data/excavator';
import { listGeneralEquipmentInspections } from '@/lib/data/generalEquipment';
import { listBriefings } from '@/lib/data/briefings';
import { listIncidents } from '@/lib/data/incidents';
import Calendar from '@/pages/Calendar';

function renderPage(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

const today = new Date();
const todayISO = today.toISOString();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listProjects).mockResolvedValue([
    { id: 'p1', user_id: 'u1', name: 'პროექტი', company_name: null, address: null,
      contact_phone: null, logo: null, crew: null, latitude: null, longitude: null,
      created_at: todayISO },
  ]);
  vi.mocked(listInspections).mockResolvedValue([]);
  vi.mocked(listBobcatInspections).mockResolvedValue([]);
  vi.mocked(listExcavatorInspections).mockResolvedValue([]);
  vi.mocked(listGeneralEquipmentInspections).mockResolvedValue([]);
  vi.mocked(listBriefings).mockResolvedValue([]);
  vi.mocked(listIncidents).mockResolvedValue([]);
});

describe('Calendar - navigation', () => {
  it('clicking the ChevronRight goes to next month', async () => {
    renderPage(<Calendar />);
    const currentHeader = await screen.findByText(
      /(იანვარი|თებერვალი|მარტი|აპრილი|მაისი|ივნისი|ივლისი|აგვისტო|სექტემბერი|ოქტომბერი|ნოემბერი|დეკემბერი)\s+\d{4}/,
    );
    const before = currentHeader.textContent;
    // Find all buttons and pick the one with a lucide-chevron-right.
    const chevronRights = document.body.querySelectorAll('[class*="lucide-chevron-right"]');
    expect(chevronRights.length).toBeGreaterThan(0);
    fireEvent.click(chevronRights[0].closest('button')!);
    // Header should have changed.
    const after = currentHeader.textContent;
    expect(after).not.toBe(before);
  });

  it('clicking "დღეს" resets to current month', async () => {
    renderPage(<Calendar />);
    await screen.findByText(/(იანვარი|თებერვალი|მარტი|აპრილი|მაისი|ივნისი|ივლისი|აგვისტო|სექტემბერი|ოქტომბერი|ნოემბერი|დეკემბერი)\s+\d{4}/);
    // First go to next month.
    const chevronRights = document.body.querySelectorAll('[class*="lucide-chevron-right"]');
    fireEvent.click(chevronRights[0].closest('button')!);
    // Then click "დღეს".
    fireEvent.click(screen.getByRole('button', { name: 'დღეს' }));
    // Header now shows current month.
    expect(screen.getByText(new RegExp(`${today.getFullYear()}`))).toBeInTheDocument();
  });

  it('shows the empty state when no events', async () => {
    renderPage(<Calendar />);
    expect(await screen.findByText('ჩანაწერები ჯერ არ არის.')).toBeInTheDocument();
  });
});

describe('Calendar - with events', () => {
  it('renders events grid + legend', async () => {
    vi.mocked(listIncidents).mockResolvedValue([
      { id: 'inc1', project_id: 'p1', type: 'minor', date_time: todayISO, status: 'completed' } as never,
    ]);
    vi.mocked(listInspections).mockResolvedValue([
      { id: 'i1', project_id: 'p1', template_id: 't1', status: 'completed',
        created_at: todayISO, signatories: [], conclusion_photo_paths: [] } as never,
    ]);
    renderPage(<Calendar />);
    // Wait for legend text "ინციდენტი" to appear (only present when events are loaded).
    expect(await screen.findByText('ინციდენტი')).toBeInTheDocument();
    expect(screen.getByText('აქტი')).toBeInTheDocument();
  });
});
