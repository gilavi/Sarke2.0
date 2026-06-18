import { type ReactNode, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronLeft, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { A11yText as Text } from './primitives/A11yText';
import { useTheme } from '../lib/theme';
import { a11y } from '../lib/accessibility';
import { ExitConfirmationModal } from './wizard/ExitModal';

type LeadingControl = 'back' | 'none';
type TrailingControl = 'help' | 'close' | 'none';

interface FlowHeaderProps {
  flowTitle: string;
  project?: { name: string; logo?: string | null } | null;
  /** 1-based. Omit (with `totalSteps`) to hide the progress bar - used by the post-completion result view. */
  step?: number;
  totalSteps?: number;
  /** When provided, renders segmented stepper with labels instead of a plain progress bar. */
  stepLabels?: string[];
  /**
   * `back` (default) - pill "< უკან" on the left.
   * `none` - no leading control (used by კითხვარი which has X-close on the right).
   */
  leading?: LeadingControl;
  /**
   * `help` - circle "?" button on the right.
   * `close` - X close button on the right.
   * `none` - nothing on the right.
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
  /** Header surface color. Defaults to the app background; inspection flows pass white. */
  surfaceColor?: string;
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
  stepLabels,
  leading = 'back',
  trailing = 'help',
  onBack,
  onClose,
  onHelp,
  backDisabled,
  confirmExit,
  trailingElement,
  surfaceColor,
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

  const showProgress = step !== undefined && totalSteps !== undefined;
  const progress = showProgress
    ? Math.max(0, Math.min(1, step / Math.max(1, totalSteps)))
    : 0;

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: insets.top,
          backgroundColor: surfaceColor ?? theme.colors.background,
        },
      ]}
    >
      <View style={styles.row}>
        {leading === 'back' ? (
          <Pressable
            hitSlop={11}
            disabled={backDisabled}
            onPress={onBack}
            style={({ pressed }) => [
              styles.circleBtn,
              { borderWidth: 1.5, borderColor: theme.colors.border },
              backDisabled && { opacity: 0.35 },
              pressed && !backDisabled && { opacity: 0.6 },
            ]}
            {...a11y('უკან', 'წინა ეკრანზე დაბრუნება', 'button')}
          >
            <ChevronLeft
              size={22}
              color={backDisabled ? theme.colors.inkFaint : theme.colors.ink}
              strokeWidth={1.5}
            />
          </Pressable>
        ) : null}

        <View style={styles.titleBlock}>
          {project?.name ? (
            <Text
              style={[styles.projectName, { color: theme.colors.inkFaint }]}
              numberOfLines={1}
            >
              {project.name}
            </Text>
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
              hitSlop={10}
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
          ) : (
            <>
              {trailingElement ?? null}
              {trailing === 'close' ? (
                <Pressable
                  hitSlop={4}
                  onPress={wrapExit(onClose)}
                  style={({ pressed }) => [
                    styles.closeBtn,
                    { borderWidth: 1.5, borderColor: theme.colors.border },
                    pressed && { opacity: 0.6 },
                  ]}
                  {...a11y('დახურვა', 'შეეხეთ დასახურად', 'button')}
                >
                  <X size={22} color={theme.colors.ink} strokeWidth={1.5} />
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      </View>

      {showProgress && stepLabels?.length ? (
        <SegmentedStepper
          step={step!}
          totalSteps={totalSteps!}
          labels={stepLabels}
          fillColor={theme.colors.ink}
          inkColor={theme.colors.ink}
          inkFaintColor={theme.colors.inkFaint}
          trackColor={theme.colors.subtleSurface}
        />
      ) : showProgress ? (
        <View style={styles.progressRow}>
          <View style={[styles.progressTrack, { backgroundColor: theme.colors.subtleSurface }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress * 100}%`, backgroundColor: theme.colors.ink },
              ]}
            />
          </View>
          <Text style={[styles.progressCount, { color: theme.colors.inkFaint }]}>
            {`${Math.max(1, Math.min(step!, totalSteps!))} / ${totalSteps}`}
          </Text>
        </View>
      ) : null}

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

function SegmentedStepper({
  step,
  totalSteps,
  labels,
  fillColor,
  inkColor,
  inkFaintColor,
  trackColor,
}: {
  step: number;
  totalSteps: number;
  labels: string[];
  fillColor: string;
  inkColor: string;
  inkFaintColor: string;
  trackColor: string;
}) {
  return (
    <View>
      <View style={{ flexDirection: 'row' }}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 3,
              marginLeft: i > 0 ? 1.5 : 0,
              backgroundColor: i < step ? fillColor : trackColor,
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', paddingTop: 4, paddingBottom: 6 }}>
        {labels.slice(0, totalSteps).map((label, i) => (
          <Text
            key={i}
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 9,
              color: i < step ? fillColor : i === step - 1 ? inkColor : inkFaintColor,
              fontWeight: i === step - 1 ? '600' : '400',
            }}
            numberOfLines={1}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingLeft: 12,
    paddingRight: 12,
    paddingBottom: 4,
    gap: 8,
  },
  trailing: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    zIndex: 1,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectName: { fontSize: 11, fontWeight: '500' },
  flowTitle: { fontSize: 15, fontWeight: '700', marginTop: 1 },
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
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 2,
    paddingBottom: 8,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressCount: { fontSize: 11, fontWeight: '600' },
});
