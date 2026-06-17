/**
 * Loading twin of {@link InspectionShell}. Shown while a flow blocks on its
 * initial data fetch (see `lib/inspection/useInspectionFlow.ts`).
 *
 * It mirrors `InspectionShell`'s scaffold exactly — same `card` background, the
 * real `FlowHeader` (back/close + the live progress bar) and a footer slot — so
 * the header and progress strip NEVER wait on loading; only the body morphs from
 * skeleton to content. The body is chosen by `variant` so each step shows a
 * placeholder shaped like the content it is about to become
 * (see {@link StepBodySkeleton}); pass the same 0-based `step`, `totalSteps`,
 * `stepLabels` and `projectName` the route hands `InspectionShell` so the
 * progress bar lands in its final position with no jump when data arrives.
 */
import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlowHeader } from '../FlowHeader';
import { Skeleton } from '../Skeleton';
import { StepBodySkeleton, type StepSkeletonVariant } from './StepSkeletons';
import { useTheme } from '../../lib/theme';

export interface InspectionShellSkeletonProps {
  /** Same flow title string the screen passes to `InspectionShell`. */
  title: string;
  /** Project name if already known (usually not yet, at load time). */
  projectName?: string;
  /** 0-based current step — mirrors `InspectionShell`'s `step` prop. */
  step?: number;
  /** Total wizard steps. Omit to hide the progress bar (e.g. generic wizard). */
  totalSteps?: number;
  /** Optional segmented-stepper labels, mirrors `InspectionShell`. */
  stepLabels?: string[];
  /** Which body placeholder to render. Defaults to `form`. */
  variant?: StepSkeletonVariant;
  /** Number of input-box placeholders (only used by the `form` variant). */
  fields?: number;
  onClose?: () => void;
}

export function InspectionShellSkeleton({
  title,
  projectName,
  step = 0,
  totalSteps,
  stepLabels,
  variant = 'form',
  fields,
  onClose,
}: InspectionShellSkeletonProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(theme, insets.bottom);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      <FlowHeader
        flowTitle={title}
        project={projectName ? { name: projectName } : null}
        step={totalSteps !== undefined ? step + 1 : undefined}
        totalSteps={totalSteps}
        stepLabels={stepLabels}
        leading="back"
        trailing="close"
        onClose={onClose}
        onBack={onClose}
        surfaceColor={theme.colors.surface}
      />

      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <StepBodySkeleton variant={variant} fields={fields} />
        </View>

        <View style={styles.footer}>
          <Skeleton width={'100%'} height={52} radius={1000} />
        </View>
      </View>
    </View>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>['theme'], bottomInset: number) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.card,
    },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 16 + bottomInset,
    },
  });
}
