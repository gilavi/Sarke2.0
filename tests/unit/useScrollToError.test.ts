/**
 * Unit tests for `useScrollToError` — records each field's y-offset via
 * onLayout and scrolls to the topmost invalid field. We inject a fake scroll
 * target into `scrollRef.current` and assert the `scrollTo` math + no-ops.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { LayoutChangeEvent } from 'react-native';
import { useScrollToError } from '../../hooks/useScrollToError';

function layoutAt(y: number): LayoutChangeEvent {
  return { nativeEvent: { layout: { x: 0, y, width: 100, height: 40 } } } as LayoutChangeEvent;
}

function setup() {
  const { result } = renderHook(() => useScrollToError());
  const scrollTo = vi.fn();
  // Inject a fake ScrollView handle.
  (result.current.scrollRef as { current: unknown }).current = { scrollTo };
  return { api: result.current, scrollTo };
}

describe('useScrollToError', () => {
  it('scrolls to the topmost (min-y) invalid field, clamped to ≥0 with a 24px margin', () => {
    const { api, scrollTo } = setup();
    api.registerField('location')(layoutAt(300));
    api.registerField('date')(layoutAt(120));
    api.registerField('crew')(layoutAt(500));

    api.scrollToFirstError(['location', 'date', 'crew']);

    // min(300,120,500) = 120 → 120-24 = 96
    expect(scrollTo).toHaveBeenCalledWith({ y: 96, animated: true });
  });

  it('clamps the target to 0 when the topmost field is within 24px of the top', () => {
    const { api, scrollTo } = setup();
    api.registerField('a')(layoutAt(10));
    api.scrollToFirstError(['a']);
    expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: true });
  });

  it('ignores unregistered keys', () => {
    const { api, scrollTo } = setup();
    api.registerField('known')(layoutAt(200));
    api.scrollToFirstError(['unknown', 'known', 'missing']);
    expect(scrollTo).toHaveBeenCalledWith({ y: 176, animated: true });
  });

  it('is a no-op when no error keys match a registered field', () => {
    const { api, scrollTo } = setup();
    api.registerField('known')(layoutAt(200));
    api.scrollToFirstError(['nope']);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('is a no-op for an empty error list', () => {
    const { api, scrollTo } = setup();
    api.scrollToFirstError([]);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('re-registering a field updates its recorded offset', () => {
    const { api, scrollTo } = setup();
    api.registerField('a')(layoutAt(400));
    api.registerField('a')(layoutAt(60)); // form grew/shrank
    api.scrollToFirstError(['a']);
    expect(scrollTo).toHaveBeenCalledWith({ y: 36, animated: true });
  });
});
