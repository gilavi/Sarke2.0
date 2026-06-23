import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock state ──────────────────────────────────────────────────────────────
// fetchUiStrings reads from supabase.from('ui_strings').select('key, en, ka').
// We back the mock with mutable module-level vars so each test can dictate the
// returned rows / error without re-importing the module under test.
let selectData: unknown = [];
let selectError: unknown = null;

const fromMock = vi.fn();
const selectMock = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => {
      fromMock(...args);
      return {
        select: (...sargs: unknown[]) => {
          selectMock(...sargs);
          return Promise.resolve({ data: selectData, error: selectError });
        },
      };
    },
  },
}));

// i18n default export only needs addResourceBundle for applyOverrides.
const addResourceBundle = vi.fn();
vi.mock('../../lib/i18n', () => ({
  default: { addResourceBundle },
}));

// NOTE: '../../lib/i18nFlatten' is intentionally NOT mocked — we exercise the
// real unflatten so the nested-tree assertions reflect production behavior.

const { fetchUiStrings, applyOverrides } = await import('../../lib/i18nOverlay');

beforeEach(() => {
  selectData = [];
  selectError = null;
  vi.clearAllMocks();
});

describe('fetchUiStrings', () => {
  it('selects key, en, ka from the ui_strings table', async () => {
    selectData = [];
    await fetchUiStrings();
    expect(fromMock).toHaveBeenCalledWith('ui_strings');
    expect(selectMock).toHaveBeenCalledWith('key, en, ka');
  });

  it('returns nested en / ka trees built by unflatten from dotted keys', async () => {
    selectData = [{ key: 'a.b', en: 'X', ka: 'Y' }];
    const overrides = await fetchUiStrings();
    expect(overrides.en.a).toEqual({ b: 'X' });
    expect((overrides.en.a as Record<string, unknown>).b).toBe('X');
    expect((overrides.ka.a as Record<string, unknown>).b).toBe('Y');
  });

  it('builds multi-level nested trees and merges sibling keys', async () => {
    selectData = [
      { key: 'common.save', en: 'Save', ka: 'შენახვა' },
      { key: 'common.cancel', en: 'Cancel', ka: 'გაუქმება' },
      { key: 'home.title', en: 'Home', ka: 'მთავარი' },
    ];
    const overrides = await fetchUiStrings();
    expect(overrides.en).toEqual({
      common: { save: 'Save', cancel: 'Cancel' },
      home: { title: 'Home' },
    });
    expect(overrides.ka).toEqual({
      common: { save: 'შენახვა', cancel: 'გაუქმება' },
      home: { title: 'მთავარი' },
    });
  });

  it('preserves Georgian leaf strings verbatim', async () => {
    selectData = [{ key: 'greeting', en: 'Hello', ka: 'გამარჯობა' }];
    const overrides = await fetchUiStrings();
    expect(overrides.ka.greeting).toBe('გამარჯობა');
    expect(overrides.en.greeting).toBe('Hello');
  });

  it('rebuilds arrays when keys use numeric segments', async () => {
    selectData = [
      { key: 'calendar.monthLabels.0', en: 'Jan', ka: 'იან' },
      { key: 'calendar.monthLabels.1', en: 'Feb', ka: 'თებ' },
    ];
    const overrides = await fetchUiStrings();
    const en = overrides.en.calendar as Record<string, unknown>;
    expect(Array.isArray(en.monthLabels)).toBe(true);
    expect(en.monthLabels).toEqual(['Jan', 'Feb']);
    const ka = overrides.ka.calendar as Record<string, unknown>;
    expect(ka.monthLabels).toEqual(['იან', 'თებ']);
  });

  it('throws when Supabase returns an error', async () => {
    selectError = new Error('boom');
    await expect(fetchUiStrings()).rejects.toThrow('boom');
  });

  it('throws the exact error object Supabase returns', async () => {
    const err = { message: 'rls denied', code: '42501' };
    selectError = err;
    await expect(fetchUiStrings()).rejects.toBe(err);
  });

  it('treats null data as an empty list (no throw, empty trees)', async () => {
    selectData = null;
    const overrides = await fetchUiStrings();
    expect(overrides.en).toEqual({});
    expect(overrides.ka).toEqual({});
  });

  it('returns empty trees for an empty data array', async () => {
    selectData = [];
    const overrides = await fetchUiStrings();
    expect(overrides.en).toEqual({});
    expect(overrides.ka).toEqual({});
  });

  it('skips a row whose en value is not a string but keeps it for ka', async () => {
    selectData = [{ key: 'partial', en: null, ka: 'მხოლოდ-ka' }];
    const overrides = await fetchUiStrings();
    expect(overrides.en).toEqual({});
    expect(overrides.ka.partial).toBe('მხოლოდ-ka');
  });

  it('skips a row whose ka value is not a string but keeps it for en', async () => {
    selectData = [{ key: 'partial', en: 'en-only', ka: 42 }];
    const overrides = await fetchUiStrings();
    expect(overrides.ka).toEqual({});
    expect(overrides.en.partial).toBe('en-only');
  });

  it('skips rows with a non-string key', async () => {
    selectData = [{ key: 123, en: 'X', ka: 'Y' }];
    const overrides = await fetchUiStrings();
    expect(overrides.en).toEqual({});
    expect(overrides.ka).toEqual({});
  });

  it('returns a UiStringOverrides with both en and ka keys present', async () => {
    selectData = [];
    const overrides = await fetchUiStrings();
    expect(Object.keys(overrides).sort()).toEqual(['en', 'ka']);
  });

  it('handles a top-level (no-dot) key', async () => {
    selectData = [{ key: 'topLevel', en: 'Top', ka: 'ზედა' }];
    const overrides = await fetchUiStrings();
    expect(overrides.en.topLevel).toBe('Top');
    expect(overrides.ka.topLevel).toBe('ზედა');
  });

  it('calls from/select exactly once per fetch', async () => {
    selectData = [];
    await fetchUiStrings();
    expect(fromMock).toHaveBeenCalledTimes(1);
    expect(selectMock).toHaveBeenCalledTimes(1);
  });
});

