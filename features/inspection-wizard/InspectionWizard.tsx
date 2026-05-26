// InspectionWizard.tsx — top-level orchestrator for the multi-step inspection
// questionnaire flow. All non-render logic lives in useWizardState; the
// individual step renderers live in sibling files.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { A11yText as Text } from '../../components/primitives/A11yText';
import { Button, Screen } from '../../components/ui';
import { FlowHeader } from '../../components/FlowHeader';
import { ErrorState } from '../../components/ErrorState';
import { ScaffoldTour } from '../../components/ScaffoldTour';
import { TOUR_SEEN_KEY } from '../../lib/scaffoldHelp';
import { WizardStepTransition, AnswerButtons } from '../../components/wizard';
import { HarnessListFlow } from '../../components/HarnessListFlow';
import { useTheme } from '../../lib/theme';
import { haptic } from '../../lib/haptics';
import { isOscillating } from '../../lib/navigationGuard';
import { useToast } from '../../lib/toast';

import { useWizardState } from './useWizardState';
import {
  hasAnswer,
  measureError,
} from './wizardSchema';
import { getstyles, staticStyles, uploadPillStyles } from './styles';
import { QuestionStep } from './QuestionStep';
import { ConclusionStep } from './ConclusionStep';
import { HarnessRowStep } from './HarnessRowStep';
import { ScaffoldRowStep } from './ScaffoldRowStep';
import { WizardHeader } from './WizardHeader';
import { ScaffoldFooterButtons } from './ScaffoldFooterButtons';
import { CompletedRedirect } from './CompletedRedirect';
import { NavigationRecovery } from './NavigationRecovery';
import { DeleteConfirmModal } from './DeleteConfirmModal';

