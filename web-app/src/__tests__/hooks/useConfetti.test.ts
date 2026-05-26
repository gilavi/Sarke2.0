import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
import confetti from 'canvas-confetti';
import { useConfetti } from '@/hooks/useConfetti';

const originalMatchMedia = window.matchMedia;

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

describe('useConfetti', () => {
  it('fires confetti when reduced-motion is not preferred', () => {
    const { result } = renderHook(() => useConfetti());
    act(() => result.current());
    expect(confetti).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the user prefers reduced motion', () => {
    window.matchMedia = (() => ({ matches: true })) as unknown as typeof window.matchMedia;
    const { result } = renderHook(() => useConfetti());
    act(() => result.current());
    expect(confetti).not.toHaveBeenCalled();
  });
});
