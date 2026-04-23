import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, Card, Screen } from '../../components/ui';
import {
  answersApi,
  certificatesApi,
  inspectionsApi,
  qualificationsApi,
  storageApi,
  templatesApi,
} from '../../lib/services';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { useToast } from '../../lib/toast';
import { useOffline } from '../../lib/offline';
import { theme } from '../../lib/theme';
import type {
  Answer,
  AnswerPhoto,
  Certificate,
  GridValues,
  Inspection,
  Qualification,
  Question,
  Template,
} from '../../types/models';
import { supabase } from '../../lib/supabase';

const stepKey = (qid: string) => `wizard:${qid}:step`;
const harnessCountKey = (qid: string) => `wizard:${qid}:harnessCount`;

// --- Flat steps ---

type FlatStep =
  | { kind: 'question'; question: Question }
  | { kind: 'gridRow'; question: Question; row: string }
  | { kind: 'certificates' }
  | { kind: 'conclusion' };

function buildSteps(
  questions: Question[],
  harnessRowCount: number,
  requiredCertTypes: string[],
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
  if (requiredCertTypes.length > 0) {
    steps.push({ kind: 'certificates' });
  }
  steps.push({ kind: 'conclusion' });
  return steps;
}

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
  const [qualifications, setQualifications] = useState<Qualification[]>([]);

  // Cancellation token for in-flight load(). Each load() run gets its own
  // object; when the screen blurs we flip `cancelled = true` on the active
  // token so a late-returning fetch can't overwrite fresh local state
  // (e.g. user edits between focus events).
  const loadCtrlRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  const load = useCallback(async () => {
    if (!id) return;
    // Invalidate any prior in-flight load and start a new token.
    loadCtrlRef.current.cancelled = true;
    const ctrl = { cancelled: false };
    loadCtrlRef.current = ctrl;
    setLoading(true);
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
        // Overlay cached-local answers so unsynced edits survive app restarts.
        const cached = await offline.hydrateAnswers(qMerged.id);
        if (ctrl.cancelled) return;
        for (const [questionId, a] of Object.entries(cached)) {
          map[questionId] = a;
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
      const freshQuals = await qualificationsApi.list().catch(() => []);
      if (ctrl.cancelled) return;
      setQualifications(freshQuals);
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
      if (ctrl.cancelled) return;
      toast.error(`ჩატვირთვა ვერ მოხერხდა: ${e?.message ?? 'ქსელის შეცდომა'}`);
    } finally {
      if (!ctrl.cancelled) setLoading(false);
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

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        // Screen lost focus — invalidate the in-flight load so its late
        // setState calls can't clobber edits made on the next focus.
        loadCtrlRef.current.cancelled = true;
      };
    }, [load]),
  );

  // Stable reference: re-join only when the underlying array changes, not on
  // every render. The memoized steps below depend on this key.
  const requiredCertTypesKey = (template?.required_cert_types ?? []).join(',');
  const requiredCertTypes = useMemo(
    () => template?.required_cert_types ?? [],
    [requiredCertTypesKey],
  );
  const steps = useMemo(
    () => buildSteps(questions, harnessRowCount, requiredCertTypes),
    [questions, harnessRowCount, requiredCertTypes],
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
      });
    } catch (e: any) {
      toast.error(`პასუხი ვერ შეინახა: ${e?.message ?? 'ქსელის შეცდომა'}`);
    }
  };

  const pickPhoto = async (question: Question) => {
    if (!questionnaire) return;
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
      let answer = answers[question.id];
      if (!answer) {
        answer = (await answersApi.upsert({
          id: crypto.randomUUID(),
          inspection_id: questionnaire.id,
          question_id: question.id,
        }));
        setAnswers(prev => ({ ...prev, [question.id]: answer as Answer }));
      }
      const photo = (await answersApi.addPhoto(answer.id, path));
      const answerId = answer.id;
      setPhotos(prev => ({ ...prev, [answerId]: [...(prev[answerId] ?? []), photo] }));
      toast.success('ფოტო აიტვირთა');
    } catch (e: any) {
      toast.error(`ფოტო ვერ აიტვირთა: ${e?.message ?? 'ქსელის შეცდომა'}`);
    }
  };

  const saveConclusionAndGo = async () => {
    if (!questionnaire) return;
    const missing: string[] = [];
    if (isSafe === null) missing.push('უსაფრთხოების სტატუსი');
    if (!conclusion.trim()) missing.push('დასკვნა');
    if (template?.category === 'harness' && !harnessName.trim()) missing.push('ღვედის დასახელება');
    if (missing.length > 0) {
      toast.error(`შეავსე: ${missing.join(', ')}`);
      return;
    }
    try {
      await offline.enqueueQuestionnaireUpdate({
        id: questionnaire.id,
        conclusion_text: conclusion,
        is_safe_for_use: isSafe,
        harness_name: harnessName || null,
      });
      router.push(`/questionnaire/${questionnaire.id}/signing` as any);
    } catch (e: any) {
      toast.error(`დასკვნის შენახვა ვერ მოხერხდა: ${e?.message ?? 'ქსელის შეცდომა'}`);
    }
  };

  if (loading) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'იტვირთება...' }} />
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={theme.colors.accent} />
        </SafeAreaView>
      </Screen>
    );
  }

  // Completed questionnaire -> result view, not wizard
  if (questionnaire?.status === 'completed') {
    return (
      <ResultView
        questionnaire={questionnaire}
        template={template}
        onClose={() => router.back()}
      />
    );
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
              onPress={() => {
                Alert.alert(
                  'გასვლა',
                  'შეინახო დრაფტად და გააგრძელო მოგვიანებით, თუ საერთოდ წაშალო?',
                  [
                    { text: 'გაგრძელება', style: 'cancel' },
                    {
                      text: 'დრაფტად შენახვა',
                      onPress: () => router.replace('/(tabs)/home' as any),
                    },
                    {
                      text: 'წაშლა',
                      style: 'destructive',
                      onPress: () => {
                        Alert.alert('წაშლა?', 'კითხვარი სამუდამოდ წაიშლება.', [
                          { text: 'გაუქმება', style: 'cancel' },
                          {
                            text: 'წაშლა',
                            style: 'destructive',
                            onPress: async () => {
                              if (!id) return;
                              try {
                                await inspectionsApi.remove(id);
                                toast.success('წაიშალა');
                                router.replace('/(tabs)/home' as any);
                              } catch (e: any) {
                                toast.error(e?.message ?? 'ვერ წაიშალა');
                              }
                            },
                          },
                        ]);
                      },
                    },
                  ],
                );
              }}
            >
              <Text style={{ color: theme.colors.inkSoft, fontSize: 15 }}>გასვლა</Text>
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={{ flex: 1 }} edges={[]}>
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <View style={styles.progressBg}>
            <View
              style={[
                styles.progressFill,
                { width: `${((stepIndex + 1) / steps.length) * 100}%` },
              ]}
            />
          </View>
          <Text style={{ fontSize: 11, color: theme.colors.inkSoft, textAlign: 'center', marginTop: 4 }}>
            {stepIndex + 1} / {steps.length}
          </Text>
        </View>

        {step.kind === 'gridRow' ? (
          // Full-height layout for grid rows — options are large and thumb-friendly
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
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
            {step.kind === 'question' ? (
              <QuestionStep
                question={step.question}
                answer={answers[step.question.id]}
                photosByAnswer={photos}
                onAnswer={patchAnswer}
                onPickPhoto={() => pickPhoto(step.question)}
              />
            ) : step.kind === 'certificates' ? (
              <QualificationsStep
                requiredTypes={requiredCertTypes}
                quals={qualifications}
                onQualsChange={setQualifications}
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
        )}

        <View style={styles.footer}>
          <Button
            title="უკან"
            variant="secondary"
            style={{ flex: 1 }}
            disabled={stepIndex === 0}
            onPress={() => setStepIndex(i => Math.max(0, i - 1))}
          />
          {stepIndex < steps.length - 1 ? (
            <Button
              title="შემდეგი"
              style={{ flex: 2 }}
              onPress={() => {
                if (step.kind === 'question' && step.question.type === 'measure') {
                  const value = answers[step.question.id]?.value_num ?? null;
                  const err = measureError(step.question, value);
                  if (err) {
                    toast.error(err);
                    return;
                  }
                }
                setStepIndex(i => Math.min(steps.length - 1, i + 1));
              }}
            />
          ) : (
            <Button
              title="ხელმოწერაზე გადასვლა"
              style={{ flex: 2 }}
              onPress={saveConclusionAndGo}
            />
          )}
        </View>
      </SafeAreaView>
    </Screen>
  );
}

// ----- Step views -----

function QuestionStep({
  question,
  answer,
  photosByAnswer,
  onAnswer,
  onPickPhoto,
}: {
  question: Question;
  answer: Answer | undefined;
  photosByAnswer: Record<string, AnswerPhoto[]>;
  onAnswer: (q: Question, m: (a: Answer) => Answer) => Promise<void>;
  onPickPhoto: () => void;
}) {
  return (
    <View style={{ gap: 14 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: theme.colors.ink }}>
        {question.title}
      </Text>
      {question.type === 'yesno' ? (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable
            onPress={() => onAnswer(question, a => ({ ...a, value_bool: true }))}
            style={[
              styles.choice,
              answer?.value_bool === true && { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accent },
            ]}
          >
            <Text style={styles.choiceText}>კი</Text>
          </Pressable>
          <Pressable
            onPress={() => onAnswer(question, a => ({ ...a, value_bool: false }))}
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
        <>
          <Button title="ფოტოების დამატება" variant="secondary" onPress={onPickPhoto} />
          <PhotoGrid photos={(answer && photosByAnswer[answer.id]) ?? []} />
        </>
      ) : null}

      {question.type !== 'photo_upload' ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button
            title={
              answer && photosByAnswer[answer.id]?.length
                ? `ფოტო (${photosByAnswer[answer.id].length})`
                : 'ფოტო'
            }
            variant="secondary"
            onPress={onPickPhoto}
            style={{ flex: 1 }}
          />
        </View>
      ) : null}
      {answer && question.type !== 'photo_upload' ? (
        <PhotoGrid photos={photosByAnswer[answer.id] ?? []} />
      ) : null}
    </View>
  );
}

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

