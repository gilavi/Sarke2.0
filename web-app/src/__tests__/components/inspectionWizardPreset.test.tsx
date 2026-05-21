/**
 * Mount test for InspectionWizard's harness preset — the flow that replaced the
 * standalone HarnessInspectionModal. Verifies the preset locks the template:
 * the info step shows only the project picker (no template select) and uses the
 * preset title. Guards the riskiest part of the wizard-merge wiring.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@/test-utils';

vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>();
  return {
    ...actual,
    useAuth: () =>
      ({ profile: { first_name: 'გიორგი', last_name: 'ხელაძე' }, user: null }) as unknown as ReturnType<
        typeof actual.useAuth
      >,
  };
});
vi.mock('@/lib/data/projects', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/data/projects')>();
  return { ...actual, listProjects: vi.fn() };
});
vi.mock('@/lib/data/templates', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/data/templates')>();
  return { ...actual, listTemplates: vi.fn() };
});

import InspectionWizard from '@/components/InspectionWizard';
import { harnessWizardPreset } from '@/components/inspections/harnessPreset';
import { listProjects, type Project } from '@/lib/data/projects';
import { listTemplates } from '@/lib/data/templates';

const stubProject: Project = {
  id: 'proj-1',
  user_id: 'u1',
  name: 'ტესტ პროექტი',
  company_name: 'ტესტ კომპანია',
  address: null,
  contact_phone: null,
  logo: null,
  crew: null,
  latitude: null,
  longitude: null,
  created_at: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  vi.mocked(listProjects).mockResolvedValue([stubProject]);
  vi.mocked(listTemplates).mockResolvedValue([]);
});

function renderWizard() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <InspectionWizard open onClose={() => {}} preset={harnessWizardPreset} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('InspectionWizard — harness preset', () => {
  it('renders a locked, project-only info step with the preset title', async () => {
    renderWizard();

    // Preset title in the header.
    expect(await screen.findByText('დამცავი ქამრების შემოწმება')).toBeInTheDocument();
    // The streamlined project-only step renders its prompt.
    expect(screen.getByText('აირჩიეთ პროექტი')).toBeInTheDocument();
    // Template picker is NOT shown — the template is locked by the preset.
    expect(screen.queryByText('შაბლონი')).not.toBeInTheDocument();
  });
});
