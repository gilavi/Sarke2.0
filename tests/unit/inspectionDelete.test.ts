import { describe, it, expect, vi, beforeEach } from 'vitest';

// Capture the table name + delete().eq() args the function dispatches.
const fromSpy = vi.fn();
const deleteSpy = vi.fn();
const eqSpy = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      fromSpy(table);
      return {
        delete: () => {
          deleteSpy();
          return {
            eq: (col: string, val: unknown) => {
              eqSpy(col, val);
              return Promise.resolve({ error: null });
            },
          };
        },
      };
    },
  },
}));

const { deleteInspectionBySource } = await import('../../lib/inspectionDelete');

beforeEach(() => {
  fromSpy.mockReset();
  deleteSpy.mockReset();
  eqSpy.mockReset();
});

describe('deleteInspectionBySource', () => {
  // After the 2026-05-27 identity unification, every inspection (generic +
  // 9 equipment types) has a parent row in public.inspections, and the
  // equipment-table FK has ON DELETE CASCADE pointing back. So a single
  // delete on the parent table covers every source - no per-type table
  // mapping, no chance of orphaning the parent row.
  const cases = [
    ['undefined source (legacy/null)', undefined],
    ['generic harness', 'harness'],
    ['generic xaracho', 'xaracho'],
    ['equipment: bobcat', 'bobcat'],
    ['equipment: excavator', 'excavator'],
    ['equipment: fall_protection_inspection', 'fall_protection_inspection'],
    ['equipment: forklift_inspection', 'forklift_inspection'],
    ['unknown future source', 'made_up_source'],
  ] as const;

  for (const [label, source] of cases) {
    it(`deletes from public.inspections regardless of source (${label})`, async () => {
      await deleteInspectionBySource(source, 'insp-123');
      expect(fromSpy).toHaveBeenCalledWith('inspections');
      expect(fromSpy).toHaveBeenCalledTimes(1);
      expect(eqSpy).toHaveBeenCalledWith('id', 'insp-123');
    });
  }

  it('throws when supabase returns an error so callers can surface a toast', async () => {
    const dbError = new Error('RLS denied');
    vi.doMock('../../lib/supabase', () => ({
      supabase: {
        from: () => ({
          delete: () => ({
            eq: () => Promise.resolve({ error: dbError }),
          }),
        }),
      },
    }));
    vi.resetModules();
    const { deleteInspectionBySource: deleteRetry } = await import('../../lib/inspectionDelete');
    await expect(deleteRetry('bobcat', 'i-1')).rejects.toBe(dbError);
    vi.doUnmock('../../lib/supabase');
  });
});
