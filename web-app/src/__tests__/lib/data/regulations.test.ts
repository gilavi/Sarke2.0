import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: { functions: { invoke: vi.fn() } } }));

import { supabase } from '@/lib/supabase';
import {
  REGULATIONS,
  loadRegulationStates,
  getLastFetchAt,
  markRegulationSeen,
  maybeRefreshRegulations,
} from '@/lib/data/regulations';

const invoke = supabase.functions.invoke as unknown as Mock;
const NOW = new Date('2026-05-26T00:00:00Z').getTime();
const dateKey = (id: string) => `regulation_date_${id}`;
const seenKey = (id: string) => `regulation_seen_${id}`;
const LAST_FETCH_KEY = 'regulations_last_fetch';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.spyOn(Date, 'now').mockReturnValue(NOW);
});
afterEach(() => vi.restoreAllMocks());

describe('REGULATIONS', () => {
  it('lists the five tracked legal documents', () => {
    expect(REGULATIONS).toHaveLength(5);
    expect(REGULATIONS.every((r) => r.url.startsWith('https://matsne.gov.ge'))).toBe(true);
  });
});

describe('loadRegulationStates', () => {
  it('flags a doc as updated when its stored date differs from the seen date', () => {
    const id = REGULATIONS[0].id;
    localStorage.setItem(dateKey(id), '2026-05-01');
    localStorage.setItem(seenKey(id), '2026-04-01');
    const state = loadRegulationStates().find((s) => s.id === id)!;
    expect(state.lastUpdated).toBe('2026-05-01');
    expect(state.isUpdated).toBe(true);
  });

  it('is not updated once seen matches the date, nor when no date is stored', () => {
    const id = REGULATIONS[0].id;
    localStorage.setItem(dateKey(id), '2026-05-01');
    localStorage.setItem(seenKey(id), '2026-05-01');
    expect(loadRegulationStates().find((s) => s.id === id)!.isUpdated).toBe(false);

    const other = REGULATIONS[1].id;
    const s = loadRegulationStates().find((x) => x.id === other)!;
    expect(s.lastUpdated).toBeNull();
    expect(s.isUpdated).toBe(false);
  });
});

describe('getLastFetchAt / markRegulationSeen', () => {
  it('returns the stored last-fetch stamp', () => {
    expect(getLastFetchAt()).toBeNull();
    localStorage.setItem(LAST_FETCH_KEY, '2026-05-20T00:00:00Z');
    expect(getLastFetchAt()).toBe('2026-05-20T00:00:00Z');
  });

  it('marks a doc seen at its current stored date', () => {
    const id = REGULATIONS[0].id;
    localStorage.setItem(dateKey(id), '2026-05-01');
    markRegulationSeen(id);
    expect(localStorage.getItem(seenKey(id))).toBe('2026-05-01');
  });

  it('does nothing when there is no stored date', () => {
    const id = REGULATIONS[0].id;
    markRegulationSeen(id);
    expect(localStorage.getItem(seenKey(id))).toBeNull();
  });
});

describe('maybeRefreshRegulations', () => {
  it('returns cached states without fetching when the last fetch is fresh', async () => {
    localStorage.setItem(LAST_FETCH_KEY, new Date(NOW).toISOString());
    const { lastFetch } = await maybeRefreshRegulations();
    expect(invoke).not.toHaveBeenCalled();
    expect(lastFetch).toBe(new Date(NOW).toISOString());
  });

  it('fetches and stores dates when stale, stamping the last fetch', async () => {
    const dates = ['2026-05-01', null, '2026-05-02', null, null];
    invoke.mockResolvedValue({ data: { dates }, error: null });

    await maybeRefreshRegulations();

    expect(invoke).toHaveBeenCalledWith('fetch-regulation-dates', {
      body: { urls: REGULATIONS.map((r) => r.url) },
    });
    expect(localStorage.getItem(dateKey(REGULATIONS[0].id))).toBe('2026-05-01');
    expect(localStorage.getItem(dateKey(REGULATIONS[2].id))).toBe('2026-05-02');
    // Stamp is written via `new Date().toISOString()` (real clock) - assert it exists.
    expect(getLastFetchAt()).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('fetches even when fresh if forced', async () => {
    localStorage.setItem(LAST_FETCH_KEY, new Date(NOW).toISOString());
    invoke.mockResolvedValue({ data: { dates: REGULATIONS.map(() => null) }, error: null });
    await maybeRefreshRegulations(true);
    expect(invoke).toHaveBeenCalled();
  });

  it('does not stamp the last fetch when the edge function errors', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'down' } });
    await maybeRefreshRegulations();
    expect(invoke).toHaveBeenCalled();
    expect(getLastFetchAt()).toBeNull();
  });
});
