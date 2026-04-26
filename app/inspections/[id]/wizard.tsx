import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, Card, Screen } from '../../../components/ui';
import { QuestionAvatar, illustrationKeyFor } from '../../../components/QuestionAvatar';
import { Skeleton, SkeletonWizard } from '../../../components/Skeleton';
import {
  answersApi,
  inspectionsApi,
  storageApi,
  templatesApi,
} from '../../../lib/services';
import { getStorageImageDisplayUrl } from '../../../lib/imageUrl';
import { STORAGE_BUCKETS } from '../../../lib/supabase';
import { haptic } from '../../../lib/haptics';
import { useOffline, stripServerFields } from '../../../lib/offline';
import { logError, toErrorMessage } from '../../../lib/logError';
import { useToast } from '../../../lib/toast';
import { theme } from '../../../lib/theme';
import type {
  Answer,
  AnswerPhoto,
  GridValues,
  Inspection,
  Question,
  Template,
} from '../../../types/models';

const stepKey = (qid: string) => `wizard:${qid}:step`;
const harnessCountKey = (qid: string) => `wizard:${qid}:harnessCount`;

// Empty/null is always allowed — the user may not have answered yet.
function isAnswerShapeValidForType(type: Question['type'], a: Answer): boolean {
  switch (type) {
    case 'yesno':
      return a.value_bool === null || typeof a.value_bool === 'boolean';
    case 'measure':
      return a.value_num === null || typeof a.value_num === 'number';
    case 'freetext':
      return a.value_text === null || typeof a.value_text === 'string';
    case 'component_grid':
      return a.grid_values === null || (typeof a.grid_values === 'object' && !Array.isArray(a.grid_values));
    case 'photo_upload':
      return true; // photos are stored in answer_photos, not Answer.value_*
    default:
      return true;
  }
}

// --- Flat steps ---

type FlatStep =
  | { kind: 'question'; question: Question }
  | { kind: 'gridRow'; question: Question; row: string }
  | { kind: 'conclusion' };

function buildSteps(
  questions: Question[],
  harnessRowCount: number,
): FlatStep[] {
  const sorted = [...questions].sort((a, b) =>
    a.section === b.section ? a.order - b.order : a.section - b.section,
  );
  const steps: FlatStep[] = [];
  for (const q of sorted) {
    // Section 3 photo_upload is folded into the conclusion screen as
    // "საერთო ფოტოები"; section 4 freetext duplicates the conclusion textarea.
    // Keep the question rows in the DB so answers/photos still attach to a
    // question_id, just skip the standalone steps.
    if (q.type === 'photo_upload') continue;
    if (q.type === 'freetext' && q.section === 4) continue;
    if (q.type === 'component_grid' && q.grid_rows) {
      const isHarness = q.grid_rows[0] === 'N1';
      const rows = isHarness ? q.grid_rows.slice(0, harnessRowCount) : q.grid_rows;
      for (const row of rows) steps.push({ kind: 'gridRow', question: q, row });
    } else {
      steps.push({ kind: 'question', question: q });
    }
  }
  steps.push({ kind: 'conclusion' });
  return steps;
}

// Simple in-memory cache for photo display URLs to avoid redundant fetches
const photoUrlCache = new Map<string, string>();

// Whether the current step has any user input — flips the bottom button between
// "გამოტოვება" (skip) and "შემდეგი" (next). Conclusion has its own validation.
function hasAnswer(
  step: FlatStep,
  answers: Record<string, Answer>,
  photos: Record<string, AnswerPhoto[]>,
  conclusion: string,
  isSafe: boolean | null,
  harnessName: string,
  template: Template | null,
): boolean {
  if (step.kind === 'conclusion') {
    const harnessOk = template?.category !== 'harness' || harnessName.trim().length > 0;
    return isSafe !== null && conclusion.trim().length > 0 && harnessOk;
  }
  const a = answers[step.question.id];
  if (step.kind === 'gridRow') {
    const row = (a?.grid_values ?? {})[step.row];
    return !!row && Object.keys(row).some(k => k !== 'კომენტარი' || (row[k] && row[k].trim()));
  }
  const q = step.question;
  if (q.type === 'yesno') return a?.value_bool === true || a?.value_bool === false;
  if (q.type === 'measure') return a?.value_num != null;
  if (q.type === 'freetext') return !!(a?.value_text && a.value_text.trim());
  if (q.type === 'photo_upload') return !!a && (photos[a.id] ?? []).length > 0;
  return false;
}

