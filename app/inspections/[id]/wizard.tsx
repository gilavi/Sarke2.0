import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, Card, Screen } from '../../../components/ui';
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
import { useOffline } from '../../../lib/offline';
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

export default function QuestionnaireWizard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const offline = useOffline();

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

  // Cancellation token for in-flight load(). Each load() run gets its own
  // object; when the screen blurs we flip `cancelled = true` on the active
  // token so a late-returning fetch can't overwrite fresh local state
  // (e.g. user edits between focus events).
  const loadCtrlRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  const load = useCallback(async () => {
    // Invalidate any prior in-flight load and start a new token.
    loadCtrlRef.current.cancelled = true;
    const ctrl = { cancelled: false };
    loadCtrlRef.current = ctrl;
    setLoading(true);
    if (!id) {
      setLoading(false);
      return;
    }
    // Safety timeout: force-clear loading if something hangs
    const timeoutId = setTimeout(() => {
      if (!ctrl.cancelled) {
        setLoading(false);
      }
    }, 15000);
    try {
      const q = await inspectionsApi.getById(id);
      if (ctrl.cancelled) return;
      if (!q) throw new Error('არ მოიძებნა');
      // Fold any locally-queued inspection patch over the remote row.
      const localPatch = await offline.hydrateQuestionnairePatch(q.id);
      if (ctrl.cancelled) return;
      const qMerged: Inspection = { ...q, ...(localPatch ?? {}) };
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
        const existing = await answersApi.list(qMerged.id).catch(() => {
          remoteOk = false;
          return [] as Answer[];
        });
        if (ctrl.cancelled) return;
        const map: Record<string, Answer> = {};
        const pmap: Record<string, AnswerPhoto[]> = {};
        for (const a of existing) {
          map[a.question_id] = a;
          pmap[a.id] = await answersApi.photos(a.id).catch(() => []);
          if (ctrl.cancelled) return;
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
    } catch (e: any) {
      if (!ctrl.cancelled) {
        toast.error(`ჩატვირთვა ვერ მოხერხდა: ${e?.message ?? 'ქსელის შეცდომა'}`);
      }
    } finally {
      clearTimeout(timeoutId);
      // Always clear loading — even if cancelled — so the UI doesn't stay
      // stuck on skeletons when the screen regains focus.
      setLoading(false);
    }
  }, [id, toast]);

  // Persist step index as the user progresses
  useEffect(() => {
    if (!id || loading) return;
    void AsyncStorage.setItem(stepKey(id), String(stepIndex));
  }, [id, stepIndex, loading]);

  // Persist harness row count per questionnaire so returning users see the same grid size
  useEffect(() => {
    if (!id || loading) return;
    void AsyncStorage.setItem(harnessCountKey(id), String(harnessRowCount));
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
    } catch (e: any) {
      toast.error(`პასუხი ვერ შეინახა: ${e?.message ?? 'ქსელის შეცდომა'}`);
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
    } catch (e: any) {
      toast.error(`ფოტო ვერ აიტვირთა: ${e?.message ?? 'ქსელის შეცდომა'}`);
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
    } catch (e: any) {
      toast.error(`ფოტო ვერ წაიშალა: ${e?.message ?? 'ქსელის შეცდომა'}`);
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
    } catch (e: any) {
      haptic.error();
      toast.error(`ინსპექციის დასრულება ვერ მოხერხდა: ${e?.message ?? 'ქსელის შეცდომა'}`);
    }
  };

  if (loading) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'კითხვარი' }} />
        <SafeAreaView style={{ flex: 1 }} edges={[]}>
          <View style={{ padding: 16, paddingTop: 12 }}>
            <View style={styles.progressSegments}>
              <View style={[styles.progressSegment, styles.progressSegmentCurrent]} />
              <View style={styles.progressSegment} />
              <View style={styles.progressSegment} />
            </View>
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

  if (!step) {
    return (
      <Screen>
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: theme.colors.inkSoft }}>შინაარსი ვერ ჩაიტვირთა.</Text>
        </SafeAreaView>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen
        // Static "კითხვარი" gives the user a clear location. Template names
        // are often too long for iOS nav bars and get truncated ugly; the
        // name surfaces instead on the start screen and step progress.
        options={{
          headerShown: true,
          title: 'კითხვარი',
          headerRight: () => (
            <Pressable
              hitSlop={10}
              onPress={() => setExitModalVisible(true)}
            >
              <Text style={{ color: theme.colors.inkSoft, fontSize: 15 }}>გასვლა</Text>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        {/* Modern segmented progress */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
          <View style={styles.progressSegments}>
            {steps.map((s, i) => (
              <View
                key={i}
                style={[
                  styles.progressSegment,
                  i <= stepIndex && styles.progressSegmentActive,
                  i === stepIndex && styles.progressSegmentCurrent,
                ]}
              />
            ))}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.accent }}>
              {step.kind === 'question' ? (step.question.section ? `სექცია ${step.question.section}` : 'კითხვა') : step.kind === 'gridRow' ? 'კომპონენტი' : 'დასკვნა'}
            </Text>
            <Text style={{ fontSize: 12, color: theme.colors.inkSoft }}>
              {stepIndex + 1} / {steps.length}
            </Text>
          </View>
        </View>

        {step.kind === 'gridRow' ? (
          // Full-height layout for grid rows — options are large and thumb-friendly
          <Animated.View style={{ flex: 1, opacity: stepAnim }}>
            <GridRowStep
              question={step.question}
              row={step.row}
              answer={answers[step.question.id]}
              isFirstRow={step.row === (step.question.grid_rows?.[0] ?? '')}
              harnessRowCount={harnessRowCount}
              setHarnessRowCount={setHarnessRowCount}
              onAnswer={patchAnswer}
              onPickPhoto={() => pickPhoto(step.question)}
            />
          </Animated.View>
        ) : (
          <Animated.View style={{ flex: 1, opacity: stepAnim }}>
            <ScrollView
              contentContainerStyle={{ padding: 16, gap: 16 }}
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
              />
            )}
          </ScrollView>
          </Animated.View>
        )}

        <View style={styles.footer}>
          <Button
            title="უკან"
            variant="secondary"
            style={{ flex: 1, paddingVertical: 14 }}
            disabled={stepIndex === 0}
            iconLeft={<Ionicons name="chevron-back" size={18} color={stepIndex === 0 ? theme.colors.inkFaint : theme.colors.ink} />}
            onPress={() => {
              haptic.light();
              setStepIndex(i => Math.max(0, i - 1));
            }}
          />
          {stepIndex < steps.length - 1 ? (
            <Button
              title="შემდეგი"
              style={{ flex: 2, paddingVertical: 14 }}
              iconRight={<Ionicons name="chevron-forward" size={18} color={theme.colors.white} />}
              onPress={() => {
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
              }}
            />
          ) : (
            <Button
              title="დასრულება"
              style={{ flex: 2, paddingVertical: 14 }}
              iconRight={<Ionicons name="checkmark" size={20} color={theme.colors.white} />}
              onPress={() => {
                haptic.medium();
                saveConclusionAndGo();
              }}
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
                    router.replace('/(tabs)/home' as any);
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
                      router.replace('/(tabs)/home' as any);
                    } catch (e: any) {
                      haptic.error();
                      toast.error(e?.message ?? 'ვერ წაიშალა');
                    }
                  }}
                  iconLeft={<Ionicons name="trash" size={18} color={theme.colors.danger} />}
                />
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
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
  const answerPhotos = answer ? photosByAnswer[answer.id] ?? [] : [];

  return (
    <View style={{ gap: 20, paddingVertical: 8 }}>
      <View style={styles.questionCard}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.accent, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
          კითხვა
        </Text>
        <Text style={{ fontSize: 20, fontWeight: '700', color: theme.colors.ink, lineHeight: 28 }}>
          {question.title}
        </Text>
      </View>

      <View style={{ gap: 14 }}>
        {question.type === 'yesno' ? (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable
              onPress={() => {
                haptic.light();
                onAnswer(question, a => ({ ...a, value_bool: true }));
              }}
              style={[
                styles.choice,
                answer?.value_bool === true && { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accent },
              ]}
            >
              <Text style={styles.choiceText}>კი</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                haptic.light();
                onAnswer(question, a => ({ ...a, value_bool: false }));
              }}
              style={[
                styles.choice,
                answer?.value_bool === false && { backgroundColor: theme.colors.dangerSoft, borderColor: theme.colors.danger },
              ]}
            >
              <Text style={styles.choiceText}>არა</Text>
            </Pressable>
          </View>
        ) : null}
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
          <Text style={{ color: theme.colors.inkSoft, fontSize: 14 }}>
            დაამატე ფოტოები ქვემოთ მოცემული + ღილაკით
          </Text>
        ) : null}
      </View>

      {/* Photo row */}
      <View style={[styles.questionCard, { gap: 10 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.photoCountLabel}>ფოტოები ({answerPhotos.length})</Text>
          {answerPhotos.length > 0 && (
            <Text style={{ fontSize: 11, color: theme.colors.inkFaint }}>
              დააჭირე გასადიდებლად
            </Text>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
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

      {/* Notes */}
      <View style={styles.questionCard}>
        <DebouncedNotes
          initial={answer?.notes ?? null}
          onCommit={value => onAnswer(question, a => ({ ...a, notes: value || null }))}
        />
      </View>

      {/* Preview Modal */}
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
  isFirstRow,
  harnessRowCount,
  setHarnessRowCount,
  onAnswer,
  onPickPhoto,
}: {
  question: Question;
  row: string;
  answer: Answer | undefined;
  isFirstRow: boolean;
  harnessRowCount: number;
  setHarnessRowCount: (n: number) => void;
  onAnswer: (q: Question, m: (a: Answer) => Answer) => Promise<void>;
  onPickPhoto: () => void;
}) {
  const cols = question.grid_cols ?? [];
  const isHarness = (question.grid_rows?.[0] ?? '') === 'N1';
  const values: Record<string, string> = (answer?.grid_values ?? {})[row] ?? {};

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

    return (
      <ScrollView
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 10 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
        {/* Component name header */}
        <Text style={{ fontSize: 12, color: theme.colors.inkSoft, marginBottom: 0 }}>{question.title}</Text>
        <Text style={{ fontSize: 26, fontWeight: '800', color: theme.colors.ink, marginBottom: 6 }}>{row}</Text>

        {/* Status buttons — compact rows */}
        <View style={{ gap: 8 }}>
          {statusCols.map(col => {
            const isSelected = selectedStatus === col;
            const { tint, bg, icon } = scaffoldColStyle(col);
            return (
              <Pressable
                key={col}
                onPress={() => setValue(col, col, true)}
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
          })}
        </View>

        {/* Comment field */}
        {hasComment ? (
          <TextInput
            value={values['კომენტარი'] ?? ''}
            onChangeText={text => setValue('კომენტარი', text || null, false)}
            placeholder="კომენტარი (სურვილისამებრ)"
            placeholderTextColor={theme.colors.inkFaint}
            style={[styles.input, { marginTop: 10 }]}
          />
        ) : null}

        {/* Photo button */}
        <Pressable onPress={onPickPhoto} style={styles.photoRowBtn}>
          <Ionicons name="camera-outline" size={18} color={theme.colors.inkSoft} />
          <Text style={{ color: theme.colors.inkSoft, fontSize: 13 }}>ფოტო</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // Harness: scrollable list of components with ✓/✗ chips
  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 14 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      <Text style={{ fontSize: 11, color: theme.colors.inkSoft }}>{question.title}</Text>
      <Text style={{ fontSize: 24, fontWeight: '800', color: theme.colors.ink }}>{row}</Text>

      {isFirstRow ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: theme.colors.subtleSurface,
            borderRadius: 12,
            padding: 10,
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

      <Button title="ფოტო" variant="secondary" onPress={onPickPhoto} />
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
}: {
  conclusion: string;
  onConclusion: (s: string) => void;
  isSafe: boolean | null;
  onIsSafe: (b: boolean) => void;
  template: Template | null;
  harnessName: string;
  onHarnessName: (s: string) => void;
}) {
  const needsHarness = template?.category === 'harness';
  const harnessEmpty = needsHarness && !harnessName.trim();
  const conclusionEmpty = !conclusion.trim();

  return (
    <View style={{ gap: 14 }}>
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
      <View>
        <Text style={styles.label}>
          უსაფრთხოების სტატუსი <Text style={{ color: theme.colors.danger }}>*</Text>
        </Text>
        <View style={{ gap: 10 }}>
          <Pressable
            onPress={() => {
              haptic.light();
              onIsSafe(true);
            }}
            style={[
              styles.safetyOption,
              isSafe === true && { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accent },
            ]}
          >
            <Ionicons
              name={isSafe === true ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={isSafe === true ? theme.colors.accent : theme.colors.inkSoft}
            />
            <Text style={{ fontSize: 14, fontWeight: '600' }}>უსაფრთხოა</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              haptic.light();
              onIsSafe(false);
            }}
            style={[
              styles.safetyOption,
              isSafe === false && { backgroundColor: theme.colors.dangerSoft, borderColor: theme.colors.danger },
            ]}
          >
            <Ionicons
              name={isSafe === false ? 'close-circle' : 'ellipse-outline'}
              size={22}
              color={isSafe === false ? theme.colors.danger : theme.colors.inkSoft}
            />
            <Text style={{ fontSize: 14, fontWeight: '600' }}>არ არის უსაფრთხო</Text>
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
      .catch(() => {
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
  progressSegments: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.subtleSurface,
  },
  progressSegmentActive: {
    backgroundColor: theme.colors.accentSoft,
  },
  progressSegmentCurrent: {
    backgroundColor: theme.colors.accent,
  },
  progressBg: {
    height: 6,
    backgroundColor: theme.colors.subtleSurface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: 6, backgroundColor: theme.colors.accent },
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
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.hairline,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
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
  scaffoldOptionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: theme.colors.hairline,
    backgroundColor: theme.colors.card,
  },
  questionCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.hairline,
    ...theme.shadow.card,
  },
  photoRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: theme.colors.subtleSurface,
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
  photoCountLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.inkSoft,
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
