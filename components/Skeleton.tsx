// Skeleton loaders with a shared shimmer animation.
//
// Uses RN's built-in `Animated` + `useNativeDriver: true` instead of
// Reanimated. The app previously hit a bad freeze from a Reanimated 4
// worklet not firing (Modal backdrop stayed blocking all touches); native
// Animated is boring, reliable, and more than fast enough for a dim→bright
// loop on a pill shape.
//
// Layout components below mirror the shape of real screens so the content
// stays anchored when skeletons swap out — no layout shift.

import { ReactNode, useEffect, useRef , useMemo} from 'react';
import { Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../lib/theme';


// Re-export the new shimmer skeleton for gradual migration
export { ShimmerSkeleton } from './animations/ShimmerSkeleton';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number | `${number}%`;
  radius?: number;
  style?: ViewStyle | ViewStyle[];
}

// Single pulsing pill. One animation driver per Skeleton instance keeps
// them in sync at the phase level (all started at mount) but avoids an
// app-wide shared value that would pin a component on the React tree.
export function Skeleton({ width, height = 14, radius = 8, style }: SkeletonProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => getskStyles(theme), [theme]);

  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0.9],
  });

  return (
    <Animated.View
      style={[
        // Cast through unknown so `%` strings satisfy the number-typed props;
        // RN accepts both at runtime.
        {
          width: width as unknown as number,
          height: height as unknown as number,
          borderRadius: radius,
          backgroundColor: theme.colors.subtleSurface,
          opacity,
        },
        style,
      ]}
    />
  );
}

// ── Layout helpers ──────────────────────────────────────────────────────────
//
// Each one matches a common card/row/screen pattern in the app so swapping
// from skeleton → real content doesn't cause the screen to pop.

export function SkeletonCard({ children, style }: { children?: ReactNode; style?: ViewStyle }) {
  const { theme } = useTheme();
  const skStyles = useMemo(() => getskStyles(theme), [theme]);
  return (
    <View style={[skStyles.card, style]}>
      {children ?? (
        <View style={{ gap: 10 }}>
          <Skeleton width={90} height={10} />
          <Skeleton width={'70%'} height={18} />
          <Skeleton width={'50%'} height={12} />
        </View>
      )}
    </View>
  );
}

export function SkeletonRow({ style }: { style?: ViewStyle }) {
  const { theme } = useTheme();
  const skStyles = useMemo(() => getskStyles(theme), [theme]);
  return (
    <View style={[skStyles.row, style]}>
      <Skeleton width={36} height={36} radius={18} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton width={'60%'} height={14} />
        <Skeleton width={'35%'} height={10} />
      </View>
    </View>
  );
}

// Matches the flat list of rows inside a card (like inspection detail).
export function SkeletonListCard({ rows = 3 }: { rows?: number }) {
  const { theme } = useTheme();
  const skStyles = useMemo(() => getskStyles(theme), [theme]);

  return (
    <View style={skStyles.card}>
      <Skeleton width={100} height={10} />
      <View style={{ gap: 10, marginTop: 14 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonRow key={i} style={{ backgroundColor: theme.colors.subtleSurface, borderRadius: 10 }} />
        ))}
      </View>
    </View>
  );
}

// Big rectangle for PDF / image previews.
export function SkeletonPreview() {
  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Skeleton width={'100%'} height={220} radius={12} />
      <Skeleton width={'80%'} height={14} />
      <Skeleton width={'60%'} height={14} />
      <Skeleton width={'90%'} height={14} />
    </View>
  );
}

// Step-form wizard skeleton (question → options) — mirrors QuestionStep.
export function SkeletonWizard() {
  return (
    <View style={{ padding: 16, gap: 24 }}>
      {/* Progress bar placeholder — subtle, just fills the top strip */}
      <Skeleton width={'100%'} height={6} radius={3} />
      {/* Question title */}
      <View style={{ gap: 10 }}>
        <Skeleton width={'85%'} height={20} />
        <Skeleton width={'55%'} height={20} />
      </View>
      {/* Two answer options */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Skeleton width={'48%'} height={54} radius={14} />
        <Skeleton width={'48%'} height={54} radius={14} />
      </View>
      {/* Photos row */}
      <View style={{ gap: 8 }}>
        <Skeleton width={110} height={12} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Skeleton width={120} height={120} radius={12} />
          <Skeleton width={120} height={120} radius={12} />
        </View>
      </View>
      {/* Notes */}
      <View style={{ gap: 8 }}>
        <Skeleton width={80} height={10} />
        <Skeleton width={'100%'} height={100} radius={12} />
      </View>
    </View>
  );
}

function getskStyles(theme: any) {
  return StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
  },
});
}
