import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory backing store for the mocked AsyncStorage. The module branches on
// the stored value (null / 'en' / 'ka' / garbage) and on whether the storage
// calls throw, so each test starts from a clean slate + toggleable throws.
const asyncStore: Record<string, string> = {};

let getThrows = false;
let setThrows = false;

const getItem = vi.fn(async (k: string) => {
  if (getThrows) throw new Error('AsyncStorage unavailable');
  return k in asyncStore ? asyncStore[k] : null;
});
const setItem = vi.fn(async (k: string, v: string) => {
  if (setThrows) throw new Error('AsyncStorage unavailable');
  asyncStore[k] = v;
});

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem,
    setItem,
    removeItem: vi.fn(async (k: string) => {
      delete asyncStore[k];
    }),
    getAllKeys: vi.fn(async () => Object.keys(asyncStore)),
    multiRemove: vi.fn(async (keys: string[]) => {
      for (const k of keys) delete asyncStore[k];
    }),
  },
}));

const { loadPdfLanguage, savePdfLanguage } = await import('../../lib/pdfLanguagePref');

// The canonical storage key the module reads/writes.
const KEY = 'pdf_language';

beforeEach(() => {
  for (const k of Object.keys(asyncStore)) delete asyncStore[k];
  getThrows = false;
  setThrows = false;
  vi.clearAllMocks();
});

describe('loadPdfLanguage', () => {
  it("returns the default 'ka' when nothing is stored (getItem -> null)", async () => {
    expect(await loadPdfLanguage()).toBe('ka');
    expect(getItem).toHaveBeenCalledTimes(1);
    expect(getItem).toHaveBeenCalledWith(KEY);
  });

  it("returns 'en' when 'en' is stored", async () => {
    asyncStore[KEY] = 'en';
    expect(await loadPdfLanguage()).toBe('en');
  });

  it("returns 'ka' when 'ka' is stored", async () => {
    asyncStore[KEY] = 'ka';
    expect(await loadPdfLanguage()).toBe('ka');
  });

  it("falls back to default 'ka' for an unrecognized stored value", async () => {
    asyncStore[KEY] = 'fr';
    expect(await loadPdfLanguage()).toBe('ka');
  });

  it("falls back to default 'ka' for a garbage stored value", async () => {
    asyncStore[KEY] = '{"weird":true}';
    expect(await loadPdfLanguage()).toBe('ka');
  });

  it("falls back to default 'ka' for an empty-string stored value", async () => {
    asyncStore[KEY] = '';
    expect(await loadPdfLanguage()).toBe('ka');
  });

  it("is case-sensitive: 'EN' is not accepted and falls back to 'ka'", async () => {
    asyncStore[KEY] = 'EN';
    expect(await loadPdfLanguage()).toBe('ka');
  });

  it("does not trim whitespace: ' en' falls back to 'ka'", async () => {
    asyncStore[KEY] = ' en';
    expect(await loadPdfLanguage()).toBe('ka');
  });

  it("returns the default 'ka' when getItem throws (catch branch)", async () => {
    getThrows = true;
    expect(await loadPdfLanguage()).toBe('ka');
    expect(getItem).toHaveBeenCalledTimes(1);
  });

  it('reads only the pdf_language key and never writes during a load', async () => {
    asyncStore[KEY] = 'en';
    await loadPdfLanguage();
    expect(getItem).toHaveBeenCalledWith(KEY);
    expect(setItem).not.toHaveBeenCalled();
  });
});

describe('savePdfLanguage', () => {
  it("persists 'en' under the pdf_language key", async () => {
    await savePdfLanguage('en');
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(setItem).toHaveBeenCalledWith(KEY, 'en');
    expect(asyncStore[KEY]).toBe('en');
  });

  it("persists 'ka' under the pdf_language key", async () => {
    await savePdfLanguage('ka');
    expect(setItem).toHaveBeenCalledWith(KEY, 'ka');
    expect(asyncStore[KEY]).toBe('ka');
  });

  it('resolves to undefined on a successful write', async () => {
    const result = await savePdfLanguage('en');
    expect(result).toBeUndefined();
  });

  it('overwrites a previously stored value', async () => {
    asyncStore[KEY] = 'ka';
    await savePdfLanguage('en');
    expect(asyncStore[KEY]).toBe('en');
  });

  it('swallows a setItem throw without rejecting (best-effort write)', async () => {
    setThrows = true;
    await expect(savePdfLanguage('en')).resolves.toBeUndefined();
    expect(setItem).toHaveBeenCalledTimes(1);
    // Nothing got persisted because the write threw.
    expect(asyncStore[KEY]).toBeUndefined();
  });

  it('does not read from storage during a save', async () => {
    await savePdfLanguage('ka');
    expect(getItem).not.toHaveBeenCalled();
  });
});

describe('round-trip', () => {
  it("saves then loads 'en'", async () => {
    await savePdfLanguage('en');
    expect(await loadPdfLanguage()).toBe('en');
  });

  it("saves then loads 'ka'", async () => {
    await savePdfLanguage('ka');
    expect(await loadPdfLanguage()).toBe('ka');
  });

  it("load after a failed save still returns the default 'ka'", async () => {
    setThrows = true;
    await savePdfLanguage('en');
    setThrows = false;
    expect(await loadPdfLanguage()).toBe('ka');
  });
});
