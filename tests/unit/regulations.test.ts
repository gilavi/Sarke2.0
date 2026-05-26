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

const {
  REGULATIONS,
  loadRegulationStates,
  getLastFetchAt,
  maybeRefreshRegulations,
  markRegulationSeen,
} = await import('../../lib/regulations');

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-26T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('REGULATIONS constant', () => {
  it('contains the expected catalog with id/title/description/url on each', () => {
    expect(REGULATIONS.length).toBeGreaterThan(0);
    for (const r of REGULATIONS) {
      expect(typeof r.id).toBe('string');
      expect(r.title.length).toBeGreaterThan(0);
      expect(r.description.length).toBeGreaterThan(0);
      expect(r.url).toMatch(/^https?:\/\//);
    }
  });
});

describe('loadRegulationStates', () => {
  it('returns lastUpdated=null and isUpdated=false on a clean store', async () => {
    const states = await loadRegulationStates();
    expect(states.length).toBe(REGULATIONS.length);
    for (const s of states) {
      expect(s.lastUpdated).toBeNull();
      expect(s.isUpdated).toBe(false);
    }
  });

  it('flags isUpdated=true when stored date differs from seen date', async () => {
    const id = REGULATIONS[0]!.id;
    store[`regulation_date_${id}`] = '10/05/2026';
    store[`regulation_seen_${id}`] = '01/01/2025';
    const states = await loadRegulationStates();
    const target = states.find((s) => s.id === id)!;
    expect(target.lastUpdated).toBe('10/05/2026');
    expect(target.isUpdated).toBe(true);
  });

  it('flags isUpdated=false when stored date matches seen date', async () => {
    const id = REGULATIONS[0]!.id;
    store[`regulation_date_${id}`] = '10/05/2026';
    store[`regulation_seen_${id}`] = '10/05/2026';
    const states = await loadRegulationStates();
    const target = states.find((s) => s.id === id)!;
    expect(target.isUpdated).toBe(false);
  });
});

describe('getLastFetchAt', () => {
  it('returns null when never fetched', async () => {
    expect(await getLastFetchAt()).toBeNull();
  });

  it('returns the stored timestamp', async () => {
    store['regulations_last_fetch'] = '2026-05-20T10:00:00Z';
    expect(await getLastFetchAt()).toBe('2026-05-20T10:00:00Z');
  });
});

describe('markRegulationSeen', () => {
  it('writes the current date to the seen key when a date is known', async () => {
    const id = REGULATIONS[0]!.id;
    store[`regulation_date_${id}`] = '10/05/2026';
    await markRegulationSeen(id);
    expect(store[`regulation_seen_${id}`]).toBe('10/05/2026');
  });

  it('does nothing when no date is stored for the regulation', async () => {
    const id = REGULATIONS[0]!.id;
    await markRegulationSeen(id);
    expect(store[`regulation_seen_${id}`]).toBeUndefined();
  });
});

describe('maybeRefreshRegulations', () => {
  it('skips the network when fresh and !force', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    store['regulations_last_fetch'] = '2026-05-26T11:00:00Z'; // 1h ago, well within 24h
    const result = await maybeRefreshRegulations();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.lastFetch).toBe('2026-05-26T11:00:00Z');
    expect(result.states.length).toBe(REGULATIONS.length);
  });

  it('fetches when stale (>24h)', async () => {
    store['regulations_last_fetch'] = '2026-05-24T10:00:00Z'; // 2 days ago
    const html = '<p>ბოლო ცვლილება 15/05/2026 და სხვა ტექსტი</p>';
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () => new Response(html, { status: 200 }) as Response,
    );
    const result = await maybeRefreshRegulations();
    expect(result.lastFetch).toBe('2026-05-26T12:00:00.000Z');
    // Each REGULATIONS entry stamped with the parsed date
    for (const r of REGULATIONS) {
      expect(store[`regulation_date_${r.id}`]).toBe('15/05/2026');
    }
  });

  it('fetches when force=true even if recent', async () => {
    store['regulations_last_fetch'] = '2026-05-26T11:00:00Z';
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () => new Response('<p>no dates here</p>', { status: 200 }) as Response,
    );
    await maybeRefreshRegulations(true);
    expect(fetchSpy).toHaveBeenCalledTimes(REGULATIONS.length);
  });

  it('falls back to the latest dd/mm/yyyy when no marker present', async () => {
    const html = '<p>01/01/2024 then 15/05/2026 also 12/03/2025</p>';
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () => new Response(html, { status: 200 }) as Response,
    );
    await maybeRefreshRegulations(true);
    const id = REGULATIONS[0]!.id;
    expect(store[`regulation_date_${id}`]).toBe('15/05/2026');
  });

  it('does not update lastFetch when every request fails', async () => {
    const priorFetch = '2026-05-24T10:00:00Z';
    store['regulations_last_fetch'] = priorFetch;
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () => new Response('', { status: 500 }) as Response,
    );
    const result = await maybeRefreshRegulations(true);
    expect(result.lastFetch).toBe(priorFetch);
    for (const r of REGULATIONS) {
      expect(store[`regulation_date_${r.id}`]).toBeUndefined();
    }
  });

  it('handles fetch throwing (network error)', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'));
    const result = await maybeRefreshRegulations(true);
    expect(result.lastFetch).toBeNull();
  });
});
