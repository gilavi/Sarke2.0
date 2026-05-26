import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@/test-utils';
import { renderPage } from '../helpers/renderPage';

vi.mock('@/lib/data/inspections', () => ({ listInspections: vi.fn(), deleteInspection: vi.fn() }));
vi.mock('@/lib/data/bobcat', () => ({ listBobcatInspections: vi.fn(), deleteBobcatInspection: vi.fn() }));
vi.mock('@/lib/data/generalEquipment', () => ({
  listGeneralEquipmentInspections: vi.fn(),
  deleteGeneralEquipmentInspection: vi.fn(),
}));
vi.mock('@/lib/data/excavator', () => ({ listExcavatorInspections: vi.fn(), deleteExcavatorInspection: vi.fn() }));
vi.mock('@/lib/data/cargoPlatform', () => ({
  listCargoPlatformInspections: vi.fn(),
  deleteCargoPlatformInspection: vi.fn(),
}));
vi.mock('@/lib/data/projects', () => ({ listProjects: vi.fn() }));
vi.mock('@/components/InspectionWizard', () => ({ default: () => null }));
vi.mock('@/lib/documentNames', () => ({
  useInspectionName: () => (id: string) => `tpl-${id}`,
  equipmentInspectionName: (t: string) => `eq-${t}`,
}));

import { listInspections } from '@/lib/data/inspections';
import { listBobcatInspections } from '@/lib/data/bobcat';
import { listGeneralEquipmentInspections } from '@/lib/data/generalEquipment';
import { listExcavatorInspections } from '@/lib/data/excavator';
import { listCargoPlatformInspections } from '@/lib/data/cargoPlatform';
import { listProjects } from '@/lib/data/projects';
import Inspections from '@/pages/Inspections';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listInspections).mockResolvedValue([]);
  vi.mocked(listBobcatInspections).mockResolvedValue([]);
  vi.mocked(listGeneralEquipmentInspections).mockResolvedValue([]);
  vi.mocked(listExcavatorInspections).mockResolvedValue([]);
  vi.mocked(listCargoPlatformInspections).mockResolvedValue([]);
  vi.mocked(listProjects).mockResolvedValue([]);
});

describe('Inspections page', () => {
  it('renders the empty state when no acts exist', async () => {
    renderPage(<Inspections />);
    expect(await screen.findByRole('heading', { name: 'შემოწმების აქტები' })).toBeInTheDocument();
    expect(await screen.findByText('შემოწმების აქტები ჯერ არ გაქვთ.')).toBeInTheDocument();
  });

  it('renders an equipment inspection row', async () => {
    vi.mocked(listBobcatInspections).mockResolvedValue([
      { id: 'b1', projectId: 'p1', status: 'completed', createdAt: '2026-05-01' },
    ] as never);
    renderPage(<Inspections />);
    expect(await screen.findByText('eq-bobcat')).toBeInTheDocument();
  });
});
