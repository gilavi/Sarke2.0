import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const store: Record<string, string> = {};

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (k: string) => (k in store ? store[k] : null)),
    setItem: vi.fn(async (k: string, v: string) => {
      store[k] = v;
    }),
    removeItem: vi.fn(async (k: string) => {
      delete store[k];
    }),
  },
}));

const { getStore, recordCompletion, runMigrationIfNeeded } =
  await import('../../lib/calendarSchedule');

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-26T12:00:00'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('getStore', () => {
  it('returns empty buckets when nothing is stored', async () => {
    expect(await getStore()).toEqual({ inspections: {}, briefings: {} });
  });

  it('returns empty buckets when storage contains invalid JSON', async () => {
    store['@calendar:schedules'] = 'not json';
    expect(await getStore()).toEqual({ inspections: {}, briefings: {} });
  });

  it('strips internal groupKey from the public surface', async () => {
    await recordCompletion('inspections', 'i1', '2026-05-20T10:00:00Z', 'p1:t1');
    const result = await getStore();
    const entry = result.inspections.i1!;
    expect(entry.completedAt).toBe('2026-05-20T10:00:00Z');
    expect((entry as any).groupKey).toBeUndefined();
  });
});

describe('recordCompletion', () => {
  it('sets nextDueDate to completedAt + 10 days', async () => {
    await recordCompletion('inspections', 'i1', '2026-05-20T10:00:00Z', 'p1:t1');
    const result = await getStore();
    expect(result.inspections.i1!.nextDueDate).toBe('2026-05-30T10:00:00.000Z');
  });

  it('does not set nextDueDateOverride for the first completion of a group', async () => {
    await recordCompletion('inspections', 'i1', '2026-05-20T10:00:00Z', 'p1:t1');
    const result = await getStore();
    expect(result.inspections.i1!.nextDueDateOverride).toBeUndefined();
  });

  it('sets nextDueDateOverride when prior cycle still in the future (early completion)', async () => {
    await recordCompletion('inspections', 'i1', '2026-05-20T10:00:00Z', 'p1:t1');
    // i1.nextDueDate = 2026-05-30; "today" mocked to 2026-05-26 → still future
    await recordCompletion('inspections', 'i2', '2026-05-26T10:00:00Z', 'p1:t1');
    const result = await getStore();
    // override = 2026-05-26 + 10d = 2026-06-05
    expect(result.inspections.i2!.nextDueDateOverride).toBe('2026-06-05T10:00:00.000Z');
  });

  it('does NOT set override when prior cycle is already past', async () => {
    await recordCompletion('inspections', 'i1', '2026-05-01T10:00:00Z', 'p1:t1');
    // i1.nextDueDate = 2026-05-11 → already past today (2026-05-26)
    await recordCompletion('inspections', 'i2', '2026-05-26T10:00:00Z', 'p1:t1');
    const result = await getStore();
    expect(result.inspections.i2!.nextDueDateOverride).toBeUndefined();
  });

  it('keeps inspection and briefing buckets independent', async () => {
    await recordCompletion('inspections', 'i1', '2026-05-20T10:00:00Z', 'p1:t1');
    await recordCompletion('briefings', 'b1', '2026-05-20T10:00:00Z', 'p1');
    const result = await getStore();
    expect(result.inspections.i1).toBeDefined();
    expect(result.briefings.b1).toBeDefined();
  });

  it('only matches prior entries with the same groupKey', async () => {
    await recordCompletion('inspections', 'i1', '2026-05-20T10:00:00Z', 'p1:t1');
    await recordCompletion('inspections', 'i2', '2026-05-26T10:00:00', 'p2:t2');
    const result = await getStore();
    // different group → no override
    expect(result.inspections.i2!.nextDueDateOverride).toBeUndefined();
  });

  it('overwrites an existing entry by id', async () => {
    await recordCompletion('inspections', 'i1', '2026-05-20T10:00:00Z', 'p1:t1');
    await recordCompletion('inspections', 'i1', '2026-05-25T10:00:00Z', 'p1:t1');
    const result = await getStore();
    expect(result.inspections.i1!.completedAt).toBe('2026-05-25T10:00:00Z');
  });
});

describe('runMigrationIfNeeded', () => {
  it('seeds entries for completed inspections and briefings on first run', async () => {
    await runMigrationIfNeeded(
      [{ id: 'i1', completed_at: '2026-05-10T10:00:00Z', project_id: 'p1', template_id: 't1' }],
      [{ id: 'b1', dateTime: '2026-05-11T10:00:00Z', projectId: 'p1' }],
    );
    const result = await getStore();
    expect(result.inspections.i1!.nextDueDate).toBe('2026-05-20T10:00:00.000Z');
    expect(result.briefings.b1!.nextDueDate).toBe('2026-05-21T10:00:00.000Z');
  });

  it('skips inspections without completed_at', async () => {
    await runMigrationIfNeeded(
      [{ id: 'i1', completed_at: '' as any, project_id: 'p1', template_id: 't1' }],
      [],
    );
    expect((await getStore()).inspections.i1).toBeUndefined();
  });

  it('skips briefings without dateTime', async () => {
    await runMigrationIfNeeded(
      [],
      [{ id: 'b1', dateTime: '' as any, projectId: 'p1' }],
    );
    expect((await getStore()).briefings.b1).toBeUndefined();
  });

  it('does not overwrite entries that already exist', async () => {
    await recordCompletion('inspections', 'i1', '2026-05-20T10:00:00Z', 'p1:t1');
    await runMigrationIfNeeded(
      [{ id: 'i1', completed_at: '2026-01-01T10:00:00Z', project_id: 'p1', template_id: 't1' }],
      [],
    );
    const result = await getStore();
    expect(result.inspections.i1!.completedAt).toBe('2026-05-20T10:00:00Z');
  });

  it('is idempotent (no-op on second call)', async () => {
    await runMigrationIfNeeded(
      [{ id: 'i1', completed_at: '2026-05-10T10:00:00Z', project_id: 'p1', template_id: 't1' }],
      [],
    );
    // Second call shouldn't add the new row, because migration flag is set
    await runMigrationIfNeeded(
      [
        { id: 'i1', completed_at: '2026-05-10T10:00:00Z', project_id: 'p1', template_id: 't1' },
        { id: 'i2', completed_at: '2026-05-11T10:00:00Z', project_id: 'p1', template_id: 't1' },
      ],
      [],
    );
    const result = await getStore();
    expect(result.inspections.i2).toBeUndefined();
  });
});
