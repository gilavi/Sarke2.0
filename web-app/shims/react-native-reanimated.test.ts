// Self-contained stub for react-native-reanimated in Vitest's jsdom environment.
// The real package and its ./mock both import native TurboModules that don't
// exist in jsdom. This file exports the minimal surface area consumed by the
// shared ../components/primitives code (useAnimatedStyle, withTiming, etc.)
// so tests render without animated behaviour — purely static DOM.
import React from 'react';

const passThrough = (value: unknown) => value;
const noOp = () => {};

export const useSharedValue = <T>(initial: T) => ({ value: initial });
// Return empty object — fn() may return RN-format styles that crash DOM rendering.
export const useAnimatedStyle = (_fn: () => object) => ({});
export const useAnimatedRef = () => ({ current: null });
export const useAnimatedScrollHandler = () => noOp;
export const useDerivedValue = <T>(fn: () => T) => ({ value: fn() });
export const useAnimatedReaction = noOp;

export const withTiming = passThrough;
export const withSpring = passThrough;
export const withDelay = passThrough;
export const withSequence = passThrough;
export const withRepeat = passThrough;
export const withDecay = passThrough;
export const cancelAnimation = noOp;
export const runOnJS = <T extends (...args: unknown[]) => unknown>(fn: T) => fn;
export const runOnUI = <T extends (...args: unknown[]) => unknown>(fn: T) => fn;

export const interpolate = (value: number, input: number[], output: number[]) => {
  const ratio = (value - input[0]) / (input[input.length - 1] - input[0]);
  return output[0] + ratio * (output[output.length - 1] - output[0]);
};
export const Extrapolation = { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' };
export const Easing = {
  linear: passThrough,
  ease: passThrough,
  in: passThrough,
  out: passThrough,
  inOut: passThrough,
  elastic: passThrough,
  bounce: passThrough,
  back: passThrough,
  bezier: () => passThrough,
};

function flattenStyle(style: unknown): React.CSSProperties {
  if (!style || style === true) return {};
  if (Array.isArray(style)) return style.reduce<React.CSSProperties>((acc, s) => ({ ...acc, ...flattenStyle(s) }), {});
  if (typeof style === 'object') return { ...style as object };
  return {};
}

type RNProps = { style?: unknown; [k: string]: unknown };

// Animated components — pass-through to plain DOM elements with style flattening.
export const Animated = {
  View: React.forwardRef(({ style, ...props }: RNProps, ref: React.Ref<HTMLDivElement>) =>
    React.createElement('div', { ...props, style: flattenStyle(style), ref })
  ),
  Text: React.forwardRef(({ style, ...props }: RNProps, ref: React.Ref<HTMLSpanElement>) =>
    React.createElement('span', { ...props, style: flattenStyle(style), ref })
  ),
  ScrollView: React.forwardRef(({ style, ...props }: RNProps, ref: React.Ref<HTMLDivElement>) =>
    React.createElement('div', { ...props, style: flattenStyle(style), ref })
  ),
  Image: ({ style, ...props }: RNProps) => React.createElement('img', { ...props, style: flattenStyle(style) }),
  createAnimatedComponent: <P extends object>(Component: React.ComponentType<P>) => Component,
  FlatList: ({ style, ...props }: RNProps) => React.createElement('div', { ...props, style: flattenStyle(style) }),
};

export default Animated;

export const createAnimatedComponent = Animated.createAnimatedComponent;
export const FadeIn = {};
export const FadeOut = {};
export const FadeInDown = {};
export const FadeInUp = {};
export const FadeOutDown = {};
export const FadeOutUp = {};
export const SlideInRight = {};
export const SlideInLeft = {};
export const SlideOutRight = {};
export const SlideOutLeft = {};
export const ZoomIn = {};
export const ZoomOut = {};
export const Layout = {};
export const LinearTransition = {};
export const JumpingTransition = {};
export const CurvedTransition = {};
export const EntryExitTransition = {};
export const SequencedTransition = {};
