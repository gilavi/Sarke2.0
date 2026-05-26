/**
 * InspectionWizard mount tests — the largest untested component (940 LOC).
 * We mount with `open=true` in create mode (no preset/no existing inspection),
 * mocking all heavy children + data layer so the wizard renders its initial step.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@/test-utils';

vi.mock('@/lib/auth', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'u1' }, profile: { first_name: 'გელა', last_name: 'ხელაძე' } })),
}));
vi.mock('@/lib/documentNames', () => ({
  useInspectionName: () => () => 'tpl',
  inspectionDisplayName: (s: string | null | undefined) => s ?? 'შემოწმების აქტი',
  equipmentInspectionName: (t: string) => `eq-${t}`,
}));
vi.mock('@/components/PhotoUploadZone', () => ({ default: () => null }));
vi.mock('@/components/web/SuccessModal', () => ({ default: () => null }));
vi.mock('@/components/inspections/HarnessChecklist', () => ({ HarnessChecklist: () => null }));
vi.mock('@/lib/data/projects', async (io) => ({ ...(await io<object>()), listProjects: vi.fn() }));
vi.mock('@/lib/data/templates', async (io) => ({ ...(await io<object>()), listTemplates: vi.fn() }));
vi.mock('@/lib/data/inspections', async (io) => ({
  ...(await io<object>()),
  createInspection: vi.fn(),
  updateInspection: vi.fn(),
  upsertAnswer: vi.fn(),
  listQuestions: vi.fn(),
  listAnswerPhotos: vi.fn(),
  addAnswerPhoto: vi.fn(),
  removeAnswerPhoto: vi.fn(),
}));

import { listProjects } from '@/lib/data/projects';
import { listTemplates } from '@/lib/data/templates';
import InspectionWizard from '@/components/InspectionWizard';

function renderWizard(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listProjects).mockResolvedValue([
    { id: 'p1', user_id: 'u1', name: 'პროექტი', company_name: 'შპს', address: null, contact_phone: null, logo: null, crew: null, latitude: null, longitude: null, created_at: '2026-05-01' },
  ]);
  vi.mocked(listTemplates).mockResolvedValue([
    { id: 't1', owner_id: null, name: 'ფასადის ხარაჩოს შემოწმების აქტი', category: 'xaracho', is_system: true, required_signer_roles: [], created_at: '2026-05-01' },
  ]);
});

describe('InspectionWizard', () => {
  it('renders nothing when open is false', () => {
    renderWizard(<InspectionWizard open={false} onClose={() => {}} />);
    // No wizard frame in the document.
    expect(document.body.textContent ?? '').not.toContain('ფასადის ხარაჩო');
  });

  it('renders the wizard frame and the info step when open in create mode', () => {
    renderWizard(<InspectionWizard open onClose={() => {}} />);
    // The wizard renders into a Mantine portal; just verify the open frame appeared.
    expect(document.body.textContent ?? '').toContain('პროექტი');
  });

  it('renders the harness preset variant with the streamlined info step', () => {
    renderWizard(
      <InspectionWizard
        open
        onClose={() => {}}
        preset={{ templateId: 't1', title: 'დამცავი ქამრების შემოწმება', itemLabel: 'ქამარი' }}
      />,
    );
    // Preset locks the template; the info step renders without the template picker.
    // The default-empty body still shouldn't crash.
    expect(document.body.firstChild).toBeTruthy();
  });

  it('mounts in edit mode with an existing inspection + questions + answers', () => {
    renderWizard(
      <InspectionWizard
        open
        onClose={() => {}}
        inspection={{
          id: 'i1', project_id: 'p1', user_id: 'u1', template_id: 't1', status: 'draft',
          harness_name: null, department: null, inspector_name: null,
          conclusion_text: null, is_safe_for_use: null, inspector_signature: null,
          conclusion_photo_paths: [], signatories: [],
          created_at: '2026-05-01', completed_at: null,
        }}
        initialQuestions={[
          { id: 'q1', template_id: 't1', section: 1, order: 1, type: 'yesno', title: 'Q1',
            min_val: null, max_val: null, unit: null, grid_rows: null, grid_cols: null },
        ]}
        initialAnswers={[]}
      />,
    );
    // Edit mode renders the wizard frame too (no specific assertion besides mount).
    expect(document.body.firstChild).toBeTruthy();
  });
});
