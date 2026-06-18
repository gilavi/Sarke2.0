/**
 * Unit tests for `useSubmitGuard` — the "enabled button + on-press field error"
 * gate. Verifies the attempted flag, the haptic side effect, and the
 * valid/invalid branching of `guard`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const validationError = vi.fn();
vi.mock('../../lib/haptics', () => ({
  haptic: { validationError: () => validationError() },
}));

import { useSubmitGuard } from '../../hooks/useSubmitGuard';

beforeEach(() => validationError.mockClear());

describe('useSubmitGuard', () => {
  it('starts with attempted=false', () => {
    const { result } = renderHook(() => useSubmitGuard());
    expect(result.current.attempted).toBe(false);
  });

  it('invalid guard reveals errors, fires haptic, calls onInvalid, skips onValid', () => {
    const { result } = renderHook(() => useSubmitGuard());
    const onValid = vi.fn();
    const onInvalid = vi.fn();

    act(() => result.current.guard(false, onValid, onInvalid));

    expect(result.current.attempted).toBe(true);
    expect(validationError).toHaveBeenCalledTimes(1);
    expect(onInvalid).toHaveBeenCalledTimes(1);
    expect(onValid).not.toHaveBeenCalled();
  });

  it('invalid guard works without an onInvalid callback', () => {
    const { result } = renderHook(() => useSubmitGuard());
    expect(() => act(() => result.current.guard(false, vi.fn()))).not.toThrow();
    expect(result.current.attempted).toBe(true);
  });

  it('valid guard runs onValid, clears attempted, fires no haptic', () => {
    const { result } = renderHook(() => useSubmitGuard());
    const onValid = vi.fn();

    // First fail so attempted flips true…
    act(() => result.current.guard(false, vi.fn()));
    expect(result.current.attempted).toBe(true);

    // …then a valid press clears it and runs the action.
    act(() => result.current.guard(true, onValid));
    expect(onValid).toHaveBeenCalledTimes(1);
    expect(result.current.attempted).toBe(false);
    expect(validationError).toHaveBeenCalledTimes(1); // only the earlier invalid press
  });

  it('markAttempted forces the flag on; reset clears it', () => {
    const { result } = renderHook(() => useSubmitGuard());

    act(() => result.current.markAttempted());
    expect(result.current.attempted).toBe(true);

    act(() => result.current.reset());
    expect(result.current.attempted).toBe(false);
  });
});