function GridRowStep({
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
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 10 }}>
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
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
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
}

/**
 * Wizard step that asks the inspector to attach required professional
 * qualifications (xaracho_inspector, etc.) to this inspection. Those
 * attached quals get included in the generated PDF certificate downstream.
 */
function QualificationsStep({
  requiredTypes,
  quals,
  onQualsChange,
}: {
  requiredTypes: string[];
  quals: Qualification[];
  onQualsChange: (next: Qualification[]) => void;
}) {
  const toast = useToast();
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  const uploadForType = async (qualType: string) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error('ფოტოზე წვდომა არ არის');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;
    setUploadingFor(qualType);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('არ ხარ შესული');
      const asset = result.assets[0];
      const res = await fetch(asset.uri);
      const blob = await res.blob();
      const ext = asset.mimeType?.split('/')[1] ?? 'jpg';
      const path = `${user.id}/${Date.now()}.${ext}`;
      await storageApi.upload(
        STORAGE_BUCKETS.certificates,
        path,
        blob,
        asset.mimeType ?? 'image/jpeg',
      );
      const qual = (await qualificationsApi.upsert({
        id: crypto.randomUUID(),
        user_id: user.id,
        type: qualType,
        number: null,
        issued_at: new Date().toISOString().slice(0, 10),
        expires_at: null,
        file_url: path,
      }));
      onQualsChange([qual, ...quals.filter(c => c.id !== qual.id)]);
      toast.success('სერტიფიკატი აიტვირთა');
    } catch (e: any) {
      toast.error(`ატვირთვა ვერ მოხერხდა: ${e?.message ?? 'ქსელის შეცდომა'}`);
    } finally {
      setUploadingFor(null);
    }
  };

  return (
    <View style={{ gap: 14 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: theme.colors.ink }}>
        საჭირო სერტიფიკატები
      </Text>
      <Text style={{ fontSize: 13, color: theme.colors.inkSoft }}>
        დაურთე უკვე ატვირთული სერტიფიკატი ან ატვირთე ახალი — ინსპექციიდან გასვლა არაა საჭირო.
      </Text>
      {requiredTypes.map(t => {
        const matches = quals.filter(c => c.type === t);
        const available = matches.filter(c => {
          if (!c.expires_at) return true;
          return new Date(c.expires_at).getTime() > Date.now();
        });
        return (
          <View key={t} style={styles.certBlock}>
            <Text style={{ fontWeight: '700', color: theme.colors.ink }}>{t}</Text>
            {available.length > 0 ? (
              <View style={{ gap: 6, marginTop: 8 }}>
                {available.map(c => (
                  <View key={c.id} style={styles.certRow}>
                    <Ionicons name="checkmark-circle" size={18} color={theme.colors.accent} />
                    <Text style={{ flex: 1, color: theme.colors.ink }} numberOfLines={1}>
                      {c.number ? `№ ${c.number}` : 'ატვირთულია'}
                      {c.expires_at ? ` · ${new Date(c.expires_at).toLocaleDateString('ka')}` : ''}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ fontSize: 12, color: theme.colors.warn, marginTop: 6 }}>
                ატვირთული არ არის.
              </Text>
            )}
            <Button
              title={uploadingFor === t ? 'იტვირთება...' : '+ ახლავე ატვირთვა'}
              variant="secondary"
              onPress={() => void uploadForType(t)}
              loading={uploadingFor === t}
              style={{ marginTop: 10 }}
            />
          </View>
        );
      })}
    </View>
  );
}

