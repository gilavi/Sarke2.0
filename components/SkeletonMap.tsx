import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../lib/theme';
import { A11yText as Text } from './primitives/A11yText';

// Dark blueprint background — intentional non-theme value for this design.
const BLUEPRINT_BG = '#1A2E24';

interface SkeletonMapProps {
  onAddLocation?: () => void;
  /** Suppress the pin, label, and CTA — use when rendering as a card background. */
  hideContent?: boolean;
}

/**
 * Blueprint-style placeholder shown when a project has no coordinates set.
 * Renders a dark technical-drawing aesthetic with a pulsing location pin.
 */
export function SkeletonMap({ onAddLocation, hideContent }: SkeletonMapProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const pulse = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    loopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.5, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    loopRef.current.start();
    return () => loopRef.current?.stop();
  }, [pulse]);

  const accent = theme.colors.accent;

  return (
    <View style={styles.container}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        {/* Horizontal grid lines */}
        {Array.from({ length: 24 }).map((_, i) => (
          <Line
            key={`h${i}`}
            x1="0" y1={i * 24} x2="500" y2={i * 24}
            stroke={accent} strokeWidth="0.5" strokeOpacity="0.12"
          />
        ))}
        {/* Vertical grid lines */}
        {Array.from({ length: 24 }).map((_, i) => (
          <Line
            key={`v${i}`}
            x1={i * 24} y1="0" x2={i * 24} y2="500"
            stroke={accent} strokeWidth="0.5" strokeOpacity="0.12"
          />
        ))}
        {/* Diagonal "road" shapes */}
        <Path d="M -20 260 L 430 60"  stroke={accent} strokeWidth="9" strokeOpacity="0.08" strokeLinecap="round" />
        <Path d="M -20 100 L 240 380" stroke={accent} strokeWidth="7" strokeOpacity="0.06" strokeLinecap="round" />
        <Path d="M 210 -10 L 430 190" stroke={accent} strokeWidth="5" strokeOpacity="0.06" strokeLinecap="round" />
        {/* Dot grid */}
        {Array.from({ length: 16 }).map((_, row) =>
          Array.from({ length: 22 }).map((_, col) => (
            <Circle
              key={`d${row}-${col}`}
              cx={col * 24 + 12} cy={row * 24 + 12}
              r="1" fill={accent} fillOpacity="0.06"
            />
          )),
        )}
      </Svg>

      {!hideContent && (
        <View style={styles.pinArea}>
          <Animated.View
            style={[styles.pulseRing, { transform: [{ scale: pulse }] }]}
          />
          <Ionicons name="location" size={36} color={accent} />
          <Text style={styles.noLocText}>{t('components.skeletonMapNoLocation')}</Text>
          {onAddLocation ? (
            <Pressable onPress={onAddLocation} hitSlop={8}>
              <Text style={[styles.addLocLink, { color: accent }]}>
                {t('components.skeletonMapAddLocation')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BLUEPRINT_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinArea: {
    alignItems: 'center',
    gap: 6,
  },
  pulseRing: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(29,158,117,0.18)',
    top: -14,
    alignSelf: 'center',
  },
  noLocText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    marginTop: 6,
  },
  addLocLink: {
    fontSize: 13,
    fontWeight: '600',
  },
});
