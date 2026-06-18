import { useCallback, useRef } from 'react';
import type { LayoutChangeEvent } from 'react-native';

/** Anything with a `scrollTo` method — `ScrollView` or `KeyboardAwareScrollView`. */
interface Scrollable {
  scrollTo: (opts: { x?: number; y?: number; animated?: boolean }) => void;
}

export interface ScrollToError {
  /** Attach to the scroll container: `<ScrollView ref={scrollRef}>` (or via `KeyboardSafeArea`'s `scrollRef`). */
  scrollRef: React.RefObject<Scrollable | null>;
  /**
   * Attach to each field's wrapper: `<View onLayout={registerField('location')}>`.
   * Records the field's y-offset (relative to the scroll content) so we can jump
   * to it later. Re-registers on every layout, so it stays correct as the form
   * grows/shrinks.
   */
  registerField: (key: string) => (e: LayoutChangeEvent) => void;
  /**
   * Scrolls to the topmost field present in `errorKeys`. Pass the ordered list of
   * keys that are currently invalid; unknown/unregistered keys are ignored. No-op
   * when nothing matches (e.g. all errors are above the fold already).
   */
  scrollToFirstError: (errorKeys: string[]) => void;
}

/**
 * Best-effort "scroll to the first invalid field" helper for multi-field form
 * screens that already own a `ScrollView`. Pairs with `useSubmitGuard`: pass
 * `scrollToFirstError` as the `onInvalid` callback so a failed press both reveals
 * the red fields and brings the first one into view.
 *
 * Note: offsets come from each field's `onLayout` y, which is relative to its
 * immediate parent. This is accurate when the registered fields are laid out in a
 * single content column inside the ScrollView (the common case here). Screens
 * without a ScrollView simply don't use this hook — the red fields + haptic still
 * fire from `useSubmitGuard`.
 */
export function useScrollToError(): ScrollToError {
  const scrollRef = useRef<Scrollable | null>(null);
  const offsets = useRef<Record<string, number>>({});

  const registerField = useCallback(
    (key: string) => (e: LayoutChangeEvent) => {
      offsets.current[key] = e.nativeEvent.layout.y;
    },
    [],
  );

  const scrollToFirstError = useCallback((errorKeys: string[]) => {
    const ys = errorKeys
      .map((k) => offsets.current[k])
      .filter((y): y is number => typeof y === 'number');
    if (ys.length === 0) return;
    const target = Math.min(...ys);
    scrollRef.current?.scrollTo({ y: Math.max(0, target - 24), animated: true });
  }, []);

  return { scrollRef, registerField, scrollToFirstError };
}
