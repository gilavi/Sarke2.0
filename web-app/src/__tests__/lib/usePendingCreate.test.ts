import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { setPendingCreate, usePendingCreate } from '@/lib/usePendingCreate';

const STORAGE_KEY = 'sarke-pending-create';

beforeEach(() => {
  sessionStorage.clear();
});

// ── setPendingCreate / sessionStorage helpers ────────────────────────────────

describe('setPendingCreate', () => {
  it('stores data as JSON in sessionStorage', () => {
    setPendingCreate({ projectId: 'p1' });
    const raw = sessionStorage.getItem(STORAGE_KEY);
    expect(JSON.parse(raw!)).toEqual({ projectId: 'p1' });
  });

  it('overwrites a previous value', () => {
    setPendingCreate({ projectId: 'p1' });
    setPendingCreate({ projectId: 'p2' });
    const raw = sessionStorage.getItem(STORAGE_KEY);
    expect(JSON.parse(raw!).projectId).toBe('p2');
  });
});

// ── usePendingCreate hook ────────────────────────────────────────────────────

function wrapper(initialState: unknown) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      MemoryRouter,
      { initialEntries: [{ pathname: '/', state: initialState }] },
      children,
    );
}

describe('usePendingCreate', () => {
  it('returns pendingCreate from navigation state', () => {
    const { result } = renderHook(() => usePendingCreate<{ name: string }>(), {
      wrapper: wrapper({ pendingCreate: { name: 'test' } }),
    });
    expect(result.current.pendingCreate).toEqual({ name: 'test' });
  });

  it('falls back to sessionStorage when no navigation state', () => {
    setPendingCreate({ name: 'from-storage' });
    const { result } = renderHook(() => usePendingCreate<{ name: string }>(), {
      wrapper: wrapper(null),
    });
    expect(result.current.pendingCreate).toEqual({ name: 'from-storage' });
  });

  it('returns null when neither state nor sessionStorage has data', () => {
    const { result } = renderHook(() => usePendingCreate<{ name: string }>(), {
      wrapper: wrapper(null),
    });
    expect(result.current.pendingCreate).toBeNull();
  });

  it('lazyCreate calls createFn and returns the id', async () => {
    const { result } = renderHook(() => usePendingCreate<{ name: string }>(), {
      wrapper: wrapper({ pendingCreate: { name: 'test' } }),
    });

    const createFn = vi.fn().mockResolvedValue({ id: 'new-id' });
    let id: string | null = null;
    await act(async () => {
      id = await result.current.lazyCreate(createFn);
    });

    expect(createFn).toHaveBeenCalledWith({ name: 'test' });
    expect(id).toBe('new-id');
  });

  it('lazyCreate returns null when pendingCreate is null', async () => {
    const { result } = renderHook(() => usePendingCreate<{ name: string }>(), {
      wrapper: wrapper(null),
    });

    const createFn = vi.fn().mockResolvedValue({ id: 'x' });
    let id: string | null = 'sentinel';
    await act(async () => {
      id = await result.current.lazyCreate(createFn);
    });

    expect(createFn).not.toHaveBeenCalled();
    expect(id).toBeNull();
  });

  it('lazyCreate ref guard prevents double-invocation on concurrent calls', async () => {
    const { result } = renderHook(() => usePendingCreate<{ name: string }>(), {
      wrapper: wrapper({ pendingCreate: { name: 'test' } }),
    });

    const createFn = vi.fn().mockResolvedValue({ id: 'new-id' });
    await act(async () => {
      // Call twice concurrently — second call must be a no-op
      await Promise.all([
        result.current.lazyCreate(createFn),
        result.current.lazyCreate(createFn),
      ]);
    });

    expect(createFn).toHaveBeenCalledTimes(1);
  });
});