describe('applyOverrides', () => {
  it('registers both en and ka resource bundles', () => {
    applyOverrides({ en: { a: '1' }, ka: { a: '2' } });
    expect(addResourceBundle).toHaveBeenCalledTimes(2);
    expect(addResourceBundle).toHaveBeenNthCalledWith(1, 'en', 'translation', { a: '1' }, true, true);
    expect(addResourceBundle).toHaveBeenNthCalledWith(2, 'ka', 'translation', { a: '2' }, true, true);
  });

  it('passes deep=true and overwrite=true flags', () => {
    const enTree = { common: { save: 'Save' } };
    const kaTree = { common: { save: 'შენახვა' } };
    applyOverrides({ en: enTree, ka: kaTree });

    const enCall = addResourceBundle.mock.calls.find((c) => c[0] === 'en')!;
    const kaCall = addResourceBundle.mock.calls.find((c) => c[0] === 'ka')!;
    // (lng, namespace, tree, deep, overwrite)
    expect(enCall[1]).toBe('translation');
    expect(enCall[2]).toBe(enTree);
    expect(enCall[3]).toBe(true);
    expect(enCall[4]).toBe(true);
    expect(kaCall[2]).toBe(kaTree);
    expect(kaCall[3]).toBe(true);
    expect(kaCall[4]).toBe(true);
  });

  it('uses the namespace "translation" for both languages', () => {
    applyOverrides({ en: {}, ka: {} });
    for (const call of addResourceBundle.mock.calls) {
      expect(call[1]).toBe('translation');
    }
  });

  it('passes the exact tree objects through by reference', () => {
    const en = {};
    const ka = {};
    applyOverrides({ en, ka });
    expect(addResourceBundle.mock.calls[0][2]).toBe(en);
    expect(addResourceBundle.mock.calls[1][2]).toBe(ka);
  });

  it('returns undefined (void)', () => {
    expect(applyOverrides({ en: {}, ka: {} })).toBeUndefined();
  });
});

describe('fetchUiStrings → applyOverrides integration', () => {
  it('feeds the fetched trees straight into addResourceBundle', async () => {
    selectData = [{ key: 'a.b', en: 'X', ka: 'Y' }];
    const overrides = await fetchUiStrings();
    applyOverrides(overrides);
    expect(addResourceBundle).toHaveBeenNthCalledWith(
      1,
      'en',
      'translation',
      { a: { b: 'X' } },
      true,
      true,
    );
    expect(addResourceBundle).toHaveBeenNthCalledWith(
      2,
      'ka',
      'translation',
      { a: { b: 'Y' } },
      true,
      true,
    );
  });
});
