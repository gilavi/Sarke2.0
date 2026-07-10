/**
 * Unit tests for useLegacySummaryPhotoRecovery — the one-time migration shim
 * that rescues summary-photo path lists older bobcat/excavator builds wrote only
 * to AsyncStorage into the summary_photos DB column. See BUG_REPORT.md 2026-07-07.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory AsyncStorage the tests seed + inspect.
const store: Record<string, string> = {};
const getItem = vi.fn((k: string) => Promise.resolve(store[k] ?? null));
const removeItem = vi.fn((k: string) => { delete store[k]; return Promise.resolve(); });

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: (k: string) => getItem(k),
    setItem: (k: string, v: string) => { store[k] = v; return Promise.resolve(); },
    removeItem: (k: string) => removeItem(k),
  },
}));

const { useLegacySummaryPhotoRecovery } = await import(
  '../../lib/inspection/useLegacySummaryPhotoRecovery'
);

const KEY = 'bobcat-wizard:i1:summaryPhotos';

function setup(over: Partial<Parameters<typeof useLegacySummaryPhotoRecovery>[0]> = {}) {
  const props = {
    inspectionId: 'i1' as string | null,
    dbPhotos: [] as string[] | undefined,
    legacyKey: KEY,
    persist: vi.fn(() => Promise.resolve()),
    apply: vi.fn(),
    ...over,
  };
  const hook = renderHook((p: typeof props) => useLegacySummaryPhotoRecovery(p), {
    initialProps: props,
  });
  return { hook, persist: props.persist, apply: props.apply };
}

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  getItem.mockClear();
  removeItem.mockClear();
});

describe('useLegacySummaryPhotoRecovery', () => {
  it('recovers an orphaned legacy list into the DB and clears the key', async () => {
    store[KEY] = JSON.stringify(['a.jpg', 'b.jpg']);
    const { persist, apply } = setup();

    await waitFor(() => expect(persist).toHaveBeenCalledWith(['a.jpg', 'b.jpg']));
    expect(apply).toHaveBeenCalledWith(['a.jpg', 'b.jpg']);
    await waitFor(() => expect(store[KEY]).toBeUndefined());
  });

  it('does nothing (but drops the stale key) when the DB row already has photos', async () => {
    store[KEY] = JSON.stringify(['a.jpg']);
    const { persist, apply } = setup({ dbPhotos: ['x.jpg'] });

    await waitFor(() => expect(removeItem).toHaveBeenCalledWith(KEY));
    expect(persist).not.toHaveBeenCalled();
    expect(apply).not.toHaveBeenCalled();
    expect(getItem).not.toHaveBeenCalled();
  });

  it('is a no-op when there is no legacy key', async () => {
    const { persist, apply } = setup();
    await waitFor(() => expect(getItem).toHaveBeenCalledWith(KEY));
    expect(persist).not.toHaveBeenCalled();
    expect(apply).not.toHaveBeenCalled();
  });

  it('ignores an empty or malformed legacy list', async () => {
    store[KEY] = JSON.stringify([]);
    const { persist, apply } = setup();
    await waitFor(() => expect(getItem).toHaveBeenCalled());
    expect(persist).not.toHaveBeenCalled();
    expect(apply).not.toHaveBeenCalled();
    // Non-string members are rejected too.
    store[KEY] = JSON.stringify([1, 2]);
    const second = setup({ inspectionId: 'i2', legacyKey: 'bobcat-wizard:i2:summaryPhotos' });
    await waitFor(() => expect(second.persist).not.toHaveBeenCalled());
  });

  it('retains the legacy key when the DB write fails (so the next open retries)', async () => {
    store[KEY] = JSON.stringify(['a.jpg']);
    const { persist } = setup({ persist: vi.fn(() => Promise.reject(new Error('offline'))) });
    await waitFor(() => expect(persist).toHaveBeenCalled());
    // Key survives — recovery will re-attempt next mount.
    expect(store[KEY]).toBe(JSON.stringify(['a.jpg']));
  });

  it('runs recovery at most once per inspection id across re-renders', async () => {
    store[KEY] = JSON.stringify(['a.jpg']);
    const { hook, persist } = setup();
    await waitFor(() => expect(persist).toHaveBeenCalledTimes(1));
    // Re-render with a fresh (empty) dbPhotos value for the same id.
    hook.rerender({
      inspectionId: 'i1', dbPhotos: [], legacyKey: KEY,
      persist, apply: vi.fn(),
    });
    await Promise.resolve();
    expect(persist).toHaveBeenCalledTimes(1);
  });
});
