import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { A11yText as Text } from './primitives/A11yText';
import { ProjectAvatar } from './ProjectAvatar';
import { useTheme } from '../lib/theme';
import { a11y } from '../lib/accessibility';

const PROGRESS_GREEN = '#1D9E75';

interface FlowHeaderProps {
  flowTitle: string;
  project?: { name: string; logo?: string | null } | null;
  step: number; // 1-based
  totalSteps: number;
  onBack: () => void;
  /** When true, show a confirm alert before invoking onBack. */
  confirmExit?: boolean;
  onHelp?: () => void;
}

/**
 * Standard header for the multi-step ინსტრუქტაჟი / ინციდენტი / შემოწმება flows.
 * Pill back button on the left, project name + flow title centered, optional
 * help icon on the right, and a thin progress bar with step counter below.
 */
export function FlowHeader({
  flowTitle,
  project,
  step,
  totalSteps,
  onBack,
  confirmExit,
  onHelp,
}: FlowHeaderProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (confirmExit) {
      Alert.alert(
        'გასვლა?',
        'შეყვანილი მონაცემები წაიშლება',
        [
          { text: 'გაუქმება', style: 'cancel' },
          { text: 'გასვლა', style: 'destructive', onPress: onBack },
        ],
      );
    } else {
      onBack();
    }
  };

  const progress = Math.max(0, Math.min(1, step / Math.max(1, totalSteps)));

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: insets.top + 6,
          backgroundColor: theme.colors.background,
          borderBottomColor: theme.colors.hairline,
        },
      ]}
    >
      <View style={styles.row}>
        <Pressable
          hitSlop={8}
          onPress={handleBack}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          {...a11y('უკან', 'წინა ეკრანზე დაბრუნება', 'button')}
        >
          <Ionicons name="chevron-back" size={18} color={theme.colors.accent} />
          <Text style={[styles.backText, { color: theme.colors.accent }]}>უკან</Text>
        </Pressable>

        <View style={styles.center} pointerEvents="none">
          {project?.name ? (
            <View style={styles.projectRow}>
              <ProjectAvatar project={project} size={16} />
              <Text
                style={[styles.projectName, { color: theme.colors.inkFaint }]}
                numberOfLines={1}
              >
                {project.name}
              </Text>
            </View>
          ) : null}
          <Text
            style={[styles.flowTitle, { color: theme.colors.ink }]}
            numberOfLines={1}
          >
            {flowTitle}
          </Text>
        </View>

        <View style={styles.right}>
          {onHelp ? (
            <Pressable
              hitSlop={8}
              onPress={onHelp}
              style={({ pressed }) => [
                styles.helpBtn,
                { borderColor: theme.colors.accent, backgroundColor: theme.colors.background },
                pressed && { opacity: 0.6 },
              ]}
              {...a11y('დახმარება', 'ნაბიჯის ახსნა', 'button')}
            >
              <Text style={[styles.helpText, { color: theme.colors.accent }]}>?</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: theme.colors.subtleSurface }]}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={[styles.stepLabel, { color: theme.colors.inkSoft }]}>
        ნაბიჯი {step} / {totalSteps}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingLeft: 4,
    paddingRight: 8,
    minWidth: 84,
    zIndex: 1,
  },
  backText: { fontSize: 16, fontWeight: '500', marginLeft: 1 },
  center: {
    position: 'absolute',
    left: 90,
    right: 90,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: '100%',
  },
  projectName: { fontSize: 11, fontWeight: '500' },
  flowTitle: { fontSize: 15, fontWeight: '700', marginTop: 1 },
  right: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 84,
    justifyContent: 'flex-end',
    zIndex: 1,
  },
  helpBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  helpText: { fontSize: 14, fontWeight: '800', lineHeight: 16 },
  progressTrack: {
    marginTop: 10,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: PROGRESS_GREEN,
    borderRadius: 2,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 6,
  },
});
