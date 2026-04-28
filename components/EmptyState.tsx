// EmptyState.tsx — Award-worthy empty states with personality
//
// Reusable empty-state component with SVG illustrations, Reanimated entry
// animations, subtle float loop, scaffolding background pattern, and spring-
// animated CTA button. Designed to feel encouraging, not depressing.

import { useEffect, useCallback , useMemo} from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,

  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line, Rect, Circle, Path, Polygon, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { haptic } from '../lib/haptics';
import { a11y } from '../lib/accessibility';
import { useTheme } from '../lib/theme';


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
    icon?: string;
    onPress: () => void;
  };
  backgroundPattern?: boolean;
  compact?: boolean; // smaller padding for non-fullscreen use
  style?: ViewStyle;
}

/* ═══════════════════════════════════════════════════════════════════════
   SVG Illustrations — construction-themed, hand-crafted for each type
   ═══════════════════════════════════════════════════════════════════════ */

function IllustrationProjects() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  return (
    <Svg width={160} height={160} viewBox="0 0 160 160">
      <G opacity={0.12}>
        <Rect x={20} y={20} width={120} height={120} rx={12} fill={theme.colors.accent} />
      </G>
      {/* Hard hat */}
      <Path
        d="M80 42c-14 0-26 8-28 20h56c-2-12-14-20-28-20z"
        fill={theme.colors.accent}
        opacity={0.15}
      />
      <Path
        d="M80 46c-12 0-22 7-24 17h48c-2-10-12-17-24-17z"
        fill={theme.colors.accent}
      />
      <Rect x={72} y={62} width={16} height={4} rx={2} fill={theme.colors.accent} opacity={0.6} />
      {/* Clipboard */}
      <Rect x={52} y={72} width={56} height={68} rx={8} fill="#fff" stroke={theme.colors.accent} strokeWidth={2} />
      <Rect x={74} y={66} width={12} height={10} rx={3} fill={theme.colors.accent} />
      {/* Dashed lines on clipboard */}
      <Rect x={62} y={90} width={36} height={3} rx={1.5} fill={theme.colors.hairline} />
      <Rect x={62} y={100} width={28} height={3} rx={1.5} fill={theme.colors.hairline} />
      <Rect x={62} y={110} width={32} height={3} rx={1.5} fill={theme.colors.hairline} />
      <Rect x={62} y={120} width={20} height={3} rx={1.5} fill={theme.colors.hairline} />
      {/* Checkmark */}
      <Circle cx={118} cy={118} r={14} fill={theme.colors.accentSoft} />
      <Path d="M111 118l5 5 9-10" stroke={theme.colors.accent} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Small gear */}
      <Circle cx={42} cy={118} r={10} fill={theme.colors.warnSoft} />
      <Circle cx={42} cy={118} r={4} fill={theme.colors.warn} />
      <Path d="M42 104v4M42 128v4M30 118h4M50 118h4" stroke={theme.colors.warn} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function IllustrationCertificates() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  return (
    <Svg width={160} height={160} viewBox="0 0 160 160">
      <G opacity={0.1}>
        <Rect x={25} y={25} width={110} height={110} rx={14} fill={theme.colors.certTint} />
      </G>
      {/* Document */}
      <Rect x={45} y={38} width={70} height={90} rx={8} fill="#fff" stroke={theme.colors.certTint} strokeWidth={2} />
      {/* Folded corner */}
      <Path d="M95 38h20v20l-20-20z" fill={theme.colors.certSoft} />
      <Path d="M95 38l20 20" stroke={theme.colors.certTint} strokeWidth={1.5} />
      {/* Lines */}
      <Rect x={55} y={68} width={50} height={3} rx={1.5} fill={theme.colors.hairline} />
      <Rect x={55} y={78} width={40} height={3} rx={1.5} fill={theme.colors.hairline} />
      <Rect x={55} y={88} width={45} height={3} rx={1.5} fill={theme.colors.hairline} />
      <Rect x={55} y={98} width={30} height={3} rx={1.5} fill={theme.colors.hairline} />
      {/* Seal / stamp */}
      <Circle cx={80} cy={118} r={14} fill={theme.colors.certSoft} />
      <Circle cx={80} cy={118} r={10} fill="none" stroke={theme.colors.certTint} strokeWidth={1.5} strokeDasharray="3 2" />
      <Path d="M76 118l3 3 6-6" stroke={theme.colors.certTint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Flying document ghost */}
      <G opacity={0.4}>
        <Rect x={32} y={52} width={24} height={30} rx={4} fill="#fff" stroke={theme.colors.hairline} strokeWidth={1} />
        <Rect x={36} y={60} width={16} height={2} rx={1} fill={theme.colors.hairline} />
        <Rect x={36} y={66} width={12} height={2} rx={1} fill={theme.colors.hairline} />
      </G>
      {/* Arrow */}
      <Path d="M38 48l-4-6M38 48l4-6" stroke={theme.colors.inkFaint} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function IllustrationHistory() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  return (
    <Svg width={160} height={160} viewBox="0 0 160 160">
      <G opacity={0.1}>
        <Circle cx={80} cy={80} r={55} fill={theme.colors.accent} />
      </G>
      {/* Clock face */}
      <Circle cx={80} cy={80} r={44} fill="#fff" stroke={theme.colors.accent} strokeWidth={2.5} />
      <Circle cx={80} cy={80} r={3} fill={theme.colors.accent} />
      {/* Hour markers */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const isMain = i % 3 === 0;
        const r1 = isMain ? 36 : 38;
        const r2 = 44;
        return (
          <Line
            key={deg}
            x1={80 + Math.cos(rad) * r1}
            y1={80 + Math.sin(rad) * r1}
            x2={80 + Math.cos(rad) * r2}
            y2={80 + Math.sin(rad) * r2}
            stroke={theme.colors.accent}
            strokeWidth={isMain ? 2 : 1}
            strokeLinecap="round"
          />
        );
      })}
      {/* Clock hands */}
      <Line x1={80} y1={80} x2={80} y2={52} stroke={theme.colors.accent} strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={80} y1={80} x2={98} y2={80} stroke={theme.colors.accent} strokeWidth={2} strokeLinecap="round" />
      {/* Circular arrow */}
      <Path
        d="M128 56a48 48 0 0 1 0 48"
        fill="none"
        stroke={theme.colors.warn}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <Polygon points="132,56 124,52 124,60" fill={theme.colors.warn} />
      {/* Calendar page */}
      <G opacity={0.35}>
        <Rect x={28} y={48} width={28} height={32} rx={4} fill="#fff" stroke={theme.colors.inkFaint} strokeWidth={1} />
        <Rect x={28} y={54} width={28} height={4} fill={theme.colors.inkFaint} />
        <Rect x={34} y={64} width={6} height={3} rx={1} fill={theme.colors.hairline} />
        <Rect x={34} y={70} width={10} height={3} rx={1} fill={theme.colors.hairline} />
      </G>
    </Svg>
  );
}

