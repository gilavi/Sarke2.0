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

const { toErrorMessage, logError, readErrorLog, clearErrorLog } =
  await import('../../lib/logError');

// `logError` schedules writes via `void appendToRing(...)` - fire-and-forget on
// an internal serialized promise chain. To make tests deterministic we drain
// the chain by yielding the event loop until the buffer stops changing.
async function drainRing() {
  let prev = -1;
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 0));
    let cur = 0;
    try {
      cur = JSON.parse(store['@errors:ring'] ?? '[]').length;
    } catch {
      cur = -2; // sentinel for "non-JSON value present" - keeps polling
    }
    if (cur === prev) return;
    prev = cur;
  }
}

beforeEach(async () => {
  // Drain any leftover writes from the previous test, then clear storage.
  await drainRing();
  for (const k of Object.keys(store)) delete store[k];
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(async () => {
  await drainRing();
});

describe('toErrorMessage', () => {
  it('returns fallback for null/undefined', () => {
    expect(toErrorMessage(null)).toBe('უცნობი შეცდომა');
    expect(toErrorMessage(undefined)).toBe('უცნობი შეცდომა');
  });

  it('returns string input verbatim', () => {
    expect(toErrorMessage('raw error')).toBe('raw error');
  });

  it('returns the Error.message for Error instances', () => {
    expect(toErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('falls back when Error.message is empty', () => {
    expect(toErrorMessage(new Error(''))).toBe('უცნობი შეცდომა');
  });

  it('reads object.message', () => {
    expect(toErrorMessage({ message: 'object msg' })).toBe('object msg');
  });

  it('reads object.error_description (OAuth)', () => {
    expect(toErrorMessage({ error_description: 'oauth err' })).toBe('oauth err');
  });

  it('reads object.details (Supabase Postgrest)', () => {
    expect(toErrorMessage({ details: 'pg details' })).toBe('pg details');
  });

  it('recurses into nested object.error', () => {
    expect(toErrorMessage({ error: { message: 'nested' } })).toBe('nested');
  });

  it('caps recursion depth at 3 to avoid infinite loops', () => {
    const deeplyNested: any = { error: { error: { error: { error: { message: 'too deep' } } } } };
    // depth limit hits before reaching 'too deep' - falls through to JSON.stringify
    const result = toErrorMessage(deeplyNested);
    expect(typeof result).toBe('string');
  });

  it('JSON-stringifies plain objects with no known fields', () => {
    expect(toErrorMessage({ foo: 'bar' })).toBe('{"foo":"bar"}');
  });

  it('honors a custom fallback', () => {
    expect(toErrorMessage(null, 'CUSTOM')).toBe('CUSTOM');
  });

  it('falls back when JSON.stringify throws (circular ref)', () => {
    const circ: any = {};
    circ.self = circ;
    expect(toErrorMessage(circ, 'FB')).toBe('FB');
  });
});

describe('logError + ring buffer', () => {
  it('writes a warn line with the context tag', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logError(new Error('test err'), 'my-context');
    await drainRing();
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0]![0]).toBe('[my-context]');
  });

  it('appends entries to the ring buffer', async () => {
    logError(new Error('first'), 'ctx');
    await drainRing();
    const log = await readErrorLog();
    expect(log).toHaveLength(1);
    expect(log[0]!.context).toBe('ctx');
    expect(log[0]!.message).toBe('first');
    expect(log[0]!.stack).toBeDefined();
  });

  it('caps the ring buffer at 50 entries (oldest evicted)', async () => {
    for (let i = 0; i < 55; i++) logError(new Error(`e${i}`), 'ctx');
    await drainRing();
    const log = await readErrorLog();
    expect(log).toHaveLength(50);
    expect(log[0]!.message).toBe('e5');
    expect(log[49]!.message).toBe('e54');
  });

  it('readErrorLog returns [] when storage is empty', async () => {
    expect(await readErrorLog()).toEqual([]);
  });

  it('readErrorLog returns [] when JSON.parse throws', async () => {
    store['@errors:ring'] = 'not json';
    expect(await readErrorLog()).toEqual([]);
  });

  it('clearErrorLog wipes stored entries', async () => {
    logError(new Error('x'), 'ctx');
    await drainRing();
    expect((await readErrorLog()).length).toBe(1);
    await clearErrorLog();
    expect(await readErrorLog()).toEqual([]);
  });
});