export default function QuestionnaireWizard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const offline = useOffline();
  const insets = useSafeAreaInsets();

  const [questionnaire, setQuestionnaire] = useState<Inspection | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [photos, setPhotos] = useState<Record<string, AnswerPhoto[]>>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [harnessRowCount, setHarnessRowCount] = useState(5);
  const [conclusion, setConclusion] = useState('');
  const [isSafe, setIsSafe] = useState<boolean | null>(null);
  const [harnessName, setHarnessName] = useState('');
  const [exitModalVisible, setExitModalVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  // Step transition animation
  const stepAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    stepAnim.setValue(0);
    Animated.timing(stepAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [stepIndex]);

  // First-render fade out of the skeleton — kicks in once data is ready.
  const enterAnim = useRef(new Animated.Value(0)).current;
  const enteredRef = useRef(false);

  // Cancellation token for in-flight load(). Each load() run gets its own
  // object; when the screen blurs we flip `cancelled = true` on the active
  // token so a late-returning fetch can't overwrite fresh local state
  // (e.g. user edits between focus events).
  const loadCtrlRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    // Invalidate any prior in-flight load and start a new token.
    loadCtrlRef.current.cancelled = true;
    const ctrl = { cancelled: false };
    loadCtrlRef.current = ctrl;
    setLoading(true);
    try {
      const q = await inspectionsApi.getById(id);
      if (ctrl.cancelled) return;
      if (!q) throw new Error('არ მოიძებნა');
      // Fold any locally-queued inspection patch over the remote row — but
      // only the user-edit fields. Re-applying status/completed_at would
      // bounce the wizard↔detail redirect.
      const localPatch = await offline.hydrateQuestionnairePatch(q.id);
      if (ctrl.cancelled) return;
      const safePatch = localPatch ? stripServerFields(localPatch) : null;
      const qMerged: Inspection = { ...q, ...(safePatch ?? {}) };
      setQuestionnaire(qMerged);
      const t = await templatesApi.getById(qMerged.template_id);
      if (ctrl.cancelled) return;
      setTemplate(t);
      setConclusion(qMerged.conclusion_text ?? '');
      setIsSafe(qMerged.is_safe_for_use ?? null);
      setHarnessName(qMerged.harness_name ?? '');
      if (t) {
        const qs = await templatesApi.questions(t.id);
        if (ctrl.cancelled) return;
        setQuestions(qs);
        let remoteOk = true;
        const existing = await answersApi.list(qMerged.id).catch((err) => {
          remoteOk = false;
          logError(err, 'wizard.answers.list');
          return [] as Answer[];
        });
        if (ctrl.cancelled) return;
        const map: Record<string, Answer> = {};
        const pmap: Record<string, AnswerPhoto[]> = {};
        for (const a of existing) {
          map[a.question_id] = a;
        }
        const photoResults = await Promise.all(
          existing.map((a) =>
            answersApi.photos(a.id).catch((err) => {
              logError(err, 'wizard.answers.photos');
              return [] as AnswerPhoto[];
            }),
          ),
        );
        if (ctrl.cancelled) return;
        existing.forEach((a, i) => {
          pmap[a.id] = photoResults[i];
        });
        if (!remoteOk) {
          toast.info('მონაცემები ქეშიდან ჩაიტვირთა — სინქრონიზაცია მოხდება ხელახლა.');
        }
        // Overlay cached-local answers only for questions that still have a
        // pending queue op — otherwise a stale cache would silently clobber
        // fresh server data. When the remote fetch failed, we have no choice
        // but to fall back to the full cache.
        const cached = await offline.hydrateAnswers(qMerged.id);
        if (ctrl.cancelled) return;
        if (remoteOk) {
          const pending = await offline.pendingAnswerQuestionIds(qMerged.id);
          if (ctrl.cancelled) return;
          for (const qid of pending) {
            const a = cached[qid];
            if (a) map[qid] = a;
          }
        } else {
          for (const [questionId, a] of Object.entries(cached)) {
            map[questionId] = a;
          }
        }
        setAnswers(map);
        setPhotos(pmap);
        // Only re-cache when the remote fetch succeeded; otherwise keep
        // whatever the cache already had so we don't clobber unsynced edits
        // with an empty merge.
        if (remoteOk) {
          await offline.cacheAnswers(qMerged.id, map);
        }
      }
      // Resume where the user left off
      const [savedStep, savedHarness] = await Promise.all([
        AsyncStorage.getItem(stepKey(id)),
        AsyncStorage.getItem(harnessCountKey(id)),
      ]);
      if (ctrl.cancelled) return;
      if (savedStep) {
        const parsed = parseInt(savedStep, 10);
        if (!Number.isNaN(parsed)) setStepIndex(parsed);
      }
      if (savedHarness) {
        const parsed = parseInt(savedHarness, 10);
        if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 15) {
          setHarnessRowCount(parsed);
        }
      }
    } catch (e) {
      if (!ctrl.cancelled) {
        logError(e, 'wizard.load');
        toast.error(`ჩატვირთვა ვერ მოხერხდა: ${toErrorMessage(e)}`);
      }
    } finally {
      // Always clear loading — even if cancelled — so the UI doesn't stay
      // stuck on skeletons when the screen regains focus.
      setLoading(false);
    }
  }, [id, toast]);

  // Persist step index as the user progresses
  useEffect(() => {
    if (!id || loading) return;
    AsyncStorage.setItem(stepKey(id), String(stepIndex)).catch((e) =>
      logError(e, 'wizard.persistStep'),
    );
  }, [id, stepIndex, loading]);

  // Persist harness row count per questionnaire so returning users see the same grid size
  useEffect(() => {
    if (!id || loading) return;
    AsyncStorage.setItem(harnessCountKey(id), String(harnessRowCount)).catch((e) =>
      logError(e, 'wizard.persistHarnessCount'),
    );
  }, [id, harnessRowCount, loading]);

  // Load on mount AND when id changes (useFocusEffect alone misses the
  // initial load if id is still resolving from params when the screen
  // is already focused).
  useEffect(() => {
    if (id) void load();
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      if (id) void load();
      return () => {
        loadCtrlRef.current.cancelled = true;
      };
    }, [load, id]),
  );

  const steps = useMemo(
    () => buildSteps(questions, harnessRowCount),
    [questions, harnessRowCount],
  );
  const step = steps[stepIndex];

  // Section 3 photo_upload no longer has its own step — the answer/photos
  // attach to it but render on the conclusion screen as "საერთო ფოტოები".
  const photoQuestion = useMemo(
    () => questions.find(q => q.type === 'photo_upload') ?? null,
    [questions],
  );
  const photoAnswerId = photoQuestion ? answers[photoQuestion.id]?.id ?? null : null;
  const generalPhotos: AnswerPhoto[] = photoAnswerId ? photos[photoAnswerId] ?? [] : [];

  const patchAnswer = async (question: Question, mutate: (a: Answer) => Answer) => {
    if (!questionnaire) return;
    const current: Answer =
      answers[question.id] ??
      ({
        id: crypto.randomUUID(),
        inspection_id: questionnaire.id,
        question_id: question.id,
        value_bool: null,
        value_num: null,
        value_text: null,
        grid_values: null,
        comment: null,
        notes: null,
      } as Answer);
    const next = mutate({ ...current });
    if (!isAnswerShapeValidForType(question.type, next)) {
      logError(
        new Error(`answer/type mismatch: q=${question.id} type=${question.type}`),
        'wizard.patchAnswer.shape',
      );
      // Don't enqueue a payload that the server schema would reject — the
      // user can keep editing locally; surface a soft warning instead.
      toast.error('პასუხის ფორმატი არასწორია — გთხოვთ შეასწოროთ');
      return;
    }
    // Optimistic update so UI feels instant
    setAnswers(prev => {
      const updated = { ...prev, [question.id]: next };
      void offline.cacheAnswers(questionnaire.id, updated);
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
      logError(e, 'wizard.patchAnswer.enqueue');
      toast.error(`პასუხი ვერ შეინახა: ${toErrorMessage(e)}`);
    }
  };

  const pickPhoto = async (question: Question) => {
    if (!questionnaire) return;
    haptic.medium();
    // Photo upload needs network (blob → storage + answer_photos insert).
    // Fail fast with a clear message rather than producing misleading errors.
    if (!offline.isOnline) {
      toast.error('ფოტოს ასატვირთად საჭიროა ინტერნეტი');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: false,
    });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    try {
      // Drain any pending answer edits for this question so the server copy
      // of `answers` reflects the latest user input before we reference it.
      await offline.flush();

      const res = await fetch(asset.uri);
      const blob = await res.blob();
      const ext = asset.mimeType?.split('/')[1] ?? 'jpg';
      const path = `${questionnaire.id}/${question.id}/${Date.now()}.${ext}`;
      await storageApi.upload(
        STORAGE_BUCKETS.answerPhotos,
        path,
        blob,
        asset.mimeType ?? 'image/jpeg',
      );
      // Ensure the answer row exists server-side (RLS on answer_photos joins
      // through `answers`). Upsert is safe here — no concurrent edits at this
      // point because we just flushed the queue.
      const existing = answers[question.id];
      const answer = await answersApi.upsert({
        id: existing?.id ?? crypto.randomUUID(),
        inspection_id: questionnaire.id,
        question_id: question.id,
        value_bool: existing?.value_bool ?? null,
        value_num: existing?.value_num ?? null,
        value_text: existing?.value_text ?? null,
        grid_values: existing?.grid_values ?? null,
        comment: existing?.comment ?? null,
        notes: existing?.notes ?? null,
      });
      if (!existing) setAnswers(prev => ({ ...prev, [question.id]: answer }));
      const photo = (await answersApi.addPhoto(answer.id, path));
      const answerId = answer.id;
      // Use the local URI as storage_path so the thumbnail appears immediately
      // without waiting for a signed URL round-trip. On screen re-focus, the
      // server-returned path takes over and PhotoThumb fetches a signed URL.
      const photoForDisplay: AnswerPhoto = { ...photo, storage_path: asset.uri };
      setPhotos(prev => ({ ...prev, [answerId]: [...(prev[answerId] ?? []), photoForDisplay] }));
      toast.success('ფოტო აიტვირთა');
    } catch (e) {
      toast.error(`ფოტო ვერ აიტვირთა: ${toErrorMessage(e, 'ქსელის შეცდომა')}`);
    }
  };

  const deletePhoto = async (photo: AnswerPhoto) => {
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
  };

  const saveConclusionAndGo = async () => {
    if (!questionnaire) return;
    haptic.medium();
    const missing: string[] = [];
    if (isSafe === null) missing.push('უსაფრთხოების სტატუსი');
    if (!conclusion.trim()) missing.push('დასკვნა');
    if (template?.category === 'harness' && !harnessName.trim()) missing.push('ღვედის დასახელება');
    if (missing.length > 0) {
      toast.error(`შეავსე: ${missing.join(', ')}`);
      return;
    }
    try {
      // Merge finish into the queued patch so the freeze trigger sees a
      // single atomic update (status=completed + conclusion + safety + name).
      // Splitting these would let an older flushed patch race against the
      // freeze and wedge the queue permanently.
      await offline.enqueueQuestionnaireUpdate({
        id: questionnaire.id,
        conclusion_text: conclusion,
        is_safe_for_use: isSafe,
        harness_name: harnessName || null,
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
      // Flush now so the user sees errors (and a server-visible completion)
      // before navigating away. Offline? The queue survives — done screen
      // still renders from local state.
      await offline.flush();
      haptic.success();
      router.replace(`/inspections/${questionnaire.id}/done` as any);
    } catch (e) {
      haptic.error();
      toast.error(`ინსპექციის დასრულება ვერ მოხერხდა: ${toErrorMessage(e, 'ქსელის შეცდომა')}`);
    }
  };

  const goBack = () => {
    haptic.light();
    setStepIndex(i => Math.max(0, i - 1));
  };

  // Swipe-right anywhere on the wizard body goes to the previous step. We
  // disable the native iOS swipe-back (gestureEnabled=false on Stack.Screen)
  // so this can't accidentally exit the flow mid-inspection.
  const swipeBack = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([20, 999])
        .failOffsetY([-20, 20])
        .runOnJS(true)
        .onEnd(e => {
          if (e.translationX > 60 && stepIndex > 0) {
            goBack();
          }
        }),
    // goBack is stable (only calls setStepIndex); stepIndex is the real dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stepIndex],
  );

  // Hold the skeleton until everything we need to paint a real step has
  // arrived: data done loading, template resolved, AND a valid step at the
  // current index. Without the extra guards, react-18's between-await paints
  // can briefly show step 0 before stepIndex jumps to a saved value.
  const ready = !loading && !!template && !!step;
  if (!ready) {
    if (questionnaire?.status === 'completed') {
      return <CompletedRedirect id={questionnaire.id} />;
    }
    return (
      <Screen style={{ backgroundColor: theme.colors.card }}>
        <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <View style={styles.topBar}>
            <Text style={styles.stepperText}> </Text>
          </View>
          <SkeletonWizard />
        </SafeAreaView>
      </Screen>
    );
  }

  // Completed inspection → bounce to the dedicated detail screen. The
  // redirect fires in an effect so we don't mutate navigation during render.
  if (questionnaire?.status === 'completed') {
    return <CompletedRedirect id={questionnaire.id} />;
  }

  if (!enteredRef.current) {
    enteredRef.current = true;
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }

  const stepAnswered = hasAnswer(step, answers, photos, conclusion, isSafe, harnessName, template);
  const isYesNo = step.kind === 'question' && step.question.type === 'yesno';
  const isLast = stepIndex === steps.length - 1;
  const isScaffoldRow = step.kind === 'gridRow' && (step.question.grid_rows?.[0] ?? '') !== 'N1';

  const goNext = () => {
    haptic.light();
    if (step.kind === 'question' && step.question.type === 'measure') {
      const value = answers[step.question.id]?.value_num ?? null;
      const err = measureError(step.question, value);
      if (err) {
        haptic.error();
        toast.error(err);
        return;
      }
    }
    setStepIndex(i => Math.min(steps.length - 1, i + 1));
  };

  return (
    <Screen style={{ backgroundColor: theme.colors.card }}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <Animated.View style={{ flex: 1, opacity: enterAnim }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.card }} edges={['top']}>
        <View style={styles.topBar}>
          <View style={{ flex: 1, gap: 8 }}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${((stepIndex + 1) / steps.length) * 100}%` }]} />
            </View>
            <Text style={styles.stepperText}>
              ნაბიჯი {stepIndex + 1} / {steps.length}
            </Text>
          </View>
          <Pressable
            hitSlop={12}
            onPress={() => setExitModalVisible(true)}
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="close" size={28} color={theme.colors.ink} />
          </Pressable>
        </View>
        <GestureDetector gesture={swipeBack}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        >
          {step.kind === 'gridRow' ? (
            <Animated.View style={{ flex: 1, opacity: stepAnim }}>
              <GridRowStep
                question={step.question}
                row={step.row}
                answer={answers[step.question.id]}
                photosByAnswer={photos}
                isFirstRow={step.row === (step.question.grid_rows?.[0] ?? '')}
                harnessRowCount={harnessRowCount}
                setHarnessRowCount={setHarnessRowCount}
                onAnswer={patchAnswer}
                onPickPhoto={() => pickPhoto(step.question)}
                onDeletePhoto={deletePhoto}
                onAdvance={goNext}
              />
            </Animated.View>
          ) : (
            <Animated.View style={{ flex: 1, opacity: stepAnim }}>
              <ScrollView
                contentContainerStyle={{ padding: 20, paddingBottom: 12, gap: 16 }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
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
              </ScrollView>
            </Animated.View>
          )}

          <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
            {isYesNo ? (
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Pressable
                  onPress={() => {
                    haptic.light();
                    patchAnswer(step.question, a => ({ ...a, value_bool: true }));
                  }}
                  style={[
                    styles.choice,
                    answers[step.question.id]?.value_bool === true && {
                      backgroundColor: theme.colors.accentSoft,
                      borderColor: theme.colors.accent,
                    },
                  ]}
                >
                  <Text style={styles.choiceText}>კი</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    haptic.light();
                    patchAnswer(step.question, a => ({ ...a, value_bool: false }));
                  }}
                  style={[
                    styles.choice,
                    answers[step.question.id]?.value_bool === false && {
                      backgroundColor: theme.colors.dangerSoft,
                      borderColor: theme.colors.danger,
                    },
                  ]}
                >
                  <Text style={styles.choiceText}>არა</Text>
                </Pressable>
              </View>
            ) : null}
            {isLast ? (
              <Button
                title="დასრულება"
                style={{ paddingVertical: 14 }}
                iconRight={<Ionicons name="checkmark" size={20} color={theme.colors.white} />}
                onPress={() => {
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
                style={{ paddingVertical: 14 }}
                iconRight={
                  stepAnswered ? (
                    <Ionicons name="chevron-forward" size={18} color={theme.colors.white} />
                  ) : undefined
                }
                onPress={goNext}
              />
            )}
          </View>

        {/* Exit confirmation modal */}
        <Modal visible={exitModalVisible} transparent animationType="fade" onRequestClose={() => setExitModalVisible(false)}>
          <View style={styles.confirmOverlay}>
            <Pressable style={styles.confirmBackdrop} onPress={() => setExitModalVisible(false)} />
            <View style={styles.confirmCard}>
              <View style={{ alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="exit-outline" size={28} color={theme.colors.accent} />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.ink }}>გასვლა</Text>
                <Text style={{ fontSize: 14, color: theme.colors.inkSoft, textAlign: 'center', lineHeight: 20 }}>
                  შეინახო დრაფტად და გააგრძელო მოგვიანებით, თუ საერთოდ წაშალო?
                </Text>
              </View>
              <View style={{ gap: 8, marginTop: 4 }}>
                <Button
                  title="გაგრძელება"
                  variant="secondary"
                  onPress={() => setExitModalVisible(false)}
                />
                <Button
                  title="დრაფტად შენახვა"
                  onPress={() => {
                    setExitModalVisible(false);
                    router.back();
                  }}
                  iconLeft={<Ionicons name="archive-outline" size={18} color={theme.colors.white} />}
                />
                <Button
                  title="წაშლა"
                  variant="danger"
                  onPress={() => {
                    setExitModalVisible(false);
                    setDeleteConfirmVisible(true);
                  }}
                  iconLeft={<Ionicons name="trash-outline" size={18} color={theme.colors.danger} />}
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* Delete confirmation modal */}
        <Modal visible={deleteConfirmVisible} transparent animationType="fade" onRequestClose={() => setDeleteConfirmVisible(false)}>
          <View style={styles.confirmOverlay}>
            <Pressable style={styles.confirmBackdrop} onPress={() => setDeleteConfirmVisible(false)} />
            <View style={styles.confirmCard}>
              <View style={{ alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.dangerSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="warning-outline" size={28} color={theme.colors.danger} />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.ink }}>წაშლა?</Text>
                <Text style={{ fontSize: 14, color: theme.colors.inkSoft, textAlign: 'center', lineHeight: 20 }}>
                  კითხვარი სამუდამოდ წაიშლება.
                </Text>
              </View>
              <View style={{ gap: 8, marginTop: 4 }}>
                <Button
                  title="გაუქმება"
                  variant="secondary"
                  onPress={() => setDeleteConfirmVisible(false)}
                />
                <Button
                  title="წაშლა"
                  variant="danger"
                  onPress={async () => {
                    setDeleteConfirmVisible(false);
                    if (!id) return;
                    try {
                      await inspectionsApi.remove(id);
                      haptic.success();
                      toast.success('წაიშალა');
                      router.back();
                    } catch (e) {
                      haptic.error();
                      toast.error(toErrorMessage(e, 'ვერ წაიშალა'));
                    }
                  }}
                  iconLeft={<Ionicons name="trash" size={18} color={theme.colors.danger} />}
                />
              </View>
            </View>
          </View>
        </Modal>
        </KeyboardAvoidingView>
        </GestureDetector>
      </SafeAreaView>
      </Animated.View>
    </Screen>
  );
}

// ----- Step views -----

const QuestionStep = memo(function QuestionStep({
  question,
  answer,
  photosByAnswer,
  onAnswer,
  onPickPhoto,
  onDeletePhoto,
}: {
  question: Question;
  answer: Answer | undefined;
  photosByAnswer: Record<string, AnswerPhoto[]>;
  onAnswer: (q: Question, m: (a: Answer) => Answer) => Promise<void>;
  onPickPhoto: () => void;
  onDeletePhoto: (photo: AnswerPhoto) => Promise<void>;
}) {
  const [previewPhoto, setPreviewPhoto] = useState<AnswerPhoto | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const answerPhotos = answer ? photosByAnswer[answer.id] ?? [] : [];
  const hasNote = !!(answer?.notes && answer.notes.length > 0);
  const showNoteField = noteOpen || hasNote;
  const hasPhotos = answerPhotos.length > 0;

  const illoKey = illustrationKeyFor(question.title);

  return (
    <View style={{ gap: 20, paddingTop: 16 }}>
      <View style={{ alignItems: 'center', gap: 14 }}>
        {illoKey ? <QuestionAvatar illustrationKey={illoKey} /> : null}
        <Text style={[styles.questionTitle, { textAlign: 'center' }]}>{question.title}</Text>
      </View>

      {question.type === 'measure' ? (
        <MeasureInput
          question={question}
          initial={answer?.value_num ?? null}
          onCommit={num => onAnswer(question, a => ({ ...a, value_num: num }))}
        />
      ) : null}
      {question.type === 'freetext' ? (
        <DebouncedFreetext
          initial={answer?.value_text ?? ''}
          onCommit={value => onAnswer(question, a => ({ ...a, value_text: value }))}
        />
      ) : null}
      {question.type === 'photo_upload' ? (
        <Text style={{ color: theme.colors.inkSoft, fontSize: 14, textAlign: 'center' }}>
          დაამატე ფოტოები ქვემოთ
        </Text>
      ) : null}

      {hasPhotos ? (
        <View style={{ gap: 8 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
          >
            {answerPhotos.map(p => (
              <Pressable key={p.id} onPress={() => setPreviewPhoto(p)} style={styles.photoTile}>
                <PhotoThumb photo={p} size={120} />
              </Pressable>
            ))}
            <Pressable onPress={onPickPhoto} style={styles.addPhotoTile}>
              <Ionicons name="add" size={32} color={theme.colors.inkSoft} />
            </Pressable>
          </ScrollView>
        </View>
      ) : null}

      {showNoteField ? (
        <DebouncedNotes
          initial={answer?.notes ?? null}
          onCommit={value => onAnswer(question, a => ({ ...a, notes: value || null }))}
        />
      ) : null}

      {!hasPhotos || !showNoteField ? (
        <View style={styles.chipRow}>
          {!hasPhotos ? (
            <Pressable onPress={onPickPhoto} style={styles.assistChip}>
              <Ionicons name="camera-outline" size={16} color={theme.colors.inkSoft} />
              <Text style={styles.assistChipText}>ფოტო</Text>
            </Pressable>
          ) : null}
          {!showNoteField ? (
            <Pressable onPress={() => setNoteOpen(true)} style={styles.assistChip}>
              <Ionicons name="create-outline" size={16} color={theme.colors.inkSoft} />
              <Text style={styles.assistChipText}>შენიშვნა</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <PhotoPreviewModal
        photo={previewPhoto}
        visible={!!previewPhoto}
        onClose={() => setPreviewPhoto(null)}
        onDelete={async (photo) => {
          await onDeletePhoto(photo);
        }}
      />
    </View>
  );
});

function DebouncedFreetext({
  initial,
  onCommit,
}: {
  initial: string;
  onCommit: (value: string) => void;
}) {
  const [text, setText] = useState(initial);
  const lastCommitted = useRef(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Sync external updates (e.g., first load)
    if (initial !== lastCommitted.current) {
      setText(initial);
      lastCommitted.current = initial;
    }
  }, [initial]);

  useEffect(() => {
    if (text === lastCommitted.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      lastCommitted.current = text;
      onCommit(text);
    }, 500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [text, onCommit]);

  useEffect(() => {
    return () => {
      // Flush pending value on unmount (page change)
      if (text !== lastCommitted.current) {
        lastCommitted.current = text;
        onCommit(text);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <TextInput
      multiline
      value={text}
      onChangeText={setText}
      style={styles.textarea}
      placeholder="შეავსე აქ..."
      placeholderTextColor={theme.colors.inkFaint}
    />
  );
}

function DebouncedNotes({
  initial,
  onCommit,
}: {
  initial: string | null;
  onCommit: (value: string) => void;
}) {
  const [text, setText] = useState(initial ?? '');
  const lastCommitted = useRef(initial ?? '');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const nextInitial = initial ?? '';
    if (nextInitial !== lastCommitted.current) {
      setText(nextInitial);
      lastCommitted.current = nextInitial;
    }
  }, [initial]);

  // Debounced commit — matches the freetext/measure pattern so notes survive
  // backgrounding, keyboard dismiss, etc. without waiting on onBlur.
  useEffect(() => {
    if (text === lastCommitted.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      lastCommitted.current = text;
      onCommit(text);
    }, 500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [text, onCommit]);

  // Flush pending value on unmount so a mid-typed note isn't lost when the
  // user taps Next/Back before the debounce fires.
  useEffect(() => {
    return () => {
      if (text !== lastCommitted.current) {
        lastCommitted.current = text;
        onCommit(text);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View>
      <Text style={styles.label}>შენიშვნა</Text>
      <TextInput
        multiline
        value={text}
        onChangeText={setText}
        style={[styles.textarea, { minHeight: 100 }]}
        placeholder="დამატებითი კომენტარი (არასავალდებულო)"
        placeholderTextColor={theme.colors.inkFaint}
        maxLength={500}
      />
      <Text style={[styles.label, { textAlign: 'right', marginTop: 4, marginBottom: 0 }]}>
        {text.length}/500
      </Text>
    </View>
  );
}

// Parse "1,5" or "1.5" to a number; returns null if empty/invalid.
function parseMeasure(s: string): number | null {
  const cleaned = s.replace(',', '.').trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

// Returns an error string if the measure is out of range, null otherwise.
function measureError(q: Question, value: number | null): string | null {
  if (value === null) return null;
  if (q.min_val != null && value < q.min_val) {
    return `მინიმუმი: ${q.min_val}${q.unit ? ' ' + q.unit : ''}`;
  }
  if (q.max_val != null && value > q.max_val) {
    return `მაქსიმუმი: ${q.max_val}${q.unit ? ' ' + q.unit : ''}`;
  }
  return null;
}

function MeasureInput({
  question,
  initial,
  onCommit,
}: {
  question: Question;
  initial: number | null;
  onCommit: (value: number | null) => void;
}) {
  const [text, setText] = useState(initial == null ? '' : String(initial));
  const lastCommitted = useRef<number | null>(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initial !== lastCommitted.current) {
      setText(initial == null ? '' : String(initial));
      lastCommitted.current = initial;
    }
  }, [initial]);

  useEffect(() => {
    const parsed = parseMeasure(text);
    if (parsed === lastCommitted.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      lastCommitted.current = parsed;
      onCommit(parsed);
    }, 500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [text, onCommit]);

  useEffect(() => {
    return () => {
      const parsed = parseMeasure(text);
      if (parsed !== lastCommitted.current) {
        lastCommitted.current = parsed;
        onCommit(parsed);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parsed = parseMeasure(text);
  const error = measureError(question, parsed);
  const hasRange = question.min_val != null || question.max_val != null;

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <TextInput
          value={text}
          onChangeText={setText}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={theme.colors.inkFaint}
          style={[styles.input, { flex: 1 }]}
        />
        {question.unit ? (
          <Text style={{ fontWeight: '600', color: theme.colors.inkSoft }}>{question.unit}</Text>
        ) : null}
      </View>
      {hasRange ? (
        <Text style={{ fontSize: 12, color: theme.colors.inkSoft }}>
          დიაპაზონი: {question.min_val ?? '—'} – {question.max_val ?? '—'}
          {question.unit ? ` ${question.unit}` : ''}
        </Text>
      ) : null}
      {error ? (
        <Text style={{ fontSize: 12, color: theme.colors.danger }}>{error}</Text>
      ) : null}
    </View>
  );
}

// Renders the bottom action bar for scaffold grid rows: 3 status buttons by
// default, or 2 detail buttons + a "შემდეგი" Button when option 1 or 2 is
// selected. Lives in the global footer so the buttons sit at the same y as
// the yes/no choice buttons on other steps.
function ScaffoldFooterButtons({
  question,
  row,
  answer,
  onAnswer,
  onAdvance,
}: {
  question: Question;
  row: string;
  answer: Answer | undefined;
  onAnswer: (q: Question, m: (a: Answer) => Answer) => Promise<void>;
  onAdvance: () => void;
}) {
  const cols = question.grid_cols ?? [];
  const statusCols = cols.filter(c => c !== 'კომენტარი');
  const values: Record<string, string> = (answer?.grid_values ?? {})[row] ?? {};
  const selectedStatus = statusCols.find(c => values[c] !== undefined) ?? null;
  const noneCol = statusCols.find(c => c.includes('გააჩნია')) ?? null;
  const detailCols = statusCols.filter(c => c !== noneCol);
  const showDetails = selectedStatus !== null && selectedStatus !== noneCol;

  const setStatus = (col: string) => {
    onAnswer(question, a => {
      const grid: GridValues = { ...(a.grid_values ?? {}) };
      const prev = grid[row] ?? {};
      const cur: Record<string, string> = {};
      if (prev['კომენტარი']) cur['კომენტარი'] = prev['კომენტარი'];
      cur[col] = col;
      grid[row] = cur;
      return { ...a, grid_values: grid };
    });
  };

  const renderStatusButton = (col: string) => {
    const isSelected = selectedStatus === col;
    const { tint, bg, icon } = scaffoldColStyle(col);
    const isNone = col === noneCol;
    return (
      <Pressable
        key={col}
        onPress={() => {
          haptic.light();
          setStatus(col);
          if (isNone) onAdvance();
        }}
        style={[
          styles.statusOption,
          isSelected && { backgroundColor: bg, borderColor: tint },
        ]}
      >
        <Ionicons
          name={isSelected ? (icon as any) : 'ellipse-outline'}
          size={22}
          color={isSelected ? tint : theme.colors.inkFaint}
        />
        <Text
          style={{
            flex: 1,
            fontSize: 15,
            fontWeight: '600',
            color: isSelected ? tint : theme.colors.ink,
          }}
        >
          {col}
        </Text>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={18} color={tint} />
        )}
      </Pressable>
    );
  };

  return (
    <View style={{ gap: 8 }}>
      {detailCols.map(renderStatusButton)}
      {showDetails ? (
        <Button
          title="შემდეგი"
          style={{ paddingVertical: 14 }}
          iconRight={<Ionicons name="chevron-forward" size={18} color={theme.colors.white} />}
          onPress={() => {
            haptic.light();
            onAdvance();
          }}
        />
      ) : noneCol ? (
        renderStatusButton(noneCol)
      ) : null}
    </View>
  );
}

// Returns a tint/bg pair for scaffold status columns
function scaffoldColStyle(col: string): { tint: string; bg: string; icon: string } {
  if (col.includes('დაზიანება')) return { tint: theme.colors.danger, bg: theme.colors.dangerSoft, icon: 'close-circle' };
  if (col.includes('გამართულია')) return { tint: theme.colors.accent, bg: theme.colors.accentSoft, icon: 'checkmark-circle' };
  return { tint: theme.colors.inkSoft, bg: theme.colors.subtleSurface, icon: 'remove-circle' };
}

const GridRowStep = memo(function GridRowStep({
  question,
  row,
  answer,
  photosByAnswer,
  isFirstRow,
  harnessRowCount,
  setHarnessRowCount,
  onAnswer,
  onPickPhoto,
  onDeletePhoto,
  onAdvance,
}: {
  question: Question;
  row: string;
  answer: Answer | undefined;
  photosByAnswer: Record<string, AnswerPhoto[]>;
  isFirstRow: boolean;
  harnessRowCount: number;
  setHarnessRowCount: (n: number) => void;
  onAnswer: (q: Question, m: (a: Answer) => Answer) => Promise<void>;
  onPickPhoto: () => void;
  onDeletePhoto: (photo: AnswerPhoto) => Promise<void>;
  onAdvance: () => void;
}) {
  const cols = question.grid_cols ?? [];
  const isHarness = (question.grid_rows?.[0] ?? '') === 'N1';
  const values: Record<string, string> = (answer?.grid_values ?? {})[row] ?? {};
  const answerPhotos = answer ? photosByAnswer[answer.id] ?? [] : [];
  const hasPhotos = answerPhotos.length > 0;
  const [previewPhoto, setPreviewPhoto] = useState<AnswerPhoto | null>(null);
  // Must be unconditional — used only in the scaffold (non-harness) branch
  // but hooks cannot be called inside an `if` block.
  const [commentOpen, setCommentOpen] = useState(false);

  const setValue = (col: string, value: string | null, exclusive: boolean) => {
    onAnswer(question, a => {
      const grid: GridValues = { ...(a.grid_values ?? {}) };
      const prev = grid[row] ?? {};
      const cur: Record<string, string> = exclusive ? {} : { ...prev };
      // Preserve comment when switching status options exclusively
      if (exclusive && prev['კომენტარი']) cur['კომენტარი'] = prev['კომენტარი'];
      if (value === null) delete cur[col];
      else cur[col] = value;
      grid[row] = cur;
      return { ...a, grid_values: grid };
    });
  };

  // Scaffold (non-harness): full-height flex layout with big status buttons
  if (!isHarness) {
    const statusCols = cols.filter(c => c !== 'კომენტარი');
    const hasComment = cols.includes('კომენტარი');
    // Determine which status col is selected (exclusive)
    const selectedStatus = statusCols.find(c => values[c] !== undefined) ?? null;

    const commentValue = values['კომენტარი'] ?? '';
    const showCommentField = !!commentValue || commentOpen;
    const noneCol = statusCols.find(c => c.includes('გააჩნია')) ?? null;
    const showDetails = selectedStatus !== null && selectedStatus !== noneCol;

    return (
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, gap: 16 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View style={{ alignItems: 'center', paddingVertical: 8, gap: 12 }}>
          <QuestionAvatar illustrationKey={illustrationKeyFor(row)} />
          <Text style={{ fontSize: 22, fontWeight: '800', color: theme.colors.ink, textAlign: 'center' }}>
            {row}
          </Text>
        </View>

        {showDetails ? (
          <>
            {hasPhotos ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
              >
                {answerPhotos.map(p => (
                  <Pressable key={p.id} onPress={() => setPreviewPhoto(p)} style={styles.photoTile}>
                    <PhotoThumb photo={p} size={120} />
                  </Pressable>
                ))}
                <Pressable onPress={onPickPhoto} style={styles.addPhotoTile}>
                  <Ionicons name="add" size={32} color={theme.colors.inkSoft} />
                </Pressable>
              </ScrollView>
            ) : null}

            {hasComment && showCommentField ? (
              <TextInput
                value={commentValue}
                onChangeText={text => setValue('კომენტარი', text || null, false)}
                placeholder="კომენტარი"
                placeholderTextColor={theme.colors.inkFaint}
                style={styles.input}
                autoFocus
              />
            ) : null}

            {!hasPhotos || (hasComment && !showCommentField) ? (
              <View style={styles.chipRow}>
                {!hasPhotos ? (
                  <Pressable onPress={onPickPhoto} style={styles.assistChip}>
                    <Ionicons name="camera-outline" size={16} color={theme.colors.inkSoft} />
                    <Text style={styles.assistChipText}>ფოტო</Text>
                  </Pressable>
                ) : null}
                {hasComment && !showCommentField ? (
                  <Pressable
                    onPress={() => setCommentOpen(true)}
                    style={styles.assistChip}
                  >
                    <Ionicons name="create-outline" size={16} color={theme.colors.inkSoft} />
                    <Text style={styles.assistChipText}>კომენტარი</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </>
        ) : null}

        <PhotoPreviewModal
          photo={previewPhoto}
          visible={!!previewPhoto}
          onClose={() => setPreviewPhoto(null)}
          onDelete={async (photo) => {
            await onDeletePhoto(photo);
          }}
        />
      </ScrollView>
    );
  }

  // Harness: scrollable list of components with ✓/✗ chips
  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingTop: 16, gap: 16 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      <View style={{ alignItems: 'center', paddingVertical: 8, gap: 4 }}>
        <Text style={{ fontSize: 12, color: theme.colors.inkSoft }}>{question.title}</Text>
        <Text style={{ fontSize: 28, fontWeight: '800', color: theme.colors.ink, textAlign: 'center' }}>
          {row}
        </Text>
      </View>

      {isFirstRow ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 4,
          }}
        >
          <Text style={{ fontWeight: '600' }}>რამდენი ქამარი სულ?</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable onPress={() => setHarnessRowCount(Math.max(1, harnessRowCount - 1))}>
              <Ionicons name="remove-circle" size={28} color={theme.colors.accent} />
            </Pressable>
            <Text style={{ fontSize: 18, fontWeight: '700' }}>{harnessRowCount}</Text>
            <Pressable onPress={() => setHarnessRowCount(Math.min(15, harnessRowCount + 1))}>
              <Ionicons name="add-circle" size={28} color={theme.colors.accent} />
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        {cols.map(col => {
          const current = values[col];
          return (
            <View key={col} style={styles.harnessRow}>
              <Text style={{ flex: 1, fontSize: 13 }}>{col}</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Pressable
                  onPress={() => setValue(col, 'ვარგისია', false)}
                  style={[
                    styles.chip,
                    current === 'ვარგისია' && {
                      backgroundColor: theme.colors.accentSoft,
                      borderColor: theme.colors.accent,
                    },
                  ]}
                >
                  <Text style={{ color: current === 'ვარგისია' ? theme.colors.accent : theme.colors.inkSoft }}>
                    ✓
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setValue(col, 'დაზიანებულია', false)}
                  style={[
                    styles.chip,
                    current === 'დაზიანებულია' && {
                      backgroundColor: theme.colors.dangerSoft,
                      borderColor: theme.colors.danger,
                    },
                  ]}
                >
                  <Text style={{ color: current === 'დაზიანებულია' ? theme.colors.danger : theme.colors.inkSoft }}>
                    ✗
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>

      {hasPhotos ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
        >
          {answerPhotos.map(p => (
            <Pressable key={p.id} onPress={() => setPreviewPhoto(p)} style={styles.photoTile}>
              <PhotoThumb photo={p} size={120} />
            </Pressable>
          ))}
          <Pressable onPress={onPickPhoto} style={styles.addPhotoTile}>
            <Ionicons name="add" size={32} color={theme.colors.inkSoft} />
          </Pressable>
        </ScrollView>
      ) : (
        <View style={styles.chipRow}>
          <Pressable onPress={onPickPhoto} style={styles.assistChip}>
            <Ionicons name="camera-outline" size={16} color={theme.colors.inkSoft} />
            <Text style={styles.assistChipText}>ფოტო</Text>
          </Pressable>
        </View>
      )}

      <PhotoPreviewModal
        photo={previewPhoto}
        visible={!!previewPhoto}
        onClose={() => setPreviewPhoto(null)}
        onDelete={async (photo) => {
          await onDeletePhoto(photo);
        }}
      />
    </ScrollView>
  );
});

const ConclusionStep = memo(function ConclusionStep({
  conclusion,
  onConclusion,
  isSafe,
  onIsSafe,
  template,
  harnessName,
  onHarnessName,
  photoQuestion,
  photoAnswerId,
  photos,
  onPickPhoto,
  onDeletePhoto,
}: {
  conclusion: string;
  onConclusion: (s: string) => void;
  isSafe: boolean | null;
  onIsSafe: (b: boolean) => void;
  template: Template | null;
  harnessName: string;
  onHarnessName: (s: string) => void;
  photoQuestion: Question | null;
  photoAnswerId: string | null;
  photos: AnswerPhoto[];
  onPickPhoto: () => void;
  onDeletePhoto: (photo: AnswerPhoto) => Promise<void>;
}) {
  const needsHarness = template?.category === 'harness';
  const harnessEmpty = needsHarness && !harnessName.trim();
  const conclusionEmpty = !conclusion.trim();
  const [previewPhoto, setPreviewPhoto] = useState<AnswerPhoto | null>(null);
  const hasPhotos = photos.length > 0;

  return (
    <View style={{ gap: 18 }}>
      <View style={{ alignItems: 'center', paddingTop: 8 }}>
        <QuestionAvatar illustrationKey="conclusion" />
      </View>
      {needsHarness ? (
        <View>
          <Text style={styles.label}>
            ღვედის დასახელება <Text style={{ color: theme.colors.danger }}>*</Text>
          </Text>
          <TextInput
            value={harnessName}
            onChangeText={onHarnessName}
            style={[styles.input, harnessEmpty && styles.inputError]}
            placeholder="მაგ. Petzl NEWTON"
            placeholderTextColor={theme.colors.inkFaint}
          />
          {harnessEmpty ? (
            <Text style={styles.fieldError}>სავალდებულო ველი</Text>
          ) : null}
        </View>
      ) : null}
      <View>
        <Text style={styles.label}>
          დასკვნა <Text style={{ color: theme.colors.danger }}>*</Text>
        </Text>
        <TextInput
          multiline
          value={conclusion}
          onChangeText={onConclusion}
          style={[styles.textarea, conclusionEmpty && styles.inputError]}
          placeholder="აღწერე დეტალურად..."
          placeholderTextColor={theme.colors.inkFaint}
        />
        {conclusionEmpty ? (
          <Text style={styles.fieldError}>სავალდებულო ველი</Text>
        ) : null}
      </View>
      {photoQuestion ? (
        <View style={{ gap: 8 }}>
          <Text style={styles.label}>საერთო ფოტოები</Text>
          {hasPhotos ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
            >
              {photos.map(p => (
                <Pressable key={p.id} onPress={() => setPreviewPhoto(p)} style={styles.photoTile}>
                  <PhotoThumb photo={p} size={120} />
                </Pressable>
              ))}
              <Pressable onPress={onPickPhoto} style={styles.addPhotoTile}>
                <Ionicons name="add" size={32} color={theme.colors.inkSoft} />
              </Pressable>
            </ScrollView>
          ) : (
            <View style={styles.chipRow}>
              <Pressable onPress={onPickPhoto} style={styles.assistChip}>
                <Ionicons name="camera-outline" size={16} color={theme.colors.inkSoft} />
                <Text style={styles.assistChipText}>ფოტო</Text>
              </Pressable>
            </View>
          )}
          <PhotoPreviewModal
            photo={previewPhoto}
            visible={!!previewPhoto}
            onClose={() => setPreviewPhoto(null)}
            onDelete={async (photo) => {
              await onDeletePhoto(photo);
            }}
          />
        </View>
      ) : null}
      <View style={{ gap: 10, paddingTop: 4 }}>
        <Text style={styles.decisionHeader}>გადაწყვეტილება</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable
            onPress={() => {
              haptic.light();
              onIsSafe(true);
            }}
            style={[
              styles.decisionButton,
              isSafe === true
                ? { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }
                : { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accentSoft },
            ]}
          >
            <Ionicons
              name="shield-checkmark"
              size={28}
              color={isSafe === true ? theme.colors.white : theme.colors.accent}
            />
            <Text
              style={[
                styles.decisionLabel,
                { color: isSafe === true ? theme.colors.white : theme.colors.accent },
              ]}
            >
              უსაფრთხოა
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              haptic.light();
              onIsSafe(false);
            }}
            style={[
              styles.decisionButton,
              isSafe === false
                ? { backgroundColor: theme.colors.danger, borderColor: theme.colors.danger }
                : { backgroundColor: theme.colors.dangerSoft, borderColor: theme.colors.dangerSoft },
            ]}
          >
            <Ionicons
              name="warning"
              size={28}
              color={isSafe === false ? theme.colors.white : theme.colors.danger}
            />
            <Text
              style={[
                styles.decisionLabel,
                { color: isSafe === false ? theme.colors.white : theme.colors.danger },
              ]}
            >
              არ არის უსაფრთხო
            </Text>
          </Pressable>
        </View>
        {isSafe === null ? (
          <Text style={styles.fieldError}>აუცილებლად აირჩიე სტატუსი.</Text>
        ) : null}
      </View>
    </View>
  );
});

const PhotoThumb = memo(function PhotoThumb({ photo, size = 80 }: { photo: AnswerPhoto; size?: number }) {
  // Local device URIs (fresh upload) can be used directly without a network round-trip.
  const isLocal = /^(file|content|ph|asset):\/\//.test(photo.storage_path);
  const [uri, setUri] = useState<string | null>(isLocal ? photo.storage_path : null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(!isLocal);
  const fadeAnim = useRef(new Animated.Value(isLocal ? 1 : 0)).current;

  const load = useCallback(async () => {
    if (isLocal) return;
    const cacheKey = `${STORAGE_BUCKETS.answerPhotos}:${photo.storage_path}`;
    if (photoUrlCache.has(cacheKey)) {
      const url = photoUrlCache.get(cacheKey)!;
      setUri(url);
      setLoading(false);
      setError(false);
      fadeAnim.setValue(1);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const url = await getStorageImageDisplayUrl(STORAGE_BUCKETS.answerPhotos, photo.storage_path);
      photoUrlCache.set(cacheKey, url);
      setUri(url);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } catch {
      const fallback = storageApi.publicUrl(STORAGE_BUCKETS.answerPhotos, photo.storage_path);
      photoUrlCache.set(cacheKey, fallback);
      setUri(fallback);
      fadeAnim.setValue(1);
    } finally {
      setLoading(false);
    }
  }, [photo.storage_path, isLocal, fadeAnim]);

  useEffect(() => {
    void load();
  }, [load]);

  const containerStyle = [styles.photoThumb, { width: size, height: size }];

  if (loading) {
    return (
      <View style={containerStyle}>
        <Skeleton width={size * 0.6} height={size * 0.6} radius={size * 0.15} />
      </View>
    );
  }

  if (error || !uri) {
    return (
      <Pressable onPress={load} style={containerStyle}>
        <Ionicons name="refresh" size={22} color={theme.colors.inkFaint} />
        <Text style={{ fontSize: 10, color: theme.colors.inkFaint, marginTop: 4 }}>განახლება</Text>
      </Pressable>
    );
  }

  return (
    <Animated.Image
      source={{ uri }}
      style={containerStyle}
      resizeMode="cover"
      onError={() => setError(true)}
    />
  );
});

function PhotoPreviewModal({
  photo,
  visible,
  onClose,
  onDelete,
}: {
  photo: AnswerPhoto | null;
  visible: boolean;
  onClose: () => void;
  onDelete: (photo: AnswerPhoto) => Promise<void>;
}) {
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!photo) {
      setUri(null);
      setError(false);
      return;
    }
    const isLocal = /^(file|content|ph|asset):\/\//.test(photo.storage_path);
    if (isLocal) {
      setUri(photo.storage_path);
      return;
    }
    setLoading(true);
    setError(false);
    let cancelled = false;
    getStorageImageDisplayUrl(STORAGE_BUCKETS.answerPhotos, photo.storage_path)
      .then(url => { if (!cancelled) setUri(url); })
      .catch((e) => {
        logError(e, 'wizard.photoDisplayUrl');
        if (!cancelled) setUri(storageApi.publicUrl(STORAGE_BUCKETS.answerPhotos, photo.storage_path));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [photo]);

  if (!visible || !photo) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.previewOverlay}>
        <Pressable style={styles.previewBackdrop} onPress={onClose} />
        {loading || !uri ? (
          <View style={[styles.previewImage, { alignItems: 'center', justifyContent: 'center' }]}>
            <Skeleton width={120} height={120} radius={12} />
          </View>
        ) : error ? (
          <View style={[styles.previewImage, { alignItems: 'center', justifyContent: 'center', gap: 12 }]}>
            <Ionicons name="image-outline" size={48} color="rgba(255,255,255,0.5)" />
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>ფოტო ვერ ჩაიტვირთა</Text>
          </View>
        ) : (
          <Image
            source={{ uri }}
            style={styles.previewImage}
            resizeMode="contain"
            onError={() => setError(true)}
          />
        )}
        <Pressable
          style={styles.previewDeleteBtn}
          onPress={async () => {
            await onDelete(photo);
            onClose();
          }}
        >
          <Ionicons name="trash-outline" size={22} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>წაშლა</Text>
        </Pressable>
        <Pressable style={styles.previewCloseBtn} onPress={onClose}>
          <Ionicons name="close" size={28} color="#fff" />
        </Pressable>
      </View>
    </Modal>
  );
}

function PhotoGrid({ photos }: { photos: AnswerPhoto[] }) {
  if (!photos.length) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      {photos.map(p => <PhotoThumb key={p.id} photo={p} />)}
    </View>
  );
}

/**
 * Blank placeholder that fires a one-shot redirect to the inspection detail
 * screen. Used when the wizard route is hit for an already-completed
 * inspection — the canonical landing is `/inspections/[id]`, not here.
 */
function CompletedRedirect({ id }: { id: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/inspections/${id}` as any);
  }, [id, router]);
  return null;
}