function IllustrationQualifications() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  return (
    <Svg width={160} height={160} viewBox="0 0 160 160">
      <G opacity={0.1}>
        <Rect x={20} y={20} width={120} height={120} rx={14} fill={theme.colors.certTint} />
      </G>
      {/* Certificate frame */}
      <Rect x={45} y={35} width={70} height={90} rx={6} fill="#fff" stroke={theme.colors.certTint} strokeWidth={2.5} />
      {/* Inner decorative border */}
      <Rect x={51} y={41} width={58} height={78} rx={4} fill="none" stroke={theme.colors.certSoft} strokeWidth={1} strokeDasharray="4 3" />
      {/* Question mark */}
      <Path
        d="M80 62c-6 0-10 4-10 9h6c0-2 2-4 4-4s4 2 4 4c0 3-3 5-5 7-2 2-3 4-3 6v2h6v-1c0-2 1-3 3-5 3-3 5-5 5-9 0-5-4-9-10-9z"
        fill={theme.colors.certTint}
      />
      <Circle cx={80} cy={96} r={3} fill={theme.colors.certTint} />
      {/* Ribbon */}
      <Path d="M62 108h36v6H62z" fill={theme.colors.certSoft} />
      <Path d="M68 114l-6 10-2-8 8-2z" fill={theme.colors.certTint} />
      <Path d="M92 114l6 10 2-8-8-2z" fill={theme.colors.certTint} />
      {/* Star accent */}
      <Polygon points="130,50 132,56 138,56 133,60 135,66 130,62 125,66 127,60 122,56 128,56" fill={theme.colors.warn} opacity={0.8} />
      {/* Small doc */}
      <G opacity={0.3}>
        <Rect x={30} y={100} width={20} height={26} rx={3} fill="#fff" stroke={theme.colors.hairline} strokeWidth={1} />
        <Rect x={34} y={108} width={12} height={2} rx={1} fill={theme.colors.hairline} />
        <Rect x={34} y={114} width={8} height={2} rx={1} fill={theme.colors.hairline} />
      </G>
    </Svg>
  );
}

