import { useEffect, useState } from 'react';

/**
 * Sequences the big-buttons ⇄ compact-chips morph into discrete, one-at-a-time
 * stages instead of animating every property at once (which reads as the
 * buttons "rearranging like crazy"). Each stage changes a single dimension, and
 * the next stage only fires once the current stage's animation has finished, so
 * the phases flow into each other instead of piling up or stuttering.
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

/**
 * Phase durations (ms). The consuming component must animate with the SAME
 * values so each `hold` lines up with the animation it's waiting on.
 */
export const MORPH_MS = {
  /** Icon fade in/out. */
  icon: 150,
  /** A single layout change (shrink, or rearrange). */
  layout: 240,
};

export function useMorphStage(compact: boolean, reduceMotion: boolean) {
  const target: MorphStage = compact ? 3 : 0;
  const [stage, setStage] = useState<MorphStage>(target);

  useEffect(() => {
    if (reduceMotion) {
      setStage(target);
      return;
    }
    if (stage === target) return;
    const movingUp = target > stage;
    // Hold = how long the animation that brought us to `stage` needs to settle
    // before the next phase starts. The first hop off the starting stage fires
    // almost immediately so the morph doesn't feel laggy.
    const hold = movingUp
      ? stage === 0
        ? 20
        : stage === 1
          ? MORPH_MS.icon
          : MORPH_MS.layout
      : stage === 3
        ? 20
        : MORPH_MS.layout;
    const id = setTimeout(() => {
      setStage(s => (s < target ? ((s + 1) as MorphStage) : ((s - 1) as MorphStage)));
    }, hold);
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