export function InspectionWizard({ inspectionId }: { inspectionId: string }) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const ws = useWizardState(inspectionId);

  const {
    questionnaire,
    project,
    template,
    questions,
    answers,
    photos,
    steps,
    step,
    stepIndex,
    setStepIndex,
    loading,
    loadTimedOut,
    setLoadTimedOut,
    setLoading,
    animateSteps,
    harnessRowCount,
    setHarnessRowCount,
    photoUploadCount,
    conclusion,
    setConclusion,
    isSafe,
    setIsSafe,
    harnessName,
    setHarnessName,
    finishing,
    deleteConfirmVisible,
    setDeleteConfirmVisible,
    deleting,
    photoQuestion,
    photoAnswerId,
    generalPhotos,
    load,
    patchAnswer,
    pickPhoto,
    deletePhoto,
    saveConclusionAndGo,
    removeInspection,
  } = ws;

  // deleteConfirmVisible/removeInspection are exposed for parity with the
  // original wizard; the explicit delete control lives off-screen now but
  // the modal would render here if a caller flipped the flag.
  void setDeleteConfirmVisible;
  void removeInspection;

  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    // Tour shows facade scaffold component illustrations — only relevant for
    // the xaracho template. Skip for mobile_scaffold and all other categories.
    if (!template || template.category !== 'xaracho') return;
    let cancelled = false;
    AsyncStorage.getItem(TOUR_SEEN_KEY)
      .then(v => {
        if (!cancelled && v == null) setShowTour(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [template]);

  const dismissTour = useCallback(() => {
    setShowTour(false);
    AsyncStorage.setItem(TOUR_SEEN_KEY, '1').catch(() => {});
  }, []);

  // Step transition direction. Forward navigation slides the new step in
  // from the right and the old one out to the left; back nav reverses both.
  const prevStepIndexRef = useRef(stepIndex);
  const stepDirection: 'next' | 'prev' =
    stepIndex >= prevStepIndexRef.current ? 'next' : 'prev';
  useEffect(() => {
    prevStepIndexRef.current = stepIndex;
  }, [stepIndex]);

  // First-render fade out of the skeleton — kicks in once data is ready.
  const enterAnim = useRef(new Animated.Value(0)).current;
  const enteredRef = useRef(false);

  useEffect(() => {
    if (!loading && !enteredRef.current) {
      enteredRef.current = true;
      Animated.timing(enterAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
    return () => { enterAnim.stopAnimation(); };
  }, [loading, enterAnim]);

  // Swipe-right anywhere on the wizard body goes to the previous step.
  const swipeBack = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-20, 20])
        .failOffsetY([-10, 10])
        .runOnJS(true)
        .onEnd(e => {
          if (e.translationX > 60 && stepIndex > 0) {
            haptic.light();
            setStepIndex(i => Math.max(0, i - 1));
          }
        }),
    [stepIndex, setStepIndex],
  );

  const goNext = useCallback(() => {
    haptic.light();
    const currentStep = steps[stepIndex];
    if (currentStep?.kind === 'question' && currentStep.question.type === 'measure') {
      const value = answers[currentStep.question.id]?.value_num ?? null;
      const err = measureError(currentStep.question, value);
      if (err) {
        haptic.error();
        toast.error(err);
        return;
      }
    }
    setStepIndex(i => Math.min(steps.length - 1, i + 1));
  }, [stepIndex, steps, answers, setStepIndex, toast]);

  const goBack = useCallback(() => {
    haptic.light();
    setStepIndex(i => Math.max(0, i - 1));
  }, [setStepIndex]);

  // Hold the loading screen until EVERYTHING we need is ready.
  const ready = !loading && !!questionnaire && !!template;
  if (!ready) {
    if (loadTimedOut) {
      return (
        <NavigationRecovery
          id={inspectionId}
          onRetry={() => { setLoadTimedOut(false); setLoading(true); load(); }}
        />
      );
    }
    if (questionnaire?.status === 'completed' && !isOscillating('wizard', 'detail')) {
      return <CompletedRedirect id={questionnaire.id} />;
    }
    return (
      <Screen edgeToEdge edges={['top']} style={{ backgroundColor: theme.colors.background }}>
        <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.semantic.success} />
        </View>
      </Screen>
    );
  }

  if (questionnaire?.status === 'completed') {
    if (!isOscillating('wizard', 'detail')) {
      return <CompletedRedirect id={questionnaire.id} />;
    }
  }

  const stepAnswered = hasAnswer(step, answers, photos, conclusion, isSafe, harnessName, template);
  const hasAnyProgress =
    stepIndex > 0 ||
    Object.keys(answers).length > 0 ||
    conclusion.trim().length > 0 ||
    isSafe !== null ||
    harnessName.trim().length > 0;
  const isYesNo = step.kind === 'question' && step.question.type === 'yesno';
  const isLast = stepIndex === steps.length - 1;
  const isScaffoldRow = step.kind === 'gridRow' && (step.question.grid_rows?.[0] ?? '') !== 'N1';

  if (step.kind === 'empty') {
    return (
      <Screen edgeToEdge edges={[]} style={{ backgroundColor: theme.colors.card }}>
        <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
        <FlowHeader
          flowTitle=""
          project={null}
          step={1}
          totalSteps={1}
          leading="back"
          trailing="none"
          onBack={() => router.back()}
          backDisabled={false}
        />
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ErrorState
            title="შაბლონს კითხვები არ აქვს"
            message="ამ შაბლონზე კითხვები არ არის კონფიგურირებული. გთხოვთ მიმართოთ ადმინისტრატორს."
            icon="document-text-outline"
          />
        </View>
      </Screen>
    );
  }

  // HarnessListFlow: full-screen takeover for harness templates.
  if (step.kind === 'harnessFlow') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.card }}>
        <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
        <HarnessListFlow
          inspectionId={questionnaire!.id}
          template={template!}
          questions={questions}
          answers={answers}
          photos={photos}
          harnessRowCount={harnessRowCount}
          setHarnessRowCount={setHarnessRowCount}
          onPatchAnswer={patchAnswer}
          onPickItemPhoto={(q, row, col) => pickPhoto(q, `${row}:col:${col}`)}
          onDeletePhoto={deletePhoto}
          onClose={() => router.back()}
          onConclude={goNext}
        />
      </View>
    );
  }

  return (
    <Screen edgeToEdge edges={[]} style={{ backgroundColor: theme.colors.card }}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <ScaffoldTour visible={showTour} onClose={dismissTour} />
{questions.length === 0 && !loading ? (
        <View style={{ padding: 12, backgroundColor: theme.colors.warnSoft }}>
          <Text style={{ color: theme.colors.warn, fontSize: 13 }}>
            ⚠️ This template has no questions. You may be using the wrong wizard.
          </Text>
        </View>
      ) : null}
      {photoUploadCount > 0 ? (
        <View pointerEvents="none" style={uploadPillStyles.wrap}>
          <View style={uploadPillStyles.pill}>
            <ActivityIndicator size="small" color={theme.colors.surface} />
            <Text style={[uploadPillStyles.text, { color: theme.colors.white }]}>
              {photoUploadCount > 1 ? `ფოტოები იტვირთება (${photoUploadCount})…` : 'ფოტო იტვირთება…'}
            </Text>
          </View>
        </View>
      ) : null}
      <Animated.View style={{ flex: 1, opacity: enterAnim }}>
        <View>
          <WizardHeader
            step={step}
            stepIndex={stepIndex}
            total={steps.length}
            project={project}
            template={template}
            hasProgress={hasAnyProgress}
            onBack={goBack}
            onClose={() => router.back()}
          />
        </View>
        <GestureDetector gesture={swipeBack}>
        <View style={{ flex: 1 }}>
          <WizardStepTransition stepKey={stepIndex} direction={stepDirection} animate={animateSteps && Math.abs(stepIndex - prevStepIndexRef.current) <= 1}>
            {step.kind === 'gridRow' ? (
              (step.question.grid_rows?.[0] ?? '') === 'N1' ? (
                <HarnessRowStep
                  question={step.question}
                  row={step.row}
                  answer={answers[step.question.id]}
                  photosByAnswer={photos}
                  isFirstRow={step.row === (step.question.grid_rows?.[0] ?? '')}
                  harnessRowCount={harnessRowCount}
                  setHarnessRowCount={setHarnessRowCount}
                  onAnswer={patchAnswer}
                  onPickPhoto={() => pickPhoto(step.question, step.row)}
                  onDeletePhoto={deletePhoto}
                />
              ) : (
                <ScaffoldRowStep
                  question={step.question}
                  row={step.row}
                  answer={answers[step.question.id]}
                  photosByAnswer={photos}
                  onAnswer={patchAnswer}
                  onPickPhoto={() => pickPhoto(step.question, step.row)}
                  onDeletePhoto={deletePhoto}
                />
              )
            ) : (
              <KeyboardAwareScrollView
                style={{ flex: 1 }}
                contentContainerStyle={staticStyles.stepScrollContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                showsVerticalScrollIndicator={false}
                bottomOffset={120}
              >
                {step.kind === 'question' ? (
                  <QuestionStep
                    question={step.question}
                    answer={answers[step.question.id]}
                    photosByAnswer={photos}
                    onAnswer={patchAnswer}
                    onPickPhoto={() => pickPhoto(step.question)}
                    onDeletePhoto={deletePhoto}
                  />
                ) : (
                  <ConclusionStep
                    conclusion={conclusion}
                    onConclusion={setConclusion}
                    isSafe={isSafe}
                    onIsSafe={setIsSafe}
                    template={template}
                    harnessName={harnessName}
                    onHarnessName={setHarnessName}
                    photoQuestion={photoQuestion}
                    photoAnswerId={photoAnswerId}
                    photos={generalPhotos}
                    onPickPhoto={() => photoQuestion && pickPhoto(photoQuestion)}
                    onDeletePhoto={deletePhoto}
                  />
                )}
              </KeyboardAwareScrollView>
            )}
          </WizardStepTransition>

          <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
          <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
            {isYesNo && step.kind === 'question' ? (
              <AnswerButtons
                value={answers[step.question.id]?.value_bool ?? null}
                onChange={(v) => patchAnswer(step.question, a => ({ ...a, value_bool: v }))}
              />
            ) : null}
            {isLast ? (
              <Button
                title="დასრულება"
                style={{ paddingVertical: 14 }}
                iconRight={<Ionicons name="checkmark" size={20} color={theme.colors.white} />}
                loading={finishing}
                disabled={finishing}
                onPress={() => {
                  if (finishing) return;
                  haptic.medium();
                  saveConclusionAndGo();
                }}
              />
            ) : isScaffoldRow && step.kind === 'gridRow' ? (
              <ScaffoldFooterButtons
                question={step.question}
                row={step.row}
                answer={answers[step.question.id]}
                onAnswer={patchAnswer}
                onAdvance={goNext}
              />
            ) : (
              <Button
                title={stepAnswered ? 'შემდეგი' : 'გამოტოვება'}
                variant={stepAnswered ? 'primary' : 'secondary'}
                size="lg"
                style={{ alignSelf: 'stretch', paddingVertical: 16, justifyContent: 'center' }}
                iconRight={
                  stepAnswered ? (
                    <Ionicons name="chevron-forward" size={18} color={theme.colors.white} />
                  ) : undefined
                }
                onPress={goNext}
              />
            )}
          </View>
          </KeyboardStickyView>

        <DeleteConfirmModal
          visible={deleteConfirmVisible}
          deleting={deleting}
          onCancel={() => setDeleteConfirmVisible(false)}
          onConfirm={() => { void removeInspection(); }}
        />
        </View>
        </GestureDetector>
      </Animated.View>
    </Screen>
  );
}