function ConclusionStep({
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
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            onPress={() => onIsSafe(true)}
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
            onPress={() => onIsSafe(false)}
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
}

function PhotoGrid({ photos }: { photos: AnswerPhoto[] }) {
  if (!photos.length) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      {photos.map(p => {
        const url = storageApi.publicUrl(STORAGE_BUCKETS.answerPhotos, p.storage_path);
        return (
          <Image
            key={p.id}
            source={{ uri: url }}
            style={styles.photoThumb}
            resizeMode="cover"
          />
        );
      })}
    </View>
  );
}

// ----- Result view for completed questionnaires -----

import { shareStoredPdf } from '../../lib/sharePdf';

/**
 * Summary view shown when the inspection is already completed. Fetches the
 * latest generated certificate (if any) so the user can re-share it. Creating
 * additional certificates is handled by the dedicated `/certificates/new`
 * route — this view just surfaces what's already there.
 */
function ResultView({
  questionnaire,
  template,
  onClose,
}: {
  questionnaire: Inspection;
  template: Template | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const [sharing, setSharing] = useState(false);
  const [latestCert, setLatestCert] = useState<Certificate | null>(null);

  useEffect(() => {
    let cancelled = false;
    void certificatesApi
      .listByInspection(questionnaire.id)
      .then(list => { if (!cancelled) setLatestCert(list[0] ?? null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [questionnaire.id]);

  const share = async () => {
    if (!latestCert) {
      toast.error('სერტიფიკატი ჯერ არ არის დაგენერირებული');
      return;
    }
    setSharing(true);
    try {
      await shareStoredPdf(latestCert.pdf_url);
    } catch (e: any) {
      toast.error(e?.message ?? 'გახსნა ვერ მოხერხდა');
    } finally {
      setSharing(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'დასრულდა' }} />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
          <View style={{ alignItems: 'center', gap: 10, paddingVertical: 30 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: theme.colors.accentSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="checkmark-circle" size={48} color={theme.colors.accent} />
            </View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: theme.colors.ink }}>
              კითხვარი დასრულებულია
            </Text>
            <Text style={{ color: theme.colors.inkSoft, textAlign: 'center' }}>
              {template?.name ?? 'კითხვარი'}
              {'\n'}
              {new Date(questionnaire.completed_at ?? questionnaire.created_at).toLocaleString('ka')}
            </Text>
          </View>

          <Card>
            <Text style={{ fontSize: 11, color: theme.colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              დასკვნა
            </Text>
            <Text style={{ marginTop: 6, color: theme.colors.ink }}>
              {questionnaire.conclusion_text || '—'}
            </Text>
            <Text
              style={{
                marginTop: 10,
                fontWeight: '700',
                color: questionnaire.is_safe_for_use === false ? theme.colors.danger : theme.colors.accent,
              }}
            >
              {questionnaire.is_safe_for_use === false
                ? '✗ არ არის უსაფრთხო ექსპლუატაციისთვის'
                : '✓ უსაფრთხოა ექსპლუატაციისთვის'}
            </Text>
          </Card>

          {latestCert ? (
            <Button title="PDF-ის გახსნა / გაზიარება" onPress={share} loading={sharing} />
          ) : null}
          <Button
            title={latestCert ? 'ახალი სერტიფიკატის გენერაცია' : 'სერტიფიკატის გენერაცია'}
            variant={latestCert ? 'secondary' : 'primary'}
            onPress={() => router.push(`/certificates/new?inspectionId=${questionnaire.id}` as any)}
          />
          <Button title="დახურვა" variant="secondary" onPress={onClose} />
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressBg: {
    height: 6,
    backgroundColor: theme.colors.subtleSurface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: 6, backgroundColor: theme.colors.accent },
  choice: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: theme.colors.subtleSurface,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
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
    paddingTop: 12,
    paddingBottom: 44,
    borderTopWidth: 1,
    borderTopColor: theme.colors.hairline,
    backgroundColor: theme.colors.card,
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
  certBlock: {
    backgroundColor: theme.colors.subtleSurface,
    borderRadius: 12,
    padding: 14,
  },
  certRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  safetyOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
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
  },
});
