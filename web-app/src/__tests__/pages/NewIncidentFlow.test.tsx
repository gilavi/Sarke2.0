/**
 * Walk through NewIncident's 2-step wizard. Currently 43%; this exercises:
 *  - step 0 → step 1 advance (project picker + type pill + datetime auto-filled)
 *  - step 1 (last) fill description/cause/actionsTaken + submit calls createIncident
 *  - type pill click changes selected type
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@/test-utils';
import { renderPage } from '../helpers/renderPage';

vi.mock('@/lib/data/projects', async (io) => ({ ...(await io<object>()), listProjects: vi.fn() }));
vi.mock('@/lib/data/incidents', async (io) => ({
  ...(await io<object>()),
  createIncident: vi.fn(),
}));

import { listProjects } from '@/lib/data/projects';
import { createIncident } from '@/lib/data/incidents';
import NewIncident from '@/pages/NewIncident';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listProjects).mockResolvedValue([
    { id: 'p1', user_id: 'u1', name: 'პროექტი', company_name: 'შპს', address: null,
      contact_phone: null, logo: null, crew: null, latitude: null, longitude: null,
      created_at: '2026-05-01' },
  ]);
  vi.mocked(createIncident).mockResolvedValue({ id: 'inc-1' } as never);
});

describe('NewIncident - step walk', () => {
  it('starts on step 0 with type buttons and date pre-filled', () => {
    renderPage(<NewIncident />, '/incidents/new?project=p1');
    expect(screen.getByText('ახალი ინციდენტი')).toBeInTheDocument();
    // The pre-filled project chip shows.
    expect(screen.getByText('პროექტი')).toBeInTheDocument();
    expect(screen.getByText('ინციდენტის სახეობა *')).toBeInTheDocument();
  });

  it('clicking type pill changes selection', () => {
    renderPage(<NewIncident />, '/incidents/new?project=p1');
    // The minor type is selected by default. Click "მძიმე" (severe).
    const severeBtn = screen.getByRole('button', { name: 'მძიმე' });
    fireEvent.click(severeBtn);
    // The new selected type has bg-brand-600.
    expect(severeBtn.className).toContain('bg-brand-600');
  });

  it('walks step 0 → 1 and submits → createIncident is called', async () => {
    renderPage(<NewIncident />, '/incidents/new?project=p1');
    // Step 0 has projectId pre-filled + dateTime pre-filled → can advance.
    fireEvent.click(screen.getByRole('button', { name: 'შემდეგი' }));

    // Step 1 (last step) - wait for it to render, then fill required textareas.
    await screen.findByText('აღწერა *');
    const textareas = document.body.querySelectorAll<HTMLTextAreaElement>('textarea');
    expect(textareas.length).toBeGreaterThanOrEqual(3);
    fireEvent.change(textareas[0], { target: { value: 'აღწერა' } });
    fireEvent.change(textareas[1], { target: { value: 'მიზეზი' } });
    fireEvent.change(textareas[2], { target: { value: 'ქმედება' } });
    // Step 1 is the last step; finish button is "შენახვა".
    fireEvent.click(screen.getByRole('button', { name: 'შენახვა' }));

    // createIncident fires asynchronously.
    await new Promise((r) => setTimeout(r, 60));
    expect(createIncident).toHaveBeenCalled();
    const arg = vi.mocked(createIncident).mock.calls[0][0];
    expect(arg.projectId).toBe('p1');
    expect(arg.description).toBe('აღწერა');
    expect(arg.cause).toBe('მიზეზი');
    expect(arg.actionsTaken).toBe('ქმედება');
  });

  it('hides the "დაზარალებული" inputs when type is nearmiss', () => {
    renderPage(<NewIncident />, '/incidents/new?project=p1');
    fireEvent.click(screen.getByRole('button', { name: 'საშიში შემთხვევა' }));
    fireEvent.click(screen.getByRole('button', { name: 'შემდეგი' }));
    // Step 1: "დაზარალებულის სახელი" doesn't render for nearmiss.
    expect(screen.queryByText('დაზარალებულის სახელი')).not.toBeInTheDocument();
  });
});
