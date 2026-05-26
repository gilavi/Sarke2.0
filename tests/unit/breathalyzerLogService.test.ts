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

let uuidCounter = 0;
vi.mock('expo-crypto', () => ({
  randomUUID: vi.fn(() => `uuid-${++uuidCounter}`),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  },
}));

const { peoplePoolApi, makeBLEntry } = await import('../../lib/breathalyzerLogService');

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  uuidCounter = 0;
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-26T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('makeBLEntry', () => {
  it('attaches a uuid and computes resultStatus from result', () => {
    const entry = makeBLEntry({
      order: 1,
      personName: 'A',
      position: 'Worker',
      testType: 'primary',
      result: 0,
      signature: null,
      refusedSignature: false,
      time: '2026-05-26T08:00:00Z',
      relatedEntryId: null,
    });
    expect(entry.id).toBe('uuid-1');
    expect(entry.personName).toBe('A');
    expect(entry.position).toBe('Worker');
    expect(entry.result).toBe(0);
    expect(entry.resultStatus).toBe('safe');
  });

  it('classifies high results as fail and mid as warning', () => {
    const fail = makeBLEntry({
      order: 1, personName: 'F', position: '', testType: 'primary',
      result: 0.3, signature: null, refusedSignature: false,
      time: '2026-05-26T08:00:00Z', relatedEntryId: null,
    });
    const warn = makeBLEntry({
      order: 2, personName: 'W', position: '', testType: 'primary',
      result: 0.15, signature: null, refusedSignature: false,
      time: '2026-05-26T08:00:00Z', relatedEntryId: null,
    });
    expect(fail.resultStatus).toBe('fail');
    expect(warn.resultStatus).toBe('warning');
  });

  it('issues a unique id for each call', () => {
    const a = makeBLEntry({
      order: 1, personName: 'A', position: 'X', testType: 'primary',
      result: 0, signature: null, refusedSignature: false,
      time: '2026-05-26T08:00:00Z', relatedEntryId: null,
    });
    const b = makeBLEntry({
      order: 2, personName: 'B', position: 'Y', testType: 'primary',
      result: 0, signature: null, refusedSignature: false,
      time: '2026-05-26T09:00:00Z', relatedEntryId: null,
    });
    expect(a.id).not.toBe(b.id);
  });
});

describe('peoplePoolApi.load', () => {
  it('returns [] when no pool stored', async () => {
    expect(await peoplePoolApi.load('p1')).toEqual([]);
  });

  it('returns [] when storage value is invalid JSON', async () => {
    store['people_pool_p1'] = 'not json';
    expect(await peoplePoolApi.load('p1')).toEqual([]);
  });

  it('returns the parsed pool', async () => {
    const pool = [{ name: 'X', position: 'Y', lastTestedAt: '2026-05-20T10:00:00Z', testCount: 1 }];
    store['people_pool_p1'] = JSON.stringify(pool);
    expect(await peoplePoolApi.load('p1')).toEqual(pool);
  });

  it('uses project-scoped keys', async () => {
    store['people_pool_pA'] = JSON.stringify([{ name: 'A' }]);
    store['people_pool_pB'] = JSON.stringify([{ name: 'B' }]);
    const a = await peoplePoolApi.load('pA');
    const b = await peoplePoolApi.load('pB');
    expect((a[0] as any).name).toBe('A');
    expect((b[0] as any).name).toBe('B');
  });
});

describe('peoplePoolApi.upsert', () => {
  it('adds a new person to the front of an empty pool with testCount=1', async () => {
    await peoplePoolApi.upsert('p1', { name: 'Gio', position: 'Inspector' });
    const pool = await peoplePoolApi.load('p1');
    expect(pool).toHaveLength(1);
    expect(pool[0].name).toBe('Gio');
    expect(pool[0].testCount).toBe(1);
    expect(pool[0].lastTestedAt).toBe('2026-05-26T12:00:00.000Z');
  });

  it('trims whitespace from name when inserting', async () => {
    await peoplePoolApi.upsert('p1', { name: '  Gio  ', position: 'X' });
    const pool = await peoplePoolApi.load('p1');
    expect(pool[0].name).toBe('Gio');
  });

  it('increments testCount and moves an existing person to the front', async () => {
    await peoplePoolApi.upsert('p1', { name: 'A', position: 'Inspector' });
    await peoplePoolApi.upsert('p1', { name: 'B', position: 'Inspector' });
    await peoplePoolApi.upsert('p1', { name: 'A', position: 'NewPos' });
    const pool = await peoplePoolApi.load('p1');
    expect(pool[0].name).toBe('A');
    expect(pool[0].position).toBe('NewPos');
    expect(pool[0].testCount).toBe(2);
    expect(pool[1].name).toBe('B');
  });

  it('matches names case-insensitively', async () => {
    await peoplePoolApi.upsert('p1', { name: 'Gio', position: 'X' });
    await peoplePoolApi.upsert('p1', { name: 'GIO', position: 'Y' });
    const pool = await peoplePoolApi.load('p1');
    expect(pool).toHaveLength(1);
    expect(pool[0].testCount).toBe(2);
  });

  it('updates lastTestedAt on each upsert', async () => {
    await peoplePoolApi.upsert('p1', { name: 'Gio', position: 'X' });
    vi.setSystemTime(new Date('2026-05-27T08:00:00Z'));
    await peoplePoolApi.upsert('p1', { name: 'Gio', position: 'Y' });
    const pool = await peoplePoolApi.load('p1');
    expect(pool[0].lastTestedAt).toBe('2026-05-27T08:00:00.000Z');
  });
});
