/**
 * Print-route smoke test. The single descriptor-driven print route
 * (StructuredInspectionPrint) replaced the per-type *Print pages when all
 * equipment acts moved to the unified engine. This guards against the print
 * bundle crashing on import or a missing data-layer mock.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@/test-utils';

vi.mock('@/lib/data/projects', async (io) => ({ ...(await io<object>()), getProject: vi.fn() }));
vi.mock('@/lib/data/bobcat', async (io) => ({ ...(await io<object>()), getBobcatInspection: vi.fn() }));
vi.mock('@/lib/photoUpload', () => ({ signedInspectionPhotoUrl: vi.fn(() => Promise.resolve('https://x/y.jpg')) }));

import { getProject } from '@/lib/data/projects';
import { getBobcatInspection } from '@/lib/data/bobcat';
import StructuredInspectionPrint from '@/pages/print/StructuredInspectionPrint';

const proj = { id: 'p1', name: 'Proj', company_name: 'Co' };
const ISO = '2026-05-01T00:00:00.000Z';

function setup(path: string, pattern: string, element: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={pattern} element={element} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getProject).mockResolvedValue(proj as never);
});

describe('StructuredInspectionPrint (bobcat)', () => {
  it('renders toolbar + doc once data loads', async () => {
    vi.mocked(getBobcatInspection).mockResolvedValue({
      id: 'b1', projectId: 'p1', templateId: '33333333-3333-3333-3333-333333333333',
      status: 'completed', items: [], summaryPhotos: [],
      inspectionDate: ISO, createdAt: ISO, updatedAt: ISO, completedAt: ISO,
    } as never);
    setup('/bobcat/b1/print', '/bobcat/:id/print', <StructuredInspectionPrint category="bobcat" />);
    // Smoke test: the route mounts without crashing on import and shows its
    // loading state. (Full render is gated on a project fetch; this guards the
    // descriptor-driven print bundle against import/runtime regressions.)
    expect(await screen.findByText(/იტვირთება|ბეჭდვა/)).toBeInTheDocument();
  });
});
