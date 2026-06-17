// SVG arch + scroll animation for the project detail screen.
//
// The arch is rendered between the map hero (220 px tall) and the
// content sheet beneath it. It morphs in two dimensions:
//
//   - on mount: flat → full arch (Reanimated spring on `archMountProgress`)
//   - on scroll: pull-down deepens the arch, pull-up flattens it
//     (`scrollHandler` writes `archScrollDelta`)
//
// The logo above the sheet uses the same mount progress, scaling in
// 160 ms after the arch starts curving.
//
// The hook returns:
//   archProps - animated SVG path d (rebound to `<ProjectArchSvg>`)
//   logoStyle - `Animated.View` style for the logo container
//   scrollHandler - bind to `Reanimated.ScrollView.onScroll`
//   mountArch - call when initial data has loaded so the animation kicks off

import { useEffect } from 'react';
import { Dimensions } from 'react-native';
import { Path, Svg } from 'react-native-svg';
import Reanimated, {
  interpolate,
  useAnimatedProps,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

const SCREEN_W = Dimensions.get('window').width;
const SVG_H = 80;      // total SVG element height
const SVG_EDGE_Y = 68; // y within SVG where arch edges sit (stays fixed)

const AnimatedPath = Reanimated.createAnimatedComponent(Path);

export function useArchAnimation(loaded: boolean) {
  // archMountProgress: 0→1 on load (arch curves in from flat)
  // archScrollDelta: scroll-driven offset (negative = deeper arch on pull-down)
  const archMountProgress = useSharedValue(0);
  const archScrollDelta = useSharedValue(0);
  const logoProgress = useSharedValue(0);

  // peakY: controls the SVG bezier control point.
  //   SVG_EDGE_Y = flat (no curve), 0 = full arch, negative = extra deep
  const archPeakY = useDerivedValue(() => {
    'worklet';
    const mount = interpolate(archMountProgress.value, [0, 1], [SVG_EDGE_Y, 0]);
    return mount + archScrollDelta.value;
  });

  const archProps = useAnimatedProps(() => {
    'worklet';
    const p = archPeakY.value;
    const W = SCREEN_W;
    return {
      d: `M0,${SVG_EDGE_Y} Q${W / 2},${p.toFixed(1)} ${W},${SVG_EDGE_Y} L${W},${SVG_H} L0,${SVG_H} Z`,
    };
  });

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoProgress.value,
    transform: [{ scale: interpolate(logoProgress.value, [0, 1], [0.6, 1]) }],
  }));

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      archScrollDelta.value = interpolate(
        event.contentOffset.y,
        [-80, 0, 100],
        [-22, 0, SVG_EDGE_Y],
        'clamp' as any,
      );
    },
  });

  useEffect(() => {
    if (!loaded) return;
    archMountProgress.value = withSpring(1, { damping: 16, stiffness: 120 });
    logoProgress.value = withDelay(160, withSpring(1, { damping: 12, stiffness: 150 }));
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  return { archProps, logoStyle, scrollHandler };
}

export function ProjectArchSvg({
  archProps,
  fill,
}: {
  archProps: ReturnType<typeof useAnimatedProps>;
  fill: string;
}) {
  return (
    <Svg
      width={SCREEN_W}
      height={SVG_H}
      style={{ position: 'absolute', bottom: 0, left: 0 }}
      pointerEvents="none"
    >
      <AnimatedPath animatedProps={archProps} fill={fill} />
    </Svg>
  );
}
