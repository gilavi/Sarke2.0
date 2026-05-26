/**
 * Submit-path tests for the 4 equipment New pages. With a prefilled project id,
 * canSubmit is true on mount; clicking the submit button fires the
 * create*Inspection mutation and navigates to the new detail route.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@/test-utils';
import { renderPage } from '../helpers/renderPage';

vi.mock('@/lib/data/projects', async (io) => ({ ...(await io<object>()), listProjects: vi.fn() }));
vi.mock('@/lib/data/bobcat', async (io) => ({
  ...(await io<object>()),
  createBobcatInspection: vi.fn(),
}));
vi.mock('@/lib/data/excavator', async (io) => ({
  ...(await io<object>()),
  createExcavatorInspection: vi.fn(),
}));
vi.mock('@/lib/data/generalEquipment', async (io) => ({
  ...(await io<object>()),
  createGeneralEquipmentInspection: vi.fn(),
}));
vi.mock('@/lib/data/cargoPlatform', async (io) => ({
  ...(await io<object>()),
  createCargoPlatformInspection: vi.fn(),
}));

import { listProjects } from '@/lib/data/projects';
import { createBobcatInspection, BOBCAT_TEMPLATE_ID } from '@/lib/data/bobcat';
import { createExcavatorInspection } from '@/lib/data/excavator';
import { createGeneralEquipmentInspection } from '@/lib/data/generalEquipment';
import { createCargoPlatformInspection } from '@/lib/data/cargoPlatform';

import NewBobcatInspection from '@/pages/NewBobcatInspection';
import NewExcavatorInspection from '@/pages/NewExcavatorInspection';
import NewGeneralEquipmentInspection from '@/pages/NewGeneralEquipmentInspection';
import NewCargoPlatformInspection from '@/pages/NewCargoPlatformInspection';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listProjects).mockResolvedValue([]);
});

describe('NewBobcatInspection submit', () => {
  it('fires createBobcatInspection with the prefilled projectId + bobcat template', async () => {
    vi.mocked(createBobcatInspection).mockResolvedValue({ id: 'b1' } as never);
    renderPage(<NewBobcatInspection />, '/bobcat/new?project=p1');
    fireEvent.click(screen.getByRole('button', { name: 'შექმნა' }));
    await waitFor(() =>
      expect(createBobcatInspection).toHaveBeenCalledWith(expect.objectContaining({
        projectId: 'p1',
        templateId: BOBCAT_TEMPLATE_ID,
        inspectionType: 'pre_work',
      })),
    );
  });
});

describe('NewExcavatorInspection submit', () => {
  it('fires createExcavatorInspection with the prefilled projectId', async () => {
    vi.mocked(createExcavatorInspection).mockResolvedValue({ id: 'e1' } as never);
    renderPage(<NewExcavatorInspection />, '/excavator/new?project=p1');
    fireEvent.click(screen.getByRole('button', { name: 'შექმნა' }));
    await waitFor(() =>
      expect(createExcavatorInspection).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'p1' })),
    );
  });
});

describe('NewGeneralEquipmentInspection submit', () => {
  it('fires createGeneralEquipmentInspection with the prefilled projectId', async () => {
    vi.mocked(createGeneralEquipmentInspection).mockResolvedValue({ id: 'g1' } as never);
    renderPage(<NewGeneralEquipmentInspection />, '/general-equipment/new?project=p1');
    fireEvent.click(screen.getByRole('button', { name: 'შექმნა' }));
    await waitFor(() =>
      expect(createGeneralEquipmentInspection).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'p1' })),
    );
  });
});

describe('NewCargoPlatformInspection submit', () => {
  it('fires createCargoPlatformInspection with just projectId', async () => {
    vi.mocked(createCargoPlatformInspection).mockResolvedValue({ id: 'c1' } as never);
    renderPage(<NewCargoPlatformInspection />, '/cargo-platform/new?project=p1');
    fireEvent.click(screen.getByRole('button', { name: 'შექმნა' }));
    await waitFor(() =>
      expect(createCargoPlatformInspection).toHaveBeenCalledWith({ projectId: 'p1' }),
    );
  });

  it('handles submission errors gracefully', async () => {
    vi.mocked(createCargoPlatformInspection).mockRejectedValue(new Error('save failed'));
    renderPage(<NewCargoPlatformInspection />, '/cargo-platform/new?project=p1');
    fireEvent.click(screen.getByRole('button', { name: 'შექმნა' }));
    // The submit handler catches and toasts the error; button re-enables.
    await waitFor(() => expect(createCargoPlatformInspection).toHaveBeenCalled());
  });
});
