/**
 * EditProject (52% covered) — covers the form fill + submit path, and the
 * not-found state.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { screen, fireEvent, waitFor } from '@/test-utils';
import { renderPage } from '../helpers/renderPage';

vi.mock('@/components/AddressInput', () => ({
  AddressInput: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input data-testid="address" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));
vi.mock('@/lib/data/projects', async (io) => ({
  ...(await io<object>()),
  getProject: vi.fn(),
  updateProject: vi.fn(),
  updateProjectLogo: vi.fn(),
}));

import { getProject, updateProject, type Project } from '@/lib/data/projects';
import EditProject from '@/pages/EditProject';

const project: Project = {
  id: 'p1', user_id: 'u1', name: 'ჩემი პროექტი', company_name: 'შპს ალფა',
  address: 'თბილისი', contact_phone: '599100100',
  logo: null, crew: [], latitude: 41.7, longitude: 44.8,
  created_at: '2026-05-01',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getProject).mockResolvedValue(project);
  vi.mocked(updateProject).mockResolvedValue(undefined);
});

describe('EditProject', () => {
  it('renders the form pre-filled from the project', async () => {
    renderPage(
      <Routes><Route path="/projects/:id/edit" element={<EditProject />} /></Routes>,
      '/projects/p1/edit',
    );
    expect(await screen.findByDisplayValue('ჩემი პროექტი')).toBeInTheDocument();
    expect(screen.getByDisplayValue('შპს ალფა')).toBeInTheDocument();
    expect(screen.getByDisplayValue('599100100')).toBeInTheDocument();
  });

  it('shows not-found when getProject returns null', async () => {
    vi.mocked(getProject).mockResolvedValue(null as never);
    renderPage(
      <Routes><Route path="/projects/:id/edit" element={<EditProject />} /></Routes>,
      '/projects/x/edit',
    );
    expect(await screen.findByText('პროექტი ვერ მოიძებნა.')).toBeInTheDocument();
  });

  it('submitting calls updateProject with the patched values', async () => {
    renderPage(
      <Routes><Route path="/projects/:id/edit" element={<EditProject />} /></Routes>,
      '/projects/p1/edit',
    );
    const nameInput = await screen.findByDisplayValue('ჩემი პროექტი');
    fireEvent.change(nameInput, { target: { value: 'ახალი სახელი' } });
    fireEvent.click(screen.getByRole('button', { name: 'შენახვა' }));
    await waitFor(() => expect(updateProject).toHaveBeenCalled());
    const [calledId, patch] = vi.mocked(updateProject).mock.calls[0];
    expect(calledId).toBe('p1');
    expect((patch as Record<string, unknown>).name).toBe('ახალი სახელი');
    expect((patch as Record<string, unknown>).contact_phone).toBe('599100100');
  });

  it('cancel button does not call updateProject', async () => {
    renderPage(
      <Routes><Route path="/projects/:id/edit" element={<EditProject />} /></Routes>,
      '/projects/p1/edit',
    );
    await screen.findByDisplayValue('ჩემი პროექტი');
    fireEvent.click(screen.getByRole('button', { name: 'გაუქმება' }));
    expect(updateProject).not.toHaveBeenCalled();
  });
});
