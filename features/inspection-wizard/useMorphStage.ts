import { useEffect, useState } from 'react';

/**
 * Sequences the big-buttons ⇄ compact-chips morph into discrete, one-at-a-time
 * stages instead of animating every property at once (which reads as the
 * buttons "rearranging like crazy"). Each stage changes a single dimension, so
 * the per-element `LinearTransition` only ever animates one thing at a time.
 *
 * Stages (collapsing to compact walks 0→3; expanding walks 3→0, so the reverse
 * plays the steps back in order — rearrange, grow, then icons return):
 *   0  big   · column · icons
 *   1  big   · column · no icons   (icons faded out first)
 *   2  chip  · column · no icons   (shrink + push up)
 *   3  chip  · row    · no icons   (rearrange last)
 *
 * `reduceMotion` jumps straight to the target with no intermediate stages.
 */
export type MorphStage = 0 | 1 | 2 | 3;

/** Gap between stages — slightly longer than the layout transition so each settles before the next starts. */
const STEP_MS = 170;

export function useMorphStage(compact: boolean, reduceMotion: boolean) {
  const target: MorphStage = compact ? 3 : 0;
  const [stage, setStage] = useState<MorphStage>(target);

  useEffect(() => {
    if (reduceMotion) {
      setStage(target);
      return;
    }
    if (stage === target) return;
    const id = setTimeout(() => {
      setStage(s => (s < target ? ((s + 1) as MorphStage) : ((s - 1) as MorphStage)));
    }, STEP_MS);
    return () => clearTimeout(id);
  }, [stage, target, reduceMotion]);

  return {
    stage,
    /** Show the per-status icon (big form only). */
    showIcon: stage === 0,
    /** 'big' = full-width stacked option, 'chip' = compact side-by-side. */
    sized: stage >= 2 ? ('chip' as const) : ('big' as const),
    /** Lay the buttons out in a row (final compact stage). */
    row: stage === 3,
    /** Fully expanded — safe to show the secondary footer actions (Next / none). */
    expanded: stage === 0,
  };
}
