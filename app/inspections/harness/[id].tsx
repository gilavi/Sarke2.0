import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { HarnessWebWizard } from './HarnessWebWizard';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../../components/inputs/FloatingLabelInput';
import { Button, Screen } from '../../../components/ui';
import { InspectionShell, ConclusionStep } from '../../../components/inspections';
import type { VerdictOption } from '../../../components/inspections';
import { InspectionResultView } from '../../../components/InspectionResultView';
import { HarnessListFlow } from '../../../components/HarnessListFlow';
import { useTheme } from '../../../lib/theme';
import { useSession } from '../../../lib/session';
import { useToast } from '../../../lib/toast';
import { useOffline } from '../../../lib/offline';
import { haptic } from '../../../lib/haptics';
import { pdfPhotoEmbed } from '../../../lib/imageUrl';
import { STORAGE_BUCKETS } from '../../../lib/supabase';
import {
  answersApi,
  inspectionsApi,
  projectsApi,
  signaturesApi,
  storageApi,
  templatesApi,
} from '../../../lib/services';
import { friendlyError } from '../../../lib/errorMap';
import { logError, toErrorMessage } from '../../../lib/logError';
import { usePhotoWithLocation } from '../../../hooks/usePhotoWithLocation';
import { reverseGeocode } from '../../../utils/location';
import type { PhotoLocation } from '../../../utils/location';
import { showPhotoLocationAlert } from '../../../lib/photoLocationAlert';
import { recordCompletion } from '../../../lib/calendarSchedule';
import { useQueryClient } from '@tanstack/react-query';
import { qk } from '../../../lib/apiHooks';
import type {
  Answer,
  AnswerPhoto,
  Inspection,
  Project,
  Question,
  SignatureRecord,
} from '../../../types/models';

// ── AsyncStorage keys ────────────────────────────────────────────────────────
const stepKey = (id: string) => `harness-wizard:${id}:step`;
const countKey = (id: string) => `harness-wizard:${id}:count`;
const nameKey  = (id: string) => `harness-wizard:${id}:name`;
const conclusionKey = (id: string) => `harness-wizard:${id}:conclusion`;
const safetyKey = (id: string) => `harness-wizard:${id}:safety`;

// ── Step constants ────────────────────────────────────────────────────────────
const INFO_STEP       = 0;
const HARNESS_STEP    = 1;
const CONCLUSION_STEP = 2;
const TOTAL_STEPS     = 3;
const STEP_LABELS     = ['ინფო', 'ქამრები', 'დასკვნა'];

// ── Verdict helpers ───────────────────────────────────────────────────────────
type HarnessVerdict = 'safe' | 'unsafe';

const VERDICT_OPTIONS: VerdictOption<HarnessVerdict>[] = [
  { value: 'safe',   label: 'უსაფრთხოა' },
  { value: 'unsafe', label: 'არ არის უსაფრთხო' },
];

function verdictToSafe(v: HarnessVerdict | null): boolean | null {
  if (v === 'safe')   return true;
  if (v === 'unsafe') return false;
  return null;
}

