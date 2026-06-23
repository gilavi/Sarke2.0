import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
  useKeyboardState,
} from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { ArrowRight, Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { A11yText as Text } from '../../components/primitives/A11yText';
import { Button, Screen } from '../../components/ui';
import { FlowHeader } from '../../components/FlowHeader';
import { WizardStepTransition } from '../../components/wizard';
import { SignatureCanvas } from '../../components/SignatureCanvas';
import { useTheme } from '../../lib/theme';
import { useToast } from '../../lib/toast';
import { useSubmitGuard } from '../../hooks/useSubmitGuard';

import { getStyles } from './styles';
import { useBreathalyzerEntry } from './useBreathalyzerEntry';
import {
  ADD_ENTRY_STEP_KEYS,
  canAdvanceEntry,
  canSaveEntry,
  type AddEntryStep,
} from './breathalyzerSchema';
import { PersonStep } from './steps/PersonStep';
import { TestTypeStep } from './steps/TestTypeStep';
import { ResultStep } from './steps/ResultStep';
import { SignatureStep } from './steps/SignatureStep';

/** Full-screen 4-step wizard for adding one breathalyzer reading. */
export function AddEntryWizard({
  projectId,
  logId,
  repeatForId,
}: {
  projectId: string;
  logId: string;
  repeatForId?: string;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const keyboardOpen = useKeyboardState(s => s.isVisible);

  const ws = useBreathalyzerEntry({ projectId, logId, repeatForId });
  const { attempted, guard, reset } = useSubmitGuard();
  const [showSig, setShowSig] = useState(false);

  // Slide direction from the step delta (mirrors the inspection wizard).
  const prevStepRef = useRef(ws.step);
  const direction: 'next' | 'prev' = ws.step >= prevStepRef.current ? 'next' : 'prev';
  useEffect(() => {
    prevStepRef.current = ws.step;
  }, [ws.step]);

  // Clear the on-press error reveal whenever the step changes.
  useEffect(() => {
    reset();
  }, [ws.step, reset]);

  const stepLabels = ADD_ENTRY_STEP_KEYS.map(k => t(k));
  const isLast = ws.step === 4;

  const onBack = () => {
    if (ws.step > 1) ws.setStep((ws.step - 1) as AddEntryStep);
    else router.back();
  };

  const onNext = () =>
    guard(canAdvanceEntry(ws.step, ws.form), () =>
      ws.setStep((ws.step + 1) as AddEntryStep),
    );

  const onSave = () =>
    guard(canSaveEntry(ws.form), async () => {
      const ok = await ws.saveEntry();
      if (ok) router.back();
      else toast.error(t('breathalyzer.saveFailed'));
    });

  // The source log vanished (deleted / bad link) — bail with a back button.
  if (ws.ready && !ws.log) {
    return (
      <Screen edgeToEdge edges={[]} style={{ backgroundColor: theme.colors.background }}>
        <Stack.Screen options={{ headerShown: false }} />
        <FlowHeader
          flowTitle={t('breathalyzer.addEntry')}
          project={null}
          leading="back"
          trailing="none"
          onBack={() => router.back()}
        />
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>{t('breathalyzer.entryNotFound')}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edgeToEdge edges={[]} style={{ backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <FlowHeader
        flowTitle={t('breathalyzer.addEntry')}
        project={ws.project ? { name: ws.project.name } : null}
        step={ws.step}
        totalSteps={4}
        stepLabels={stepLabels}
        leading="back"
        trailing="close"
        onBack={onBack}
        onClose={() => router.back()}
      />

      <View style={{ flex: 1 }}>
        <WizardStepTransition stepKey={ws.step} direction={direction}>
          <KeyboardAwareScrollView
            style={styles.stepScroll}
            contentContainerStyle={styles.stepScrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            bottomOffset={120}
          >
            {ws.step === 1 ? (
              <PersonStep
                form={ws.form}
                update={ws.update}
                suggestions={ws.suggestions}
                onSelect={ws.selectSuggestion}
                attempted={attempted}
              />
            ) : ws.step === 2 ? (
              <TestTypeStep form={ws.form} update={ws.update} />
            ) : ws.step === 3 ? (
              <ResultStep form={ws.form} update={ws.update} />
            ) : (
              <SignatureStep
                form={ws.form}
                update={ws.update}
                attempted={attempted}
                onOpenSignature={() => setShowSig(true)}
              />
            )}
          </KeyboardAwareScrollView>
        </WizardStepTransition>

        <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
          <View
            style={[
              styles.footer,
              keyboardOpen ? { paddingBottom: 10 } : { paddingBottom: insets.bottom + 12 },
            ]}
          >
            {isLast ? (
              <Button
                title={t('common.save')}
                leftIcon={Check}
                size="lg"
                loading={ws.saving}
                onPress={onSave}
                style={{ alignSelf: 'stretch' }}
              />
            ) : (
              <Button
                title={t('breathalyzer.nextStep')}
                rightIcon={ArrowRight}
                size="lg"
                onPress={onNext}
                style={{ alignSelf: 'stretch' }}
              />
            )}
          </View>
        </KeyboardStickyView>
      </View>

      <SignatureCanvas
        visible={showSig}
        personName={ws.form.name}
        onCancel={() => setShowSig(false)}
        onConfirm={b64 => {
          setShowSig(false);
          ws.update({ signature: b64, refusedSignature: false });
        }}
      />
    </Screen>
  );
}
