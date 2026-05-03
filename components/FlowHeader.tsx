import { type ReactNode, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { A11yText as Text } from './primitives/A11yText';
import { ProjectAvatar } from './ProjectAvatar';
import { useTheme } from '../lib/theme';
import { a11y } from '../lib/accessibility';
import { ExitConfirmationModal } from './wizard/ExitModal';

const PROGRESS_GREEN = '#1D9E75';

type LeadingControl = 'back' | 'none';
type TrailingControl = 'help' | 'close' | 'none';

interface FlowHeaderProps {
  flowTitle: string;
  project?: { name: string; logo?: string | null } | null;
  step: number; // 1-based
  totalSteps: number;
  /**
   * `back` (default) — pill "< უკან" on the left.
   * `none` — no leading control (used by კითხვარი which has X-close on the right).
   */
  leading?: LeadingControl;
  /**
   * `help` — circle "?" button on the right.
   * `close` — X close button on the right.
   * `none` — nothing on the right.
   */
  trailing?: TrailingControl;
  onBack?: () => void;
  onClose?: () => void;
  onHelp?: () => void;
  /** Render the back button greyed-out and unpressable. */
  backDisabled?: boolean;
  /** When true, show a confirm alert before invoking onBack/onClose. */
  confirmExit?: boolean;
  /** Custom trailing element rendered when `trailing` is 'none'. */
  trailingElement?: ReactNode;
}

/**
 * Shared header for ინსტრუქტაჟი / ინციდენტი / შემოწმება. Project name + flow
 * title centered, configurable leading/trailing controls, edge-to-edge progress
 * bar pinned to the bottom of the header.
 */
export function FlowHeader({
  flowTitle,
  project,
  step,
  totalSteps,
  leading = 'back',
  trailing = 'help',
  onBack,
  onClose,
  onHelp,
  backDisabled,
  confirmExit,
  trailingElement,
}: FlowHeaderProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [exitVisible, setExitVisible] = useState(false);
  const pendingExitRef = useRef<(() => void) | null>(null);

  const wrapExit = (cb?: () => void) => () => {
    if (!cb) return;
    if (confirmExit) {
      pendingExitRef.current = cb;
      setExitVisible(true);
    } else {
      cb();
    }
  };

  const progress = Math.max(0, Math.min(1, step / Math.max(1, totalSteps)));

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: insets.top,
          backgroundColor: theme.colors.background,
          borderBottomColor: theme.colors.hairline,
        },
      ]}
    >
      <View style={styles.row}>
        {leading === 'back' ? (
          <>
            <Pressable
              hitSlop={8}
              disabled={backDisabled}
              onPress={wrapExit(onBack)}
              style={({ pressed }) => [
                styles.backBtn,
                backDisabled && { opacity: 0.35 },
                pressed && !backDisabled && { opacity: 0.6 },
              ]}
              {...a11y('უკან', 'წინა ეკრანზე დაბრუნება', 'button')}
            >
              <Ionicons
                name="chevron-back"
                size={18}
                color={backDisabled ? theme.colors.inkFaint : theme.colors.accent}
              />
              <Text
                style={[
                  styles.backText,
                  { color: backDisabled ? theme.colors.inkFaint : theme.colors.accent },
                ]}
              >
                უკან
              </Text>
            </Pressable>
            <View style={[styles.divider, { backgroundColor: theme.colors.hairline }]} />
          </>
        ) : null}

        <View style={styles.titleBlock}>
          {project?.name ? (
            <View style={styles.projectRow}>
              <ProjectAvatar project={project} size={14} />
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

        <View style={styles.trailing}>
          {trailing === 'help' && onHelp ? (
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
          ) : trailing === 'close' ? (
            <Pressable
              hitSlop={8}
              onPress={wrapExit(onClose)}
              style={({ pressed }) => [
                styles.closeBtn,
                { backgroundColor: theme.colors.subtleSurface },
                pressed && { opacity: 0.6 },
              ]}
              {...a11y('დახურვა', 'შეეხეთ დასახურად', 'button')}
            >
              <Ionicons name="close" size={22} color={theme.colors.ink} />
            </Pressable>
          ) : trailingElement ?? null}
        </View>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: theme.colors.subtleSurface }]}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <ExitConfirmationModal
        visible={exitVisible}
        onStay={() => {
          setExitVisible(false);
          pendingExitRef.current = null;
        }}
        onExit={() => {
          setExitVisible(false);
          const cb = pendingExitRef.current;
          pendingExitRef.current = null;
          cb?.();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 38,
    paddingLeft: 8,
    paddingRight: 8,
    paddingBottom: 4,
    gap: 8,
  },
  trailing: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingLeft: 0,
    paddingRight: 4,
    marginLeft: -2,
  },
  backText: { fontSize: 15, fontWeight: '500', marginLeft: 1 },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginVertical: 6,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '100%',
  },
  projectName: { fontSize: 11, fontWeight: '500' },
  flowTitle: { fontSize: 14, fontWeight: '700', marginTop: 1 },
  helpBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  helpText: { fontSize: 13, fontWeight: '800', lineHeight: 15 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 3,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: PROGRESS_GREEN,
  },
});
