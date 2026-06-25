/**
 * Unit tests for makeInspectionService complete()/reopen() parent sync
 * (lib/inspection/service.ts).
 *
 * Equipment "completed"/"draft" lives on the <type>_inspections row, but every
 * unified inspection feed (Home/History `inspectionsApi.recent`, the
 * get_project_inspections_unified RPC, project lists) reads the PARENT
 * public.inspections row, which shares the equipment row's id. Before the fix,
 * complete()/reopen() wrote only the equipment table, so the parent stayed
 * 'draft' and completed equipment acts never surfaced anywhere. These tests
 * lock the dual-write. See docs/reports/BUG_REPORT.md.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

type Call = { table: string; update: Record<string, unknown>; eqCol: string; eqVal: unknown };
const calls: Call[] = [];
const errorTables = new Set<string>();

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      update: (payload: Record<string, unknown>) => ({
        eq: (eqCol: string, eqVal: unknown) => {
          calls.push({ table, update: payload, eqCol, eqVal });
          return Promise.resolve({ error: errorTables.has(table) ? { message: `boom ${table}` } : null });
        },
      }),
    }),
  },
  STORAGE_BUCKETS: { answerPhotos: 'answer-photos' },
}));
vi.mock('../../lib/services', () => ({ storageApi: { uploadFromUri: vi.fn(), remove: vi.fn() } }));
vi.mock('expo-crypto', () => ({ randomUUID: () => 'uuid-x' }));

const { makeInspectionService } = await import('../../lib/inspection/service');

const svc = makeInspectionService({
  table: 'bobcat_inspections',
  pathPrefix: 'bobcat',
  inspectionType: 'bobcat',
  toModel: (r: unknown) => r,
  toDb: (p: Record<string, unknown>) => p,
  createColumns: () => ({}),
});

beforeEach(() => {
  calls.length = 0;
  errorTables.clear();
});

describe('makeInspectionService.complete', () => {
  it('updates the equipment table AND the parent inspections row, same id + timestamp', async () => {
    await svc.complete('i1');

    expect(calls.map((c) => c.table)).toEqual(['bobcat_inspections', 'inspections']);
    for (const c of calls) {
      expect(c.eqCol).toBe('id');
      expect(c.eqVal).toBe('i1');
      expect(c.update.status).toBe('completed');
      expect(typeof c.update.completed_at).toBe('string');
    }
    // Parent and child must record the exact same completion timestamp.
    expect(calls[0].update.completed_at).toBe(calls[1].update.completed_at);
  });

  it('does not touch the parent when the equipment update fails', async () => {
    errorTables.add('bobcat_inspections');
    await expect(svc.complete('i1')).rejects.toThrow('boom bobcat_inspections');
    expect(calls.map((c) => c.table)).toEqual(['bobcat_inspections']);
  });

  it('surfaces a parent-update failure', async () => {
    errorTables.add('inspections');
    await expect(svc.complete('i1')).rejects.toThrow('boom inspections');
    expect(calls.map((c) => c.table)).toEqual(['bobcat_inspections', 'inspections']);
  });
});

describe('makeInspectionService.reopen', () => {
  it('sets draft + null completed_at on both the equipment table and the parent', async () => {
    await svc.reopen('i1');

    expect(calls.map((c) => c.table)).toEqual(['bobcat_inspections', 'inspections']);
    for (const c of calls) {
      expect(c.eqVal).toBe('i1');
      expect(c.update.status).toBe('draft');
      expect(c.update.completed_at).toBeNull();
    }
  });

  it('does not touch the parent when the equipment reopen fails', async () => {
    errorTables.add('bobcat_inspections');
    await expect(svc.reopen('i1')).rejects.toThrow('boom bobcat_inspections');
    expect(calls.map((c) => c.table)).toEqual(['bobcat_inspections']);
  });
});
