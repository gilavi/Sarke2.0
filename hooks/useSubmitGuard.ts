import { useCallback, useState } from 'react';
import { haptic } from '../lib/haptics';

export interface SubmitGuard {
  /**
   * Flips to `true` the first time the user presses the gated button while the
   * form is invalid, and back to `false` once a valid press goes through (or via
   * `reset`). Fields read this to decide whether to reveal their error state:
   * `error={attempted && isEmpty ? 'სავალდებულო ველი' : undefined}`.
   */
  attempted: boolean;
  /**
   * Wire this to the (now always-enabled) forward/submit button's `onPress`.
   *
   * - If `isValid` is false: reveals errors (`attempted = true`), fires the
   *   validation-error haptic, and calls `onInvalid` (e.g. scroll to first error).
   *   The action does NOT run.
   * - If `isValid` is true: clears `attempted` and runs `onValid`.
   */
  guard: (isValid: boolean, onValid: () => void, onInvalid?: () => void) => void;
  /** Manually clear the attempted flag — call when moving to another step. */
  reset: () => void;
  /** Force the attempted flag on (rarely needed; `guard` already does this). */
  markAttempted: () => void;
}

/**
 * Generalizes the "enabled button + on-press field error" pattern used across
 * every flow (the precedent lives in `ConclusionStep`'s `interacted` flag and
 * `AddRemoteSignerModal`'s `*Touched` flags).
 *
 * Instead of `disabled={!canAdvance}`, the button stays pressable and routes its
 * press through `guard(canAdvance, goNext)`. When invalid, the empty required
 * fields light up red (driven by `attempted`) and the user feels an error haptic,
 * so they understand *what* is mandatory rather than facing a dead button.
 *
 * Side effects: fires `haptic.validationError()` on an invalid press.
 */
export function useSubmitGuard(): SubmitGuard {
  const [attempted, setAttempted] = useState(false);

  const reset = useCallback(() => setAttempted(false), []);
  const markAttempted = useCallback(() => setAttempted(true), []);

  const guard = useCallback(
    (isValid: boolean, onValid: () => void, onInvalid?: () => void) => {
      if (!isValid) {
        setAttempted(true);
        haptic.validationError();
        onInvalid?.();
        return;
      }
      setAttempted(false);
      onValid();
    },
    [],
  );

  return { attempted, guard, reset, markAttempted };
}
