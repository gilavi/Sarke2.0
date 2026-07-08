// NewIncidentScreen.tsx — orchestrator for the incident flow.
// Step renderers, form state, validation, styles, and the save flows all live
// in sibling files (useIncidentForm / useIncidentDraftSave / useIncidentPdfSave
// / Step*). This file wires them together and owns step navigation + the
// header/footer chrome.

import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowRight, FileText } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { FlowHeader } from '../../components/FlowHeader';
import { FlowProjectPicker } from '../../components/FlowProjectPicker';
import { KeyboardSafeArea } from '../../components/layout/KeyboardSafeArea';
import { SubscriptionNotice } from '../../components/SubscriptionNotice';
import { Button } from '../../components/ui';

import { useTheme } from '../../lib/theme';
import { useSession } from '../../lib/session';
import { usePdfUsage, useInvalidatePdfUsage } from '../../lib/usePdfUsage';
import { useSubmitGuard } from '../../hooks/useSubmitGuard';
import { useScrollToError } from '../../hooks/useScrollToError';

import { makeStyles } from './styles';
import {
  canAdvanceStep,
  missingFieldsForStep,
  type Step,
} from './incidentFormSchema';
import { useIncidentForm } from './useIncidentForm';
import { useIncidentDraftSave } from './useIncidentDraftSave';
import { useIncidentPdfSave } from './useIncidentPdfSave';
import { Step1Type } from './Step1Type';
import { Step2Details } from './Step2Details';
import { Step3Description } from './Step3Description';
import { Step4Summary } from './Step4Summary';

