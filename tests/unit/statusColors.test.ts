import { describe, it, expect, vi } from 'vitest';

vi.mock('../../lib/theme', () => ({
  theme: {
    colors: {
      semantic: {
        success: '#10B981',
        warning: '#F59E0B',
        warningSoft: '#FEF3C7',
        danger: '#DC2626',
        dangerSoft: '#FEE2E2',
      },
      neutral: { 400: '#A8A49C' },
    },
  },
}));

const {
  STATUS_BADGE_BG,
  STATUS_DOT_COLOR,
  INCIDENT_COLORS,
} = await import('../../lib/statusColors');

describe('statusColors', () => {
  describe('STATUS_BADGE_BG', () => {
    it('maps every CalendarStatus to a hex color string', () => {
      expect(STATUS_BADGE_BG.completed).toBe('#10B981');
      expect(STATUS_BADGE_BG.draft).toBe('#F59E0B');
      expect(STATUS_BADGE_BG.overdue).toBe('#DC2626');
      expect(STATUS_BADGE_BG.due_today).toBe('#F59E0B');
      expect(STATUS_BADGE_BG.due_soon).toBe('#F59E0B');
      expect(STATUS_BADGE_BG.upcoming).toBe('#A8A49C');
    });
  });

  describe('STATUS_DOT_COLOR', () => {
    it('matches STATUS_BADGE_BG values', () => {
      expect(STATUS_DOT_COLOR.completed).toBe('#10B981');
      expect(STATUS_DOT_COLOR.draft).toBe('#F59E0B');
      expect(STATUS_DOT_COLOR.overdue).toBe('#DC2626');
      expect(STATUS_DOT_COLOR.upcoming).toBe('#A8A49C');
    });
  });

  describe('INCIDENT_COLORS', () => {
    it('has bg/text/border strings for every incident type', () => {
      for (const k of ['minor', 'severe', 'fatal', 'mass', 'nearmiss'] as const) {
        expect(typeof INCIDENT_COLORS[k].bg).toBe('string');
        expect(typeof INCIDENT_COLORS[k].text).toBe('string');
        expect(typeof INCIDENT_COLORS[k].border).toBe('string');
        expect(INCIDENT_COLORS[k].bg.length).toBeGreaterThan(0);
      }
    });

    it('uses semantic warning palette for minor', () => {
      expect(INCIDENT_COLORS.minor.bg).toBe('#FEF3C7');
      expect(INCIDENT_COLORS.minor.border).toBe('#F59E0B');
    });

    it('uses semantic danger palette for fatal and mass', () => {
      expect(INCIDENT_COLORS.fatal.bg).toBe('#FEE2E2');
      expect(INCIDENT_COLORS.fatal.border).toBe('#DC2626');
      expect(INCIDENT_COLORS.mass.bg).toBe('#FEE2E2');
      expect(INCIDENT_COLORS.mass.border).toBe('#DC2626');
    });

    it('uses purple palette for nearmiss', () => {
      expect(INCIDENT_COLORS.nearmiss.bg).toBe('#EDE9FE');
      expect(INCIDENT_COLORS.nearmiss.border).toBe('#8B5CF6');
    });
  });
});
