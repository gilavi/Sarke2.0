// AnnotatorSizeBar.tsx — floating brush-size picker for PhotoAnnotator.
//
// A vertical rounded pill that floats over the RIGHT edge of the photo canvas,
// shown only while a stroke tool is active. Like the color bar it lives in the
// canvas overlay layer (outside the captureRef target), so it never bakes into the
// saved image.
//
// Three discrete presets (SIZE_PRESETS) replace the old drag slider: the slider
// re-measured its track on every layout pass and the thumb jumped. Tapping a fixed
// dot can't jitter. The dot previews the current draw color at a tap-friendly size
// (not the literal stroke px, which is too small to aim at).

import { useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { a11y } from '../../lib/accessibility';
import { haptic } from '../../lib/haptics';
import { SIZE_PRESETS } from './schema';

interface AnnotatorSizeBarProps {
  value: number;
  onChange: (v: number) => void;
  /** Current draw color — previews on the active dot. */
  color: string;
  theme: any;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

// Visual dot diameter per preset index — purely a tap target, decoupled from the
// (smaller) literal stroke width so the three sizes read clearly.
const DOT = [9, 14, 19];

export function AnnotatorSizeBar({ value, onChange, color, theme, t }: AnnotatorSizeBarProps) {
  const styles = useMemo(() => getStyles(theme), [theme]);
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 160, useNativeDriver: true }).start();
  }, [anim]);

  return (
    <Animated.View
      style={[
        styles.bar,
        { opacity: anim, transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] },
      ]}
    >
      {SIZE_PRESETS.map((w, i) => {
        const active = value === w;
        const d = DOT[i];
        return (
          <Pressable
            key={w}
            onPress={() => {
              onChange(w);
              haptic.light();
            }}
            hitSlop={4}
            style={[styles.cell, active && styles.cellActive]}
            {...a11y(`${t('photoAnnotator.widthA11yPrefix')}${w}px`, t('photoAnnotator.widthA11yHint'), 'button')}
          >
            <View
              style={{
                width: d,
                height: d,
                borderRadius: d / 2,
                backgroundColor: active ? color : theme.colors.inkFaint,
                borderWidth: color === '#FFFFFF' && active ? 1 : 0,
                borderColor: theme.colors.border,
              }}
            />
          </Pressable>
        );
      })}
    </Animated.View>
  );
}

const getStyles = (theme: any) =>
  StyleSheet.create({
    bar: {
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 6,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.hairline,
      ...theme.shadows.lg,
    },
    cell: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cellActive: { backgroundColor: theme.colors.accentSoft },
  });
