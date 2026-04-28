import {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

interface Options {
  /** Header height when scrollY === 0. */
  fullHeight?: number;
  /** Header height after the user has scrolled past `scrollRange` px. */
  compactHeight?: number;
  /** Scroll distance over which the transition completes (Airbnb-style: ~100px). */
  scrollRange?: number;
}

/**
 * Wires a scroll position to a set of animated styles for an Airbnb-style
 * shrinking header.
 *
 * - containerStyle: animates the header's outer height fullHeight → compactHeight.
 * - heroStyle: fades + lifts the tall hero content out as the user scrolls.
 * - compactStyle: fades the compact title in once the hero is mostly gone.
 * - backdropStyle: fades the blurred backdrop in (apply on a BlurView/View
 *   placed behind the header content).
 *
 * Attach `scrollHandler` to an `Animated.ScrollView` / `Animated.FlatList`
 * via `onScroll={scrollHandler}` and set `scrollEventThrottle={16}`.
 */
export function useScrollHeader({
  fullHeight = 110,
  compactHeight = 56,
  scrollRange = 100,
}: Options = {}) {
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const containerStyle = useAnimatedStyle(() => ({
    height: interpolate(
      scrollY.value,
      [0, scrollRange],
      [fullHeight, compactHeight],
      Extrapolation.CLAMP
    ),
  }));

  const heroStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [0, scrollRange * 0.6],
      [1, 0],
      Extrapolation.CLAMP
    ),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [0, scrollRange],
          [0, -10],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));

  const compactStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [scrollRange * 0.55, scrollRange],
      [0, 1],
      Extrapolation.CLAMP
    ),
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [-scrollRange, 0, scrollRange],
      [1, 0, 1],
      Extrapolation.CLAMP
    ),
  }));

  return {
    scrollY,
    scrollHandler,
    containerStyle,
    heroStyle,
    compactStyle,
    backdropStyle,
    fullHeight,
    compactHeight,
  };
}
