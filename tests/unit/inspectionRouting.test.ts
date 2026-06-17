import { describe, it, expect } from 'vitest';
import { routeForInspection } from '../../lib/inspectionRouting';

const ID = 'abc-123-def';

describe('routeForInspection', () => {
  // Equipment types that always route to their own detail screen regardless of completion state.
  it.each([
    ['bobcat',                         `/inspections/bobcat/${ID}`],
    ['excavator',                      `/inspections/excavator/${ID}`],
    ['general_equipment',              `/inspections/general-equipment/${ID}`],
    ['cargo_platform',                 `/inspections/cargo-platform/${ID}`],
    ['safety_net_inspection',          `/inspections/safety-net/${ID}`],
    ['mobile_ladder_inspection',       `/inspections/mobile-ladder/${ID}`],
    ['fall_protection_inspection',     `/inspections/fall-protection/${ID}`],
    ['lifting_accessories_inspection', `/inspections/lifting-accessories/${ID}`],
    ['forklift_inspection',            `/inspections/forklift/${ID}`],
  ] as const)('%s - same route regardless of isCompleted', (source, expected) => {
    expect(routeForInspection(source, ID, false)).toBe(expected);
    expect(routeForInspection(source, ID, true)).toBe(expected);
  });

  describe('harness - isCompleted changes the route', () => {
    it('draft → /inspections/harness/:id', () => {
      expect(routeForInspection('harness', ID, false)).toBe(`/inspections/harness/${ID}`);
    });
    it('completed → /inspections/:id (generic view)', () => {
      expect(routeForInspection('harness', ID, true)).toBe(`/inspections/${ID}`);
    });
  });

  describe('generic fallback (null / undefined / unknown source)', () => {
    it('null + draft → wizard', () => {
      expect(routeForInspection(null, ID, false)).toBe(`/inspections/${ID}/wizard`);
    });
    it('null + completed → generic view', () => {
      expect(routeForInspection(null, ID, true)).toBe(`/inspections/${ID}`);
    });
    it('undefined + draft → wizard', () => {
      expect(routeForInspection(undefined, ID, false)).toBe(`/inspections/${ID}/wizard`);
    });
    it('undefined + completed → generic view', () => {
      expect(routeForInspection(undefined, ID, true)).toBe(`/inspections/${ID}`);
    });
    it('unknown string + draft → wizard', () => {
      expect(routeForInspection('xaracho', ID, false)).toBe(`/inspections/${ID}/wizard`);
    });
    it('unknown string + completed → generic view', () => {
      expect(routeForInspection('xaracho', ID, true)).toBe(`/inspections/${ID}`);
    });
  });
});