function IllustrationTemplates() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  return (
    <Svg width={160} height={160} viewBox="0 0 160 160">
      <G opacity={0.1}>
        <Rect x={20} y={20} width={120} height={120} rx={14} fill={theme.colors.templatesTint} />
      </G>
      {/* Blueprint */}
      <Rect x={38} y={38} width={84} height={84} rx={6} fill="#fff" stroke={theme.colors.templatesTint} strokeWidth={2} />
      {/* Grid lines */}
      <Line x1={38} y1={60} x2={122} y2={60} stroke={theme.colors.templatesSoft} strokeWidth={1} />
      <Line x1={38} y1={82} x2={122} y2={82} stroke={theme.colors.templatesSoft} strokeWidth={1} />
      <Line x1={38} y1={104} x2={122} y2={104} stroke={theme.colors.templatesSoft} strokeWidth={1} />
      <Line x1={60} y1={38} x2={60} y2={122} stroke={theme.colors.templatesSoft} strokeWidth={1} />
      <Line x1={82} y1={38} x2={82} y2={122} stroke={theme.colors.templatesSoft} strokeWidth={1} />
      <Line x1={104} y1={38} x2={104} y2={122} stroke={theme.colors.templatesSoft} strokeWidth={1} />
      {/* Missing content indicator */}
      <Rect x={50} y={50} width={20} height={20} rx={3} fill={theme.colors.templatesSoft} opacity={0.5} />
      <Rect x={82} y={50} width={30} height={6} rx={3} fill={theme.colors.hairline} />
      <Rect x={82} y={62} width={20} height={6} rx={3} fill={theme.colors.hairline} />
      <Rect x={50} y={88} width={60} height={6} rx={3} fill={theme.colors.hairline} />
      <Rect x={50} y={100} width={40} height={6} rx={3} fill={theme.colors.hairline} />
      {/* Pencil */}
      <G transform="rotate(-30, 130, 50)">
        <Rect x={124} y={30} width={10} height={40} rx={2} fill={theme.colors.warnSoft} />
        <Polygon points="129,30 124,22 134,22" fill={theme.colors.warn} />
        <Rect x={124} y={68} width={10} height={6} rx={1} fill={theme.colors.warn} opacity={0.4} />
      </G>
      {/* Ruler */}
      <G transform="rotate(15, 30, 120)">
        <Rect x={20} y={110} width={50} height={10} rx={2} fill={theme.colors.accentSoft} />
        {[24, 32, 40, 48, 56, 64].map(x => (
          <Line key={x} x1={x} y1={110} x2={x} y2={114} stroke={theme.colors.accent} strokeWidth={1} />
        ))}
      </G>
    </Svg>
  );
}

const ILLUSTRATIONS: Record<EmptyStateType, React.FC> = {
  projects: IllustrationProjects,
  certificates: IllustrationCertificates,
  history: IllustrationHistory,
  qualifications: IllustrationQualifications,
  templates: IllustrationTemplates,
};

/* ═══════════════════════════════════════════════════════════════════════
   Scaffolding Background Pattern
   ═══════════════════════════════════════════════════════════════════════ */

function ScaffoldingPattern() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

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
  const styles = useMemo(() => getstyles(theme), [theme]);
  const entry = useSharedValue(0);
  const btnScale = useSharedValue(1);

  useEffect(() => {
    entry.value = withSpring(1, { damping: 15, stiffness: 150 });
  }, [entry]);

  const containerAnim = useAnimatedStyle(() => ({
    opacity: entry.value,
    transform: [{ translateY: (1 - entry.value) * 20 }],
  }));

  const btnAnim = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const onPressIn = useCallback(() => {
    btnScale.value = withTiming(0.96, { duration: 80 });
  }, [btnScale]);

  const onPressOut = useCallback(() => {
    btnScale.value = withSpring(1, { stiffness: 300, damping: 15 });
  }, [btnScale]);

  const handleAction = useCallback(() => {
    haptic.light();
    action?.onPress();
  }, [action]);

  const Illustration = ILLUSTRATIONS[type];

  return (
    <Animated.View
      entering={FadeInUp.duration(250)}
      style={[styles.container, compact && styles.containerCompact, style]}
    >
      {backgroundPattern && <ScaffoldingPattern />}

      <Animated.View style={[containerAnim, styles.inner]}>
        {/* Illustration with float */}
        <Animated.View style={styles.illustrationWrap}>
          <View style={styles.illustrationCircle}>
            <Illustration />
          </View>
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
              {action.icon ? (
                <Ionicons
                  name={action.icon as any}
                  size={18}
                  color={theme.colors.white}
                  style={{ marginRight: 8 }}
                />
              ) : null}
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

function getstyles(theme: any) {
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
  },
  illustrationCircle: {
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: theme.colors.subtleSurface,
    alignItems: 'center',
    justifyContent: 'center',
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
