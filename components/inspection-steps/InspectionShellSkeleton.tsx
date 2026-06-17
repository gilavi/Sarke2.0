/**
 * Loading twin of {@link InspectionShell}. Shown while an equipment flow blocks
 * on its initial data fetch (see `lib/inspection/useInspectionFlow.ts`).
 *
 * It mirrors `InspectionShell`'s scaffold exactly — same `card` background, the
 * real `FlowHeader`, and a footer slot — so only the body morphs from skeleton
 * to content. Reusing the real header is the whole point: the previous loading
 * gate showed a native iOS stack header on a different background, then swapped
 * to this chrome once data landed, which read as a generic loader rather than
 * the flow. The body is a form-shaped placeholder because every equipment flow
 * opens on an info/ID form of `FloatingLabelInput` fields.
 */
import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlowHeader } from '../FlowHeader';
import { Skeleton } from '../Skeleton';
import { useTheme } from '../../lib/theme';

export interface InspectionShellSkeletonProps {
  /** Same flow title string the screen passes to `InspectionShell`. */
  title: string;
  /** Project name if already known (usually not yet, at load time). */
  projectName?: string;
  /** Total wizard steps — matches the `InspectionShell` `totalSteps` prop. */
  totalSteps?: number;
  /** Number of input-box placeholders in the body. */
  fields?: number;
  onClose?: () => void;
}

export function InspectionShellSkeleton({
  title,
  projectName,
  totalSteps,
  fields = 4,
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
        step={1}
        totalSteps={totalSteps ?? 1}
        leading="back"
        trailing="close"
        onClose={onClose}
        onBack={onClose}
        surfaceColor={theme.colors.surface}
      />

      <View style={{ flex: 1 }}>
        <View style={styles.body}>
          {Array.from({ length: fields }).map((_, i) => (
            <Skeleton key={i} width={'100%'} height={56} radius={theme.radius.input} />
          ))}
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
    body: {
      flex: 1,
      padding: 16,
      gap: 16,
    },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 16 + bottomInset,
    },
  });
}
