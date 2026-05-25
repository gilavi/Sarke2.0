import { useCallback, useState } from 'react';

/**
 * Tiny step state machine for wizard flows. Tracks the active step index and the
 * direction of the last move (for the slide animation in WizardFrame).
 *
 * Usage:
 *   const flow = useWizardFlow(STEPS.length);
 *   <WizardFrame stepKey={flow.stepIndex} direction={flow.direction}
 *     onBack={flow.goPrev} onNext={flow.isLast ? submit : flow.goNext} ... />
 */
export function useWizardFlow(totalSteps: number, initial = 0) {
  const [stepIndex, setStepIndex] = useState(initial);
  const [direction, setDirection] = useState(1);

  const goNext = useCallback(() => {
    setDirection(1);
    setStepIndex((i) => Math.min(totalSteps - 1, i + 1));
  }, [totalSteps]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const setStep = useCallback((next: number, dir: number = next > stepIndex ? 1 : -1) => {
    setDirection(dir);
    setStepIndex(next);
  }, [stepIndex]);

  return {
    stepIndex,
    direction,
    goNext,
    goPrev,
    setStep,
    isFirst: stepIndex === 0,
    isLast: stepIndex === totalSteps - 1,
  };
}
