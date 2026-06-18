/**
 * Shared scaffold for equipment inspection flows (bobcat, excavator, general_equipment,
 * cargo_platform, etc.). Wraps FlowHeader + WizardStepTransition + bottom nav buttons
 * so each flow only needs to provide its step content.
 */
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { Check, ChevronRight } from 'lucide-react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { Button } from '../ui';
import { FlowHeader } from '../FlowHeader';
import { WizardStepTransition } from '../wizard/WizardStepTransition';
import { OfflineBanner } from '../OfflineBanner';
import { useTheme } from '../../lib/theme';
import { haptic } from '../../lib/haptics';
import { a11y } from '../../lib/accessibility';

export interface InspectionShellProps {
  title: string;
  projectName: string;
  /** 0-based current step index */
  step: number;
  /** Total wizard steps (excludes done state) */
  totalSteps: number;
  /** Labels shown in FlowHeader step indicator */
  stepLabels?: string[];
  direction: 'next' | 'prev';
  animate: boolean;
  canGoNext: boolean;
  /** When true, renders the finish button instead of "შემდეგი" */
  isLastStep?: boolean;
  /** Custom finish-button label (defaults to "შენახვა და დასრულება"). */
  finishLabel?: string;
  /**
   * When true, this step requires `canGoNext` to advance (no skip). The Next
   * button stays *enabled*; pressing it while invalid fires an error haptic and
   * calls `onBlockedNext` (so the screen can reveal its red required fields)
   * instead of advancing.
   */
  blockNext?: boolean;
  completing?: boolean;
  /**
   * Called when the user presses Next/Finish while `canGoNext` is false on a
   * validated step (`blockNext` or the last step). The screen uses this to flip
   * its `attempted` flag and light up the empty required fields.
   */
  onBlockedNext?: () => void;
  /** Optional banner rendered between the header and the step content (e.g. PdfLockedBanner). */
  banner?: ReactNode;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  children: ReactNode;
}

export function InspectionShell({
  title,
  projectName,
  step,
  totalSteps,
  stepLabels,
  direction,
  animate,
  canGoNext,
  isLastStep = false,
  completing = false,
  finishLabel,
  blockNext = false,
  onBlockedNext,
  banner,
  onNext,
  onPrev,
  onClose,
  children,
}: InspectionShellProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(theme, insets.bottom);

  // Enabled button + on-press validation: validated steps (the last step, or any
  // `blockNext` step) reveal their errors instead of advancing when invalid.
  const handleNext = () => {
    if (completing) return;
    const mustValidate = isLastStep || blockNext;
    if (mustValidate && !canGoNext) {
      haptic.validationError();
      onBlockedNext?.();
      return;
    }
    onNext();
  };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      <FlowHeader
        flowTitle={title}
        project={projectName ? { name: projectName } : null}
        step={step + 1}
        totalSteps={totalSteps}
        stepLabels={stepLabels}
        leading="back"
        trailing="close"
        onClose={onClose}
        onBack={onPrev}
        backDisabled={false}
        surfaceColor={theme.colors.surface}
      />

      <OfflineBanner variant="inline" />

      {banner ?? null}

      <View style={{ flex: 1 }}>
        <WizardStepTransition stepKey={step} direction={direction} animate={animate}>
          {children}
        </WizardStepTransition>

        <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
          <View style={styles.footer}>
            {isLastStep ? (
              <Button
                title={finishLabel ?? 'შენახვა და დასრულება'}
                style={{ paddingVertical: 14 }}
                rightIcon={Check}
                loading={completing}
                disabled={completing}
                onPress={handleNext}
              />
            ) : (
              <Button
                title={!blockNext && !canGoNext ? 'გაგრძელება' : 'შემდეგი'}
                variant={blockNext || canGoNext ? 'primary' : 'secondary'}
                size="lg"
                style={styles.nextBtn}
                rightIcon={blockNext || canGoNext ? ChevronRight : undefined}
                onPress={handleNext}
              />
            )}
          </View>
        </KeyboardStickyView>
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
    nextBtn: {
      alignSelf: 'stretch',
      paddingVertical: 16,
      justifyContent: 'center',
    },
  });
}
