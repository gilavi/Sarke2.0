// Content transition for "chip / tab" secondary navigation. When the active
// sub-item changes (fall-protection device N1→N2, harness, briefing signer …),
// the outgoing body fades out while the incoming body slides+fades in — so a
// chip tap reads as a real navigation instead of an instant, unnoticed swap
// (the exact complaint this was built to fix). Direction is inferred from the
// numeric key delta; `mode="fade"` and reduce-motion collapse it to a plain
// cross-fade.
//
// Sibling of `components/wizard/WizardStepTransition` — that one animates the
// TOP-LEVEL wizard steps and is caller-driven (parent passes `direction`). This
// one animates the sub-navigation *inside* a single step and tracks its own
// direction, so call sites only pass the active key. See docs/primitives.md.
import { type ReactNode, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, withTiming } from 'react-native-reanimated';
import { useAccessibilitySettings } from '../../lib/accessibility';

// Deliberately a touch longer than a press tween so the swap is *perceptible*
// (the whole point — the old strip felt instant). Still well under the
// step-transition's 250ms so sub-nav feels lighter than a full step change.
const DURATION = 260;
const OFFSET = 28;
const easing = Easing.out(Easing.cubic);

// Only the *entering* body is directional (it's the element the eye tracks, and
// its prop is always read from the current render → correct direction). The
// *exiting* body is a direction-agnostic fade: a removed element keeps the
// `exiting` prop from its previous render, so a directional exit would point the
// wrong way on reverse navigation. A fade-out sidesteps that entirely.
const slideInRight = () => {
  'worklet';
  return {
    initialValues: { transform: [{ translateX: OFFSET }], opacity: 0 },
    animations: {
      transform: [{ translateX: withTiming(0, { duration: DURATION, easing }) }],
      opacity: withTiming(1, { duration: DURATION, easing }),
    },
  };
};

const slideInLeft = () => {
  'worklet';
  return {
    initialValues: { transform: [{ translateX: -OFFSET }], opacity: 0 },
    animations: {
      transform: [{ translateX: withTiming(0, { duration: DURATION, easing }) }],
      opacity: withTiming(1, { duration: DURATION, easing }),
    },
  };
};

const fadeIn = () => {
  'worklet';
  return {
    initialValues: { opacity: 0 },
    animations: { opacity: withTiming(1, { duration: DURATION, easing }) },
  };
};

const fadeOut = () => {
  'worklet';
  return {
    initialValues: { opacity: 1 },
    animations: { opacity: withTiming(0, { duration: DURATION, easing }) },
  };
};

export interface ChipSwitchTransitionProps {
  /** The active sub-item key. A change re-keys the body and animates the swap. */
  activeKey: string | number;
  /** 'slide' (default) for question/checklist/conclusion bodies; 'fade' for
   *  signature canvases and other surfaces a horizontal shift would disrupt. */
  mode?: 'slide' | 'fade';
  children: ReactNode;
}

/**
 * Wrap the per-sub-item body of a chip-navigated step. Re-keys on `activeKey` so
 * the body cross-fades/slides on every chip switch. The very first mount does
 * NOT animate (so it doesn't double up with an outer step transition). Honours
 * reduce-motion (→ cross-fade).
 */
export function ChipSwitchTransition({ activeKey, mode = 'slide', children }: ChipSwitchTransitionProps) {
  const { reduceMotion } = useAccessibilitySettings();

  // Suppress the entrance on the initial mount (set true only after first commit)
  // so this layers cleanly under WizardStepTransition when a step first appears.
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; }, []);

  // Previous key → travel direction. StrictMode is not enabled in this app, so
  // reading/writing this ref during render is safe (single render per commit).
  const prevKey = useRef(activeKey);
  const goingBack =
    typeof activeKey === 'number' &&
    typeof prevKey.current === 'number' &&
    activeKey < prevKey.current;
  prevKey.current = activeKey;

  const fade = mode === 'fade' || reduceMotion;
  const entering = !mounted.current
    ? undefined
    : fade ? fadeIn : goingBack ? slideInLeft : slideInRight;
  const exiting = !mounted.current ? undefined : fadeOut;

  return (
    <View style={styles.wrap}>
      <Animated.View key={activeKey} entering={entering} exiting={exiting} style={styles.inner}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  inner: { flex: 1 },
});
