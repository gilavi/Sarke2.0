/**
 * NewReport (55% covered) - covers the finish/submit path.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@/test-utils';
import { renderPage } from '../helpers/renderPage';

vi.mock('@/lib/data/projects', async (io) => ({ ...(await io<object>()), listProjects: vi.fn() }));
vi.mock('@/lib/data/reports', async (io) => ({ ...(await io<object>()), createReport: vi.fn() }));

import { listProjects } from '@/lib/data/projects';
import { createReport } from '@/lib/data/reports';
import NewReport from '@/pages/NewReport';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listProjects).mockResolvedValue([
    { id: 'p1', user_id: 'u1', name: 'პროექტი', company_name: 'შპს', address: null,
      contact_phone: null, logo: null, crew: null, latitude: null, longitude: null,
      created_at: '2026-05-01' },
  ]);
  vi.mocked(createReport).mockResolvedValue({ id: 'r1' } as never);
});

describe('NewReport', () => {
  it('mounts with the prefilled project chip + title input', () => {
    renderPage(<NewReport />, '/reports/new?project=p1');
    expect(screen.getByText('ახალი რეპორტი')).toBeInTheDocument();
  });

  it('finishing creates a report', async () => {
    renderPage(<NewReport />, '/reports/new?project=p1');
    // Finish button label is "დასრულება" since this is a single-step wizard.
    // Try the WizardShell's finish button (last button typically named).
    const finishBtn = await screen.findByRole('button', { name: /დასრულება/ });
    fireEvent.click(finishBtn);
    await new Promise((r) => setTimeout(r, 50));
    expect(createReport).toHaveBeenCalled();
    const arg = vi.mocked(createReport).mock.calls[0][0];
    expect(arg.projectId).toBe('p1');
  });
});