export default function NewIncidentScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const session = useSession();
  const { projectId: paramProjectId, editId } = useLocalSearchParams<{ projectId?: string; editId?: string }>();

  const {
    form, incidentId, projectId, project, setProject, setPickedProject,
    setters, witnessInput, setWitnessInput, addWitness, removeWitness,
    addPhoto, removePhoto, isFormDirty, exitSavesDraft,
  } = useIncidentForm({ paramProjectId, editId });

  const [step, setStep] = useState<Step>(1);
  // Enabled "შემდეგი" button + on-press field errors (see useSubmitGuard).
  const { attempted, guard, reset: resetAttempted } = useSubmitGuard();
  // Scroll the first empty required field into view on a blocked press.
  const { scrollRef, registerField, scrollToFirstError } = useScrollToError();

  const [limitNoticeVisible, setLimitNoticeVisible] = useState(false);
  const { data: pdfUsage } = usePdfUsage();
  const invalidatePdfUsage = useInvalidatePdfUsage();

  // inspector info from session
  const inspector = useMemo(() => {
    if (session.state.status !== 'signedIn') return { name: '', sigPath: null };
    const u = session.state.user;
    const name = u
      ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()
      : session.state.session.user.email ?? '';
    return { name, sigPath: u?.saved_signature_url ?? null };
  }, [session.state]);
  const userId = session.state.status === 'signedIn' ? session.state.session.user.id : undefined;

  const { savingDraft, saveDraft, saveExitDraft } = useIncidentDraftSave({
    form, incidentId, projectId, editId, userId, inspector, exitSavesDraft,
  });
  const { savingPdf, saveAndGeneratePdf } = useIncidentPdfSave({
    form, incidentId, projectId, editId, project, userId, inspector,
    pdfLocked: !!pdfUsage?.isLocked,
    invalidatePdfUsage,
    onLimitReached: () => setLimitNoticeVisible(true),
  });
  // One combined flag so the step-4 buttons mutually lock, exactly like the
  // pre-split single `saving` state.
  const saving = savingDraft || savingPdf;

  // ── navigation ──────────────────────────────────────────────────────────────

  // A NEW incident with real content is silently kept as a draft on exit
  // (saveExitDraft is a no-op otherwise), so leaving never loses substance.
  const exitFlow = () => {
    saveExitDraft();
    router.back();
  };

  const goBack = () => {
    if (step === 1) {
      exitFlow();
    } else {
      setStep((prev) => (prev - 1) as Step);
    }
  };

  const goNext = () => {
    setStep((prev) => (prev + 1) as Step);
  };

  const handleAdvance = () => {
    guard(
      canAdvanceStep(step, form),
      goNext,
      () => scrollToFirstError(missingFieldsForStep(step, form)),
    );
  };

  // Clear the error reveal whenever the step changes.
  useEffect(() => { resetAttempted(); }, [step, resetAttempted]);

  // ── render ──────────────────────────────────────────────────────────────────

  // Launched from Home without a project - pick one as the first full-screen step.
  if (!projectId) {
    return (
      <FlowProjectPicker
        flowTitle={t('incidents.flowTitle')}
        action="incident"
        onBack={() => router.back()}
        onPicked={(p) => { setPickedProject(p); setProject(p); }}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.card }}>
      {/* Swipe-back would bypass the exit confirmation and discard the form —
          disable it while there is anything to lose (hardware back is handled
          by FlowHeader). */}
      <Stack.Screen options={{ headerShown: false, gestureEnabled: !isFormDirty }} />

      <FlowHeader
        flowTitle={t('incidents.flowTitle')}
        project={project}
        step={step}
        totalSteps={4}
        leading="back"
        trailing="close"
        onBack={goBack}
        onClose={exitFlow}
        confirmExit={isFormDirty}
        backIsExit={step === 1}
        exitCopy={{ body: exitSavesDraft ? t('incidents.exitDraftBody') : t('wizard.exitBodyDiscard') }}
        surfaceColor={theme.colors.surface}
      />

      <KeyboardSafeArea headerHeight={44} contentStyle={{ padding: 16 }} scrollRef={scrollRef}>
        {step === 1 && (
          <Step1Type
            type={form.type}
            setType={setters.type}
            theme={theme}
            isDark={isDark}
            s={s}
            attempted={attempted}
            t={t}
          />
        )}
        {step === 2 && (
          <Step2Details
            type={form.type}
            injuredName={form.injuredName}
            injuredRole={form.injuredRole}
            dateTime={form.dateTime}
            location={form.location}
            setInjuredName={setters.injuredName}
            setInjuredRole={setters.injuredRole}
            setDateTime={setters.dateTime}
            setLocation={setters.location}
            theme={theme}
            s={s}
            attempted={attempted}
            registerField={registerField}
            t={t}
          />
        )}
        {step === 3 && (
          <Step3Description
            description={form.description}
            cause={form.cause}
            actionsTaken={form.actionsTaken}
            witnesses={form.witnesses}
            photos={form.photos}
            setDescription={setters.description}
            setCause={setters.cause}
            setActionsTaken={setters.actionsTaken}
            theme={theme}
            s={s}
            attempted={attempted}
            registerField={registerField}
            witnessInput={witnessInput}
            setWitnessInput={setWitnessInput}
            onAddWitness={addWitness}
            onRemoveWitness={removeWitness}
            onAddPhoto={addPhoto}
            onRemovePhoto={removePhoto}
            t={t}
          />
        )}
        {step === 4 && (
          <Step4Summary
            form={form}
            inspectorName={inspector.name}
            sigPath={inspector.sigPath}
            project={project}
            theme={theme}
            isDark={isDark}
            s={s}
            t={t}
          />
        )}
      </KeyboardSafeArea>

      {/* Footer rides above the keyboard so action buttons stay reachable while
          typing in any step's fields. Matches reports/new + briefings/new. */}
      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={[s.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
          {step < 4 ? (
            <Button
              title={t('common.next')}
              rightIcon={ArrowRight}
              onPress={handleAdvance}
              style={{ width: '100%' }}
            />
          ) : (
            <View style={{ gap: 10 }}>
              <Button
                title={pdfUsage?.isLocked ? t('incidents.pdfGenerateLocked') : t('incidents.pdfGenerate')}
                leftIcon={FileText}
                loading={saving}
                onPress={saveAndGeneratePdf}
                style={{ width: '100%' }}
              />
              <Button
                title={t('incidents.saveWithoutSignature')}
                variant="link"
                disabled={saving}
                onPress={saveDraft}
                style={{ width: '100%' }}
              />
            </View>
          )}
        </View>
      </KeyboardStickyView>
      <SubscriptionNotice visible={limitNoticeVisible} onClose={() => setLimitNoticeVisible(false)} />
    </View>
  );
}
