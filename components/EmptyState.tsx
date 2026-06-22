// EmptyState.tsx - Empty states with 3D construction illustrations
//
// Reusable empty-state component with PNG illustrations, Reanimated entry
// animations, subtle float loop, scaffolding background pattern, and spring-
// animated CTA button. Designed to feel encouraging, not depressing.

import { useEffect, useCallback , useMemo} from 'react';
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType, type ViewStyle } from 'react-native';
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,

  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';
import type { LucideIcon } from 'lucide-react-native';
import { haptic } from '../lib/haptics';
import { a11y, useAccessibilitySettings } from '../lib/accessibility';
import { useTheme, type Theme } from '../lib/theme';


export type EmptyStateType =
  | 'projects'
  | 'certificates'
  | 'history'
  | 'qualifications'
  | 'templates';

export interface EmptyStateProps {
  type?: EmptyStateType;
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    icon?: LucideIcon;
    onPress: () => void;
  };
  backgroundPattern?: boolean;
  compact?: boolean; // smaller padding for non-fullscreen use
  style?: ViewStyle;
}

/* ═══════════════════════════════════════════════════════════════════════
   3D Illustration assets
   ═══════════════════════════════════════════════════════════════════════ */

const ILLUSTRATIONS: Record<EmptyStateType, ImageSourcePropType> = {
  projects:       require('../assets/images/ilu/crane.png'),
  certificates:   require('../assets/images/ilu/harness.png'),
  history:        require('../assets/images/ilu/excavator.png'),
  qualifications: require('../assets/images/ilu/ppe-set.png'),
  templates:      require('../assets/images/ilu/mobile-staircase.png'),
};

/* ═══════════════════════════════════════════════════════════════════════
   Scaffolding Background Pattern
   ═══════════════════════════════════════════════════════════════════════ */

function ScaffoldingPattern() {
  const { theme } = useTheme();

  const hLines = [20, 50, 80, 110, 140, 170, 200, 230, 260, 290, 320, 350, 380, 410, 440, 470, 500, 530, 560, 590];
  const vLines = [30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360];
  return (
    <Svg style={StyleSheet.absoluteFill} opacity={0.03} pointerEvents="none">
      {hLines.map(y => (
        <Line key={`h-${y}`} x1="0" y1={y} x2="400" y2={y} stroke={theme.colors.accent} strokeWidth="1" />
      ))}
      {vLines.map(x => (
        <Line key={`v-${x}`} x1={x} y1="0" x2={x} y2="700" stroke={theme.colors.accent} strokeWidth="1" />
      ))}
    </Svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Main EmptyState Component
   ═══════════════════════════════════════════════════════════════════════ */

export default function EmptyState({
  type = 'projects',
  title,
  subtitle,
  action,
  backgroundPattern = false,
  compact = false,
  style,
}: EmptyStateProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const { reduceMotion } = useAccessibilitySettings();
  const entry = useSharedValue(0);
  const btnScale = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      entry.value = 1;
    } else {
      entry.value = withSpring(1, { damping: 15, stiffness: 150 });
    }
  }, [entry, reduceMotion]);

  const containerAnim = useAnimatedStyle(() => ({
    opacity: entry.value,
    transform: [{ translateY: (1 - entry.value) * 20 }],
  }));

  const btnAnim = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const onPressIn = useCallback(() => {
    if (reduceMotion) {
      btnScale.value = 0.96;
    } else {
      btnScale.value = withTiming(0.96, { duration: 80 });
    }
  }, [btnScale, reduceMotion]);

  const onPressOut = useCallback(() => {
    if (reduceMotion) {
      btnScale.value = 1;
    } else {
      btnScale.value = withSpring(1, { stiffness: 300, damping: 15 });
    }
  }, [btnScale, reduceMotion]);

  const handleAction = useCallback(() => {
    haptic.light();
    action?.onPress();
  }, [action]);

  const source = ILLUSTRATIONS[type] ?? ILLUSTRATIONS.projects;

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInUp.duration(250)}
      style={[styles.container, compact && styles.containerCompact, style]}
    >
      {backgroundPattern && <ScaffoldingPattern />}

      <Animated.View style={[containerAnim, styles.inner]}>
        {/* Illustration */}
        <Animated.View style={styles.illustrationWrap}>
          <Image
            source={source}
            style={styles.illustration}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Title */}
        <Text style={styles.title}>{title}</Text>

        {/* Subtitle */}
        {subtitle ? (
          <Text style={styles.subtitle}>{subtitle}</Text>
        ) : null}

        {/* CTA */}
        {action ? (
          <Animated.View style={[styles.btnWrap, btnAnim]}>
            <Pressable
              onPress={handleAction}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              style={styles.btn}
              {...a11y(action.label, undefined, 'button')}
            >
              {action.icon ? (() => { const IconComp = action.icon!; return <IconComp size={18} color={theme.colors.white} strokeWidth={1.5} style={{ marginRight: 8 }} />; })() : null}
              <Text style={styles.btnText}>{action.label}</Text>
            </Pressable>
          </Animated.View>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Styles
   ═══════════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════════
   Section Empty States - compact, image-illustrated, for project screen cards
   ═══════════════════════════════════════════════════════════════════════ */

type SectionType = 'incidents' | 'briefings' | 'reports' | 'documents';

const SECTION_ILLUSTRATIONS: Record<SectionType, ImageSourcePropType> = {
  incidents: require('../assets/images/ilu/safety-net.png'),
  briefings: require('../assets/images/ilu/clamp.png'),
  reports:   require('../assets/images/ilu/cargo.png'),
  documents: require('../assets/images/ilu/forklift.png'),
};

const SECTION_SUBTITLES: Record<SectionType, string> = {
  incidents: 'ინციდენტი არ დაფიქსირებულა',
  briefings: 'ინსტრუქტაჟი ჯერ არ ჩატარებულა',
  reports: 'რეპორტი ჯერ არ შეიქმნა',
  documents: 'ფაილები არ არის ატვირთული',
};

export function SectionEmptyState({ type, subtitle }: { type: SectionType; subtitle?: string }) {
  const { theme } = useTheme();
  const text = subtitle ?? SECTION_SUBTITLES[type];
  return (
    <View style={sectionStyles.container}>
      <Image
        source={SECTION_ILLUSTRATIONS[type]}
        style={sectionStyles.illustration}
        resizeMode="contain"
      />
      <Text style={[sectionStyles.subtitle, { color: theme.colors.inkFaint }]}>{text}</Text>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 10,
  },
  illustration: {
    width: 80,
    height: 80,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});

function getStyles(theme: Theme) {
  return StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  containerCompact: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    flex: 0,
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 340,
  },
  illustrationWrap: {
    marginBottom: 24,
    alignItems: 'center',
  },
  illustration: {
    width: 200,
    height: 200,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.ink,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.inkSoft,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
    marginBottom: 20,
  },
  btnWrap: {
    width: '100%',
    maxWidth: 260,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accent,
    ...theme.shadow.button,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
  },
});
}