const styles = StyleSheet.create({
  topBar: {
    height: 48,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
  },
  stepperText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.inkSoft,
  },
  progressTrack: {
    height: 4,
    backgroundColor: theme.colors.hairline,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
    borderRadius: 2,
  },
  closeBtn: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  questionTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.ink,
    lineHeight: 34,
    textAlign: 'center',
    paddingHorizontal: 8,
    paddingVertical: theme.spacing(4),
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingTop: 4,
  },
  assistChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.hairline,
    backgroundColor: theme.colors.card,
  },
  assistChipText: {
    fontSize: 13,
    color: theme.colors.inkSoft,
    fontWeight: '500',
  },
  choice: {
    flex: 1,
    paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: theme.colors.subtleSurface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 6,
  },
  choiceText: { fontSize: 18, fontWeight: '700' },
  textarea: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    padding: 12,
    minHeight: 140,
    textAlignVertical: 'top',
    fontSize: 15,
    color: theme.colors.ink,
  },
  input: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    padding: 12,
    fontSize: 15,
    color: theme.colors.ink,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.inkSoft,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  footer: {
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: theme.colors.card,
  },
  confirmOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  confirmCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    gap: 4,
    ...theme.shadow.card,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: theme.colors.subtleSurface,
    borderRadius: 14,
  },
  harnessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: theme.colors.subtleSurface,
    borderRadius: 10,
  },
  chip: {
    width: 40,
    height: 34,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: theme.colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: theme.colors.subtleSurface,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  safetyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: theme.colors.subtleSurface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  decisionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: theme.colors.inkSoft,
  },
  decisionButton: {
    flex: 1,
    minHeight: 92,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  decisionLabel: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  inputError: {
    borderColor: theme.colors.danger,
  },
  fieldError: {
    fontSize: 12,
    color: theme.colors.danger,
    marginTop: 4,
  },
  photoThumb: {
    width: 80,
    height: 80,
    backgroundColor: theme.colors.subtleSurface,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoTile: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    overflow: 'hidden',
  },
  addPhotoTile: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.hairline,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.subtleSurface,
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  previewImage: {
    width: '90%',
    height: '70%',
  },
  previewDeleteBtn: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.danger,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  previewCloseBtn: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
