/**
 * Shared scaffold for equipment inspection flows (bobcat, excavator, general_equipment,
 * cargo_platform, etc.). Wraps FlowHeader + WizardStepTransition + bottom nav buttons
 * so each flow only needs to provide its step content.
 */
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { A11yText as Text } from '../primitives/A11yText';
import { Button } from '../ui';
import { FlowHeader } from '../FlowHeader';
import { WizardStepTransition } from '../wizard/WizardStepTransition';
import { useTheme } from '../../lib/theme';
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
  /** When true, the non-last Next button is disabled while `canGoNext` is false (no skip). */
  blockNext?: boolean;
  saving?: boolean;
  completing?: boolean;
  /** Whether to show the PDF icon in the header trailing slot */
  showPdfIcon?: boolean;
  generatingPdf?: boolean;
  /** Optional banner rendered between the header and the step content (e.g. PdfLockedBanner). */
  banner?: ReactNode;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  onPdf?: () => void;
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
  showPdfIcon = false,
  generatingPdf = false,
  finishLabel,
  blockNext = false,
  banner,
  onNext,
  onPrev,
  onClose,
  onPdf,
  children,
}: InspectionShellProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(theme, insets.bottom);

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
        trailingElement={
          showPdfIcon && onPdf ? (
            <Pressable
              onPress={onPdf}
              disabled={generatingPdf}
              hitSlop={10}
              {...a11y('PDF', 'PDF დოკუმენტის გენერირება', 'button')}
            >
              <Ionicons
                name={generatingPdf ? 'hourglass-outline' : 'document-text-outline'}
                size={22}
                color={theme.colors.accent}
              />
            </Pressable>
          ) : null
        }
        onBack={onPrev}
        backDisabled={false}
        surfaceColor={theme.colors.surface}
      />

      {banner ?? null}

      <View style={{ flex: 1 }}>
        <WizardStepTransition stepKey={step} direction={direction} animate={animate}>
          {children}
        </WizardStepTransition>

        <View style={styles.footer}>
          {isLastStep ? (
            <Button
              title={finishLabel ?? 'შენახვა და დასრულება'}
              style={{ paddingVertical: 14 }}
              iconRight={<Ionicons name="checkmark" size={20} color={theme.colors.white} />}
              loading={completing}
              disabled={!canGoNext || completing}
              onPress={onNext}
            />
          ) : (
            <Button
              title={!blockNext && !canGoNext ? 'გაგრძელება' : 'შემდეგი'}
              variant={blockNext || canGoNext ? 'primary' : 'secondary'}
              size="lg"
              style={styles.nextBtn}
              iconRight={
                blockNext || canGoNext ? (
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.white} />
                ) : undefined
              }
              disabled={blockNext && !canGoNext}
              onPress={onNext}
            />
          )}
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
    savingHint: {
      textAlign: 'center',
      fontSize: 12,
      paddingVertical: 2,
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
