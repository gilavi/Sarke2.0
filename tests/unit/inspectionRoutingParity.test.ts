import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, vi } from 'vitest';

// The registry pulls in every equipment service; stub the Supabase-backed
// factory so importing it stays pure (same pattern as bobcatService.test.ts).
vi.mock('../../lib/inspection/service', () => ({
  makeInspectionService: vi.fn(() => ({
    create: vi.fn(),
    getById: vi.fn(),
    listByProject: vi.fn(),
    patch: vi.fn(),
    complete: vi.fn(),
    reopen: vi.fn(),
    deletePhoto: vi.fn(),
    uploadPhotoAt: vi.fn(),
  })),
}));

const { inspectionRegistry } = await import('../../lib/inspection/registry');
const { routeForInspection } = await import('../../lib/inspectionRouting');

const ID = 'abc-123-def';

// Regression guard for the dispatch-drift class that has bitten twice
// (app/history.tsx, then app/projects/[id]/inspections.tsx): every equipment
// category registered in lib/inspection/registry.ts must resolve to its own
// detail screen via routeForInspection — never fall through to the generic
// /inspections/:id result screen, which has no data for typed equipment acts.
// When inspection type #10 lands, this fails until routeForInspection learns
// the new category.
describe('inspectionRegistry <-> routeForInspection parity', () => {
  it('routes every registered equipment category to a dedicated detail screen', () => {
    const categories = Object.keys(inspectionRegistry);
    expect(categories.length).toBeGreaterThan(0);
    for (const category of categories) {
      const completedRoute = routeForInspection(category, ID, true);
      expect(
        completedRoute,
        `category "${category}" fell through to the generic result route`,
      ).not.toBe(`/inspections/${ID}`);
      expect(
        routeForInspection(category, ID, false),
        `category "${category}" fell through to the generic wizard route`,
      ).not.toBe(`/inspections/${ID}/wizard`);
      expect(completedRoute).toContain(ID);
    }
  });

  // Every equipment route's completed branch must go through the shared
  // EquipmentResultScreen (features/inspection-result) — the per-route
  // copy-pasted EquipmentResultDetails + SubscriptionNotice wiring is what let
  // the 10 sibling routes drift. Harness is exempt: it is template-based and
  // redirects to the generic act detail (/inspections/[id]).
  it('every registered equipment category route file renders the shared EquipmentResultScreen', () => {
    for (const category of Object.keys(inspectionRegistry)) {
      // '/inspections/<folder>/<id>' → folder
      const folder = routeForInspection(category, ID, true).split('/')[2];
      const routeFile = join(process.cwd(), 'app', 'inspections', folder, '[id].tsx');
      const body = readFileSync(routeFile, 'utf8');
      expect(
        body.includes('EquipmentResultScreen'),
        `route for "${category}" (app/inspections/${folder}/[id].tsx) must render the shared EquipmentResultScreen`,
      ).toBe(true);
    }
  });
});
