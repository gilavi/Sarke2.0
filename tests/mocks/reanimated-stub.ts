/**
 * Test-env stand-in for `react-native-reanimated`.
 *
 * reanimated v4 hangs on import under jsdom/node (its worklet/native graph
 * never settles), and a `vi.mock` factory can't prevent vite from resolving the
 * real module's dependency graph first. So we alias the package to this inert
 * stub in vitest.config.ts (the same approach the config uses for
 * `react-native` → `react-native-web`). Components that only need the animation
 * primitives to be callable (StatusChip, ChecklistItemRow) render fine against
 * these pass-through implementations.
 */
const identity = <T,>(v: T): T => v;

const Animated = {
  createAnimatedComponent: <T,>(Component: T): T => Component,
  View: 'div',
  Text: 'span',
  ScrollView: 'div',
};

export default Animated;
export const useSharedValue = <T,>(value: T) => ({ value });
export const useAnimatedStyle = () => ({});
export const useDerivedValue = <T,>(fn: () => T) => ({ value: fn() });
export const withTiming = identity;
export const withSpring = identity;
export const withDelay = <T,>(_delay: number, value: T) => value;
export const withSequence = (...steps: unknown[]) => steps[steps.length - 1];
export const withRepeat = <T,>(value: T) => value;
export const runOnJS = <A extends unknown[]>(fn: (...args: A) => unknown) => fn;
export const cancelAnimation = () => {};
// Layout-animation builders (LinearTransition / FadeIn / FadeOut). Real ones
// expose chainable static configurators (`.duration()`, `.springify()`, …); the
// stub returns a self-referential chain so any call sequence resolves to an
// inert object that the pass-through Animated.View simply ignores.
const layoutBuilder = () => {
  const chain: Record<string, unknown> = {};
  const ret = () => chain;
  for (const m of ['duration', 'delay', 'springify', 'damping', 'stiffness', 'easing', 'withInitialValues', 'build']) {
    chain[m] = ret;
  }
  return chain;
};
export const LinearTransition = layoutBuilder();
export const FadeIn = layoutBuilder();
export const FadeOut = layoutBuilder();
export const Easing = {
  inOut: () => () => 0,
  out: () => () => 0,
  in: () => () => 0,
  ease: () => 0,
  linear: () => 0,
  bezier: () => () => 0,
};