function safeToVerdict(safe: boolean | null): HarnessVerdict | null {
  if (safe === true)  return 'safe';
  if (safe === false) return 'unsafe';
  return null;
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function HarnessInspectionScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const session = useSession();
  const offline = useOffline();
  const queryClient = useQueryClient();
  const { pickPhotoWithAnnotation } = usePhotoWithLocation();

  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [photos, setPhotos] = useState<Record<string, AnswerPhoto[]>>({});
  const [signatures, setSignatures] = useState<SignatureRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [photoUploadCount, setPhotoUploadCount] = useState(0);

  const [step, setStep] = useState(INFO_STEP);
  const prevStepRef = useRef(INFO_STEP);
  const [animateSteps, setAnimateSteps] = useState(false);

  const [harnessRowCount, setHarnessRowCount] = useState(5);
  const [harnessName, setHarnessName] = useState('');
  const [verdict, setVerdict] = useState<HarnessVerdict | null>(null);
  const [conclusion, setConclusion] = useState('');

  const direction: 'next' | 'prev' = step >= prevStepRef.current ? 'next' : 'prev';
  useEffect(() => { prevStepRef.current = step; }, [step]);

  // ── Cancellation token ─────────────────────────────────────────────────────
  const loadCtrlRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  // ── Load ───────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!id) { setLoading(false); return; }
    loadCtrlRef.current.cancelled = true;
    const ctrl = { cancelled: false };
    loadCtrlRef.current = ctrl;
    setLoading(true);
    try {
      const insp = await inspectionsApi.getById(id);
      if (ctrl.cancelled) return;
      if (!insp) { router.back(); return; }
      setInspection(insp);

      // Seed conclusion/safety from server (AsyncStorage wins below if present)
      setConclusion(insp.conclusion_text ?? '');
      setVerdict(safeToVerdict(insp.is_safe_for_use));

      projectsApi.getById(insp.project_id).then(p => {
        if (!ctrl.cancelled) setProject(p);
      }).catch(() => null);

      const tpl = await templatesApi.getById(insp.template_id);
      if (ctrl.cancelled) return;
      if (tpl) {
        const qs = await templatesApi.questions(tpl.id);
        if (ctrl.cancelled) return;
        setQuestions(qs);

        const existing = await answersApi.list(insp.id).catch(() => [] as Answer[]);
        if (ctrl.cancelled) return;
        const aMap: Record<string, Answer> = {};
        for (const a of existing) aMap[a.question_id] = a;

        const photoResults = await Promise.all(
          existing.map(a => answersApi.photos(a.id).catch(() => [] as AnswerPhoto[])),
        );
        if (ctrl.cancelled) return;
        const pMap: Record<string, AnswerPhoto[]> = {};
        existing.forEach((a, i) => { pMap[a.id] = photoResults[i]; });

        // Overlay offline-cached answers
        const cached = await offline.hydrateAnswers(insp.id);
        if (!ctrl.cancelled) {
          const pending = await offline.pendingAnswerQuestionIds(insp.id);
          for (const qid of pending) { if (cached[qid]) aMap[qid] = cached[qid]; }
          setAnswers(aMap);
          setPhotos(pMap);
          await offline.cacheAnswers(insp.id, aMap);
        }
      }

      // Restore persisted state (AsyncStorage wins over server for in-progress fields)
      const [savedStep, savedCount, savedName, savedConclusion, savedSafety] =
        await Promise.all([
          AsyncStorage.getItem(stepKey(id)),
          AsyncStorage.getItem(countKey(id)),
          AsyncStorage.getItem(nameKey(id)),
          AsyncStorage.getItem(conclusionKey(id)),
          AsyncStorage.getItem(safetyKey(id)),
        ]);
      if (ctrl.cancelled) return;

      if (savedStep) {
        const s = parseInt(savedStep, 10);
        if (!isNaN(s) && s >= INFO_STEP && s <= CONCLUSION_STEP) setStep(s);
      }
      if (savedCount) {
        const c = parseInt(savedCount, 10);
        if (!isNaN(c) && c >= 1 && c <= 15) setHarnessRowCount(c);
      }
      // Prefer AsyncStorage name; fall back to server field
      const restoredName = savedName ?? insp.harness_name ?? '';
      setHarnessName(restoredName);
      if (savedConclusion != null) setConclusion(savedConclusion);
      if (savedSafety === 'true')       setVerdict('safe');
      else if (savedSafety === 'false') setVerdict('unsafe');
    } catch (e) {
      if (!ctrl.cancelled) {
        logError(e, 'harness.load');
        toast.error(friendlyError(e, 'ჩატვირთვა ვერ მოხერხდა'));
        router.back();
      }
    } finally {
      if (!ctrl.cancelled) setLoading(false);
    }
  }, [id, router, toast, offline]);

  useEffect(() => {
    if (id) void load();
    return () => { loadCtrlRef.current.cancelled = true; };
  }, [id, load]);

  useFocusEffect(
    useCallback(() => {
      if (id) void load();
      return () => { loadCtrlRef.current.cancelled = true; };
    }, [load, id]),
  );

  // Enable step animations after initial load
  useEffect(() => {
    if (!loading) setAnimateSteps(true);
  }, [loading]);

  // Load signatures when completed
  useEffect(() => {
    if (inspection?.status !== 'completed' || !id) return;
    signaturesApi.list(id).then(setSignatures).catch(() => {});
  }, [inspection?.status, id]);

  // ── Persist mid-session state ──────────────────────────────────────────────
  useEffect(() => {
    if (!id || loading) return;
    AsyncStorage.setItem(stepKey(id), String(step)).catch(() => {});
  }, [id, step, loading]);

  useEffect(() => {
    if (!id || loading) return;
    AsyncStorage.setItem(countKey(id), String(harnessRowCount)).catch(() => {});
  }, [id, harnessRowCount, loading]);

  useEffect(() => {
    if (!id || loading) return;
    AsyncStorage.setItem(nameKey(id), harnessName).catch(() => {});
  }, [id, harnessName, loading]);

  useEffect(() => {
    if (!id || loading) return;
    AsyncStorage.setItem(conclusionKey(id), conclusion).catch(() => {});
  }, [id, conclusion, loading]);

  useEffect(() => {
    if (!id || loading) return;
    if (verdict === null) AsyncStorage.removeItem(safetyKey(id)).catch(() => {});
    else AsyncStorage.setItem(safetyKey(id), String(verdict === 'safe')).catch(() => {});
  }, [id, verdict, loading]);

  // ── patchAnswer (mirrors wizard.tsx) ──────────────────────────────────────
  const patchAnswer = useCallback(async (
    question: Question,
    mutate: (a: Answer) => Answer,
  ) => {
    if (!inspection) return;
    const current: Answer = answers[question.id] ?? {
      id: crypto.randomUUID(),
      inspection_id: inspection.id,
      question_id: question.id,
      value_bool: null,
      value_num: null,
      value_text: null,
      grid_values: null,
      comment: null,
      notes: null,
    };
    const next = mutate({ ...current });
    setAnswers(prev => {
      const updated = { ...prev, [question.id]: next };
      void offline.cacheAnswers(inspection.id, updated);
      return updated;
    });
    try {
      await offline.enqueueAnswerUpsert({
        id: next.id,
        inspection_id: next.inspection_id,
        question_id: next.question_id,
        value_bool: next.value_bool,
        value_num: next.value_num,
        value_text: next.value_text,
        grid_values: next.grid_values,
        comment: next.comment,
        notes: next.notes,
      });
    } catch (e) {
      logError(e, 'harness.patchAnswer');
      toast.error(`პასუხი ვერ შეინახა: ${toErrorMessage(e)}`);
    }
  }, [inspection, answers, offline, toast]);

  // ── Photo upload (mirrors wizard.tsx doUpload) ─────────────────────────────
  const doUpload = useCallback(async (
    uri: string,
    question: Question,
    rowKey?: string,
    location?: PhotoLocation | null,
  ) => {
    if (!inspection) return;
    setPhotoUploadCount(c => c + 1);
    const ext = 'jpg';
    const path = `${inspection.id}/${question.id}/${Date.now()}.${ext}`;
    const captionStr: string | null = rowKey ? `row:${rowKey}` : null;

    const existing = answers[question.id];
    const answerId = existing?.id ?? crypto.randomUUID();
    const baseAnswer: Answer = {
      id: answerId,
      inspection_id: inspection.id,
      question_id: question.id,
      value_bool: existing?.value_bool ?? null,
      value_num: existing?.value_num ?? null,
      value_text: existing?.value_text ?? null,
      grid_values: existing?.grid_values ?? null,
      comment: existing?.comment ?? null,
      notes: existing?.notes ?? null,
    };

    try {
      if (!offline.isOnline) {
        if (!existing) {
          setAnswers(prev => ({ ...prev, [question.id]: baseAnswer }));
          await offline.enqueueAnswerUpsert(baseAnswer);
        }
        const optimistic = await offline.enqueuePhotoUpload({
          sourceUri: uri,
          bucket: STORAGE_BUCKETS.answerPhotos,
          path,
          contentType: 'image/jpeg',
          answerId,
          inspectionId: inspection.id,
          caption: captionStr,
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
          address: null,
        });
        setPhotos(prev => ({ ...prev, [answerId]: [...(prev[answerId] ?? []), optimistic] }));
        toast.success('ფოტო შენახულია — აიტვირთება ქსელის დაბრუნებისას');
        return;
      }
      await storageApi.uploadFromUri(STORAGE_BUCKETS.answerPhotos, path, uri, 'image/jpeg', 'inspection');
      const answer = await answersApi.upsert(baseAnswer);
      if (!existing) setAnswers(prev => ({ ...prev, [question.id]: answer }));
      let photoAddress: string | null = null;
      if (!rowKey && location) {
        photoAddress = await reverseGeocode(location.latitude, location.longitude).catch(
          () => `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`,
        );
      }
      const photo = await answersApi.addPhoto(answer.id, path, {
        caption: captionStr,
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        address: photoAddress,
      });
      setPhotos(prev => ({ ...prev, [answer.id]: [...(prev[answer.id] ?? []), photo] }));
      pdfPhotoEmbed(STORAGE_BUCKETS.answerPhotos, path).catch(() => undefined);
      toast.success('ფოტო აიტვირთა');
      if (project && location) showPhotoLocationAlert(project, location, setProject).catch(() => {});
    } catch (e) {
      toast.error(`ფოტო ვერ აიტვირთა: ${toErrorMessage(e, 'ქსელის შეცდომა')}`);
    } finally {
      setPhotoUploadCount(c => Math.max(0, c - 1));
    }
  }, [inspection, answers, offline, project, toast]);

  const pickItemPhoto = useCallback(async (
    question: Question,
    row: string,
    col: string,
  ) => {
    haptic.light();
    const result = await pickPhotoWithAnnotation();
    if (!result) return;
    doUpload(result.uri, question, `${row}:col:${col}`, result.location);
  }, [pickPhotoWithAnnotation, doUpload]);

  const deletePhoto = useCallback(async (photo: AnswerPhoto) => {
    haptic.medium();
    try {
      await answersApi.removePhoto(photo.id);
      setPhotos(prev => {
        const next: Record<string, AnswerPhoto[]> = {};
        for (const [aid, list] of Object.entries(prev)) {
          next[aid] = list.filter(p => p.id !== photo.id);
        }
        return next;
      });
      toast.success('ფოტო წაიშალა');
    } catch (e) {
      toast.error(`ფოტო ვერ წაიშალა: ${toErrorMessage(e, 'ქსელის შეცდომა')}`);
    }
  }, [toast]);

  // ── Complete ───────────────────────────────────────────────────────────────
  const handleComplete = useCallback(async () => {
    if (!inspection || completing) return;
    if (!harnessName.trim()) {
      toast.error('შეავსეთ ღვედის დასახელება');
      setStep(INFO_STEP);
      return;
    }
    if (verdict === null) {
      toast.error('შეავსეთ: დასკვნა');
      return;
    }
    if (!conclusion.trim()) {
      toast.error('შეავსეთ: შენიშვნები / დასკვნა');
      return;
    }
    setCompleting(true);
    haptic.medium();
    try {
      await offline.enqueueQuestionnaireUpdate({
        id: inspection.id,
        harness_name: harnessName.trim(),
        conclusion_text: conclusion,
        is_safe_for_use: verdictToSafe(verdict),
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
      await offline.flush();
      await offline.clearQuestionnairePatch(inspection.id).catch(() => {});
      const calCompletedAt = new Date().toISOString();
      await recordCompletion(
        'inspections',
        inspection.id,
        calCompletedAt,
        `${inspection.project_id}:${inspection.template_id}`,
      ).catch(() => {});
      void queryClient.invalidateQueries({ queryKey: qk.calendar.schedules });
      void queryClient.invalidateQueries({ queryKey: qk.calendar.allInspections });
      await Promise.all([
        AsyncStorage.removeItem(stepKey(inspection.id)),
        AsyncStorage.removeItem(countKey(inspection.id)),
        AsyncStorage.removeItem(nameKey(inspection.id)),
        AsyncStorage.removeItem(conclusionKey(inspection.id)),
        AsyncStorage.removeItem(safetyKey(inspection.id)),
      ]).catch(() => {});
      haptic.success();
      router.replace(`/inspections/${inspection.id}/done` as any);
    } catch (e) {
      haptic.error();
      toast.error(`შეცდომა: ${toErrorMessage(e, 'ქსელის შეცდომა')}`);
      setCompleting(false);
    }
  }, [inspection, completing, harnessName, verdict, conclusion, offline, queryClient, router, toast]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const canGoNext = useMemo(() => {
    if (step === INFO_STEP)       return !!harnessName.trim();
    if (step === CONCLUSION_STEP) return verdict !== null && !!conclusion.trim() && !completing;
    return true; // HARNESS_STEP is always passable
  }, [step, harnessName, verdict, conclusion, completing]);

  const handleNext = useCallback(async () => {
    if (step < CONCLUSION_STEP) {
      haptic.light();
      setStep(s => s + 1);
    } else {
      await handleComplete();
    }
  }, [step, handleComplete]);

  const handlePrev = useCallback(async () => {
    if (step === INFO_STEP) {
      Alert.alert('გასვლა', 'მიმდინარე შემოწმება შენახული იქნება.', [
        { text: 'გაუქმება', style: 'cancel' },
        { text: 'გასვლა', style: 'destructive', onPress: () => router.back() },
      ]);
    } else {
      haptic.light();
      setStep(s => s - 1);
    }
  }, [step, router]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Screen edgeToEdge edges={['top']} style={{ backgroundColor: theme.colors.background }}>
        <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.semantic.success} />
        </View>
      </Screen>
    );
  }

  // ── Completed ──────────────────────────────────────────────────────────────
  if (inspection?.status === 'completed') {
    const signedCount = signatures.filter(s => s.status === 'signed' && !!s.signature_png_url).length;
    return (
      <InspectionResultView
        inspectionId={inspection.id}
        templateName="დამცავი ქამრების შემოწმება"
        requiredSignerRoles={[]}
        previewHtml={null}
        previewBusy={false}
        previewError={null}
        signedCount={signedCount}
        totalSlots={signatures.length}
        attachmentCount={0}
        pdfLocked={false}
        downloading={false}
        paywallVisible={false}
        onPaywallClose={() => {}}
        onDownloadPdf={() => {}}
        onSheetSaved={() => {
          signaturesApi.list(inspection.id).then(setSignatures).catch(() => {});
        }}
      />
    );
  }

  if (!inspection) return null;

  // ── Web: full-page wizard replaces the entire mobile multi-step flow ──────
  if (Platform.OS === 'web') {
    const projectName = project?.company_name || project?.name || '';
    return (
      <HarnessWebWizard
        projectName={projectName}
        projectLogo={project?.logo ?? undefined}
        harnessName={harnessName}
        questions={questions}
        answers={answers}
        harnessRowCount={harnessRowCount}
        onPatchAnswer={patchAnswer}
        onAddRow={() => setHarnessRowCount(Math.min(15, harnessRowCount + 1))}
        onClose={() => router.back()}
        onComplete={handleComplete}
      />
    );
  }

  // ── HARNESS_STEP: full-screen takeover ────────────────────────────────────
  if (step === HARNESS_STEP) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.card }}>
        <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
        {photoUploadCount > 0 && (
          <View pointerEvents="none" style={uploadPillStyles.wrap}>
            <View style={uploadPillStyles.pill}>
              <ActivityIndicator size="small" color={theme.colors.surface} />
              <Text style={[uploadPillStyles.text, { color: theme.colors.white }]}>
                {photoUploadCount > 1 ? `ფოტოები იტვირთება (${photoUploadCount})…` : 'ფოტო იტვირთება…'}
              </Text>
            </View>
          </View>
        )}
        <HarnessListFlow
          template={{ category: 'harness' } as any}
          questions={questions}
          answers={answers}
          photos={photos}
          harnessRowCount={harnessRowCount}
          setHarnessRowCount={setHarnessRowCount}
          onPatchAnswer={patchAnswer}
          onPickItemPhoto={pickItemPhoto}
          onDeletePhoto={deletePhoto}
          onClose={() => setStep(INFO_STEP)}
          onConclude={() => setStep(CONCLUSION_STEP)}
        />
      </View>
    );
  }

  // ── INFO_STEP + CONCLUSION_STEP: InspectionShell ───────────────────────────
  const projectName = project?.company_name || project?.name || '';

  return (
    <InspectionShell
      title="დამცავი ქამრები"
      projectName={projectName}
      step={step}
      totalSteps={TOTAL_STEPS}
      stepLabels={STEP_LABELS}
      direction={direction}
      animate={animateSteps}
      canGoNext={canGoNext}
      isLastStep={step === CONCLUSION_STEP}
      completing={completing}
      onNext={handleNext}
      onPrev={handlePrev}
      onClose={() => router.back()}
    >
      {/* ── Step 0: Info ─────────────────────────────────────────────────── */}
      {step === INFO_STEP && (
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          bottomOffset={120}
        >
          <FloatingLabelInput
            label="ღვედის სახელი / N *"
            value={harnessName}
            onChangeText={setHarnessName}
            required
          />
          <Text style={[styles.hint, { color: theme.colors.inkFaint }]}>
            მიუთითეთ ღვედის სერიული ნომერი, პარტია ან სხვა იდენტიფიკატორი.
          </Text>
        </KeyboardAwareScrollView>
      )}

      {/* ── Step 2: Conclusion ────────────────────────────────────────────── */}
      {step === CONCLUSION_STEP && (
        <ConclusionStep
          verdict={verdict}
          verdictOptions={VERDICT_OPTIONS}
          onVerdictChange={setVerdict}
          notes={conclusion}
          onNotesChange={setConclusion}
          completing={completing}
        />
      )}
    </InspectionShell>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  formContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    gap: 12,
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
  },
});

const uploadPillStyles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    zIndex: 100,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
});

