// AnnotatorColorBar.tsx — floating color palette for PhotoAnnotator.
//
// A rounded pill that floats over the BOTTOM-CENTER of the photo canvas, shown
// only while a stroke tool is active. It lives in the canvas overlay layer (a
// sibling of the captured photo View), NOT in the footer and NOT inside the
// captureRef target — so it never bakes into the saved image and the footer can
// stay a single tools+save row.
//
// Fades/slides in on mount (native-driven) to match the editor references.

import { useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { a11y } from '../../lib/accessibility';
import { haptic } from '../../lib/haptics';
import { COLORS } from './schema';

interface AnnotatorColorBarProps {
  color: string;
  onColor: (c: string) => void;
  theme: any;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

export function AnnotatorColorBar({ color, onColor, theme, t }: AnnotatorColorBarProps) {
  const styles = useMemo(() => getStyles(theme), [theme]);
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 160, useNativeDriver: true }).start();
  }, [anim]);

  return (
    <Animated.View
      style={[
        styles.bar,
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] },
      ]}
    >
      {COLORS.map((c) => {
        const active = color === c.value;
        return (
          <Pressable
            key={c.value}
            onPress={() => {
              onColor(c.value);
              haptic.light();
            }}
            hitSlop={6}
            style={[
              styles.swatch,
              { backgroundColor: c.value },
              c.value === '#FFFFFF' && styles.swatchLite,
              active && styles.swatchActive,
            ]}
            {...a11y(`${t('photoAnnotator.colorA11yPrefix')}${c.label}`, t('photoAnnotator.colorA11yHint'), 'button')}
          />
        );
      })}
    </Animated.View>
  );
}

const getStyles = (theme: any) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      paddingHorizontal: 18,
      paddingVertical: 11,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.hairline,
      ...theme.shadows.lg,
    },
    swatch: { width: 28, height: 28, borderRadius: 14 },
    swatchLite: { borderWidth: 1, borderColor: theme.colors.border },
    swatchActive: {
      transform: [{ scale: 1.15 }],
      borderWidth: 2,
      borderColor: theme.colors.ink,
    },
  });
