import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, Card, Screen } from '../../components/ui';
import {
  answersApi,
  questionnairesApi,
  storageApi,
  templatesApi,
} from '../../lib/services';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { useToast } from '../../lib/toast';
import { theme } from '../../lib/theme';
import type {
  Answer,
  AnswerPhoto,
  GridValues,
  Question,
  Questionnaire,
  Template,
} from '../../types/models';

const stepKey = (qid: string) => `wizard:${qid}:step`;

// --- Flat steps ---

type FlatStep =
  | { kind: 'question'; question: Question }
  | { kind: 'gridRow'; question: Question; row: string }
  | { kind: 'conclusion' };

function buildSteps(questions: Question[], harnessRowCount: number): FlatStep[] {
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

export default function QuestionnaireWizard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
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

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [allQ, allT] = await Promise.all([
        questionnairesApi.recent(500),
        templatesApi.list(),
      ]);
      const q = allQ.find(x => x.id === id);
      if (!q) throw new Error('არ მოიძებნა');
      setQuestionnaire(q);
      const t = allT.find(x => x.id === q.template_id) ?? null;
      setTemplate(t);
      setConclusion(q.conclusion_text ?? '');
      setIsSafe(q.is_safe_for_use ?? null);
      setHarnessName(q.harness_name ?? '');
      if (t) {
        const qs = await templatesApi.questions(t.id);
        setQuestions(qs);
        const existing = await answersApi.list(q.id);
        const map: Record<string, Answer> = {};
        const pmap: Record<string, AnswerPhoto[]> = {};
        for (const a of existing) {
          map[a.question_id] = a;
          pmap[a.id] = await answersApi.photos(a.id).catch(() => []);
        }
        setAnswers(map);
        setPhotos(pmap);
      }
      // Resume where the user left off
      const savedStep = await AsyncStorage.getItem(stepKey(id));
      if (savedStep) {
        const parsed = parseInt(savedStep, 10);
        if (!Number.isNaN(parsed)) setStepIndex(parsed);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Persist step index as the user progresses
  useEffect(() => {
    if (!id || loading) return;
    void AsyncStorage.setItem(stepKey(id), String(stepIndex));
  }, [id, stepIndex, loading]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const steps = useMemo(() => buildSteps(questions, harnessRowCount), [questions, harnessRowCount]);
  const step = steps[stepIndex];

  const patchAnswer = async (question: Question, mutate: (a: Answer) => Answer) => {
    if (!questionnaire) return;
    const current: Answer =
      answers[question.id] ??
      ({
        id: crypto.randomUUID(),
        questionnaire_id: questionnaire.id,
        question_id: question.id,
        value_bool: null,
        value_num: null,
        value_text: null,
        grid_values: null,
        comment: null,
      } as Answer);
    const next = mutate({ ...current });
    try {
      const saved = (await answersApi.upsert(next as Answer)) as unknown as Answer;
      setAnswers(prev => ({ ...prev, [question.id]: saved }));
    } catch {
      // swallow
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
          questionnaire_id: questionnaire.id,
          question_id: question.id,
        })) as unknown as Answer;
        setAnswers(prev => ({ ...prev, [question.id]: answer as Answer }));
      }
      const photo = (await answersApi.addPhoto(answer.id, path)) as unknown as AnswerPhoto;
      const answerId = answer.id;
      setPhotos(prev => ({ ...prev, [answerId]: [...(prev[answerId] ?? []), photo] }));
    } catch {
      // ignore
    }
  };

  const saveConclusionAndGo = async () => {
    if (!questionnaire) return;
    if (isSafe === null) {
      toast.error('ჯერ აირჩიე უსაფრთხოების სტატუსი');
      return;
    }
    await questionnairesApi.update({
      id: questionnaire.id,
      conclusion_text: conclusion,
      is_safe_for_use: isSafe,
      harness_name: harnessName || null,
    });
    router.push(`/questionnaire/${questionnaire.id}/signing` as any);
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
        options={{ headerShown: true, title: template?.name ?? 'კითხვარი', headerBackTitle: 'უკან' }}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
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

        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          {step.kind === 'question' ? (
            <QuestionStep
              question={step.question}
              answer={answers[step.question.id]}
              photosByAnswer={photos}
              onAnswer={patchAnswer}
              onPickPhoto={() => pickPhoto(step.question)}
            />
          ) : step.kind === 'gridRow' ? (
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
              onPress={() => setStepIndex(i => Math.min(steps.length - 1, i + 1))}
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
      const cur: Record<string, string> = exclusive ? {} : { ...(grid[row] ?? {}) };
      if (value === null) delete cur[col];
      else cur[col] = value;
      grid[row] = cur;
      return { ...a, grid_values: grid };
    });
  };

  return (
    <View style={{ gap: 14 }}>
      <Text style={{ fontSize: 11, color: theme.colors.inkSoft }}>{question.title}</Text>
      <Text style={{ fontSize: 24, fontWeight: '800', color: theme.colors.ink }}>{row}</Text>

      {isHarness && isFirstRow ? (
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

      {isHarness ? (
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
      ) : (
        <View style={{ gap: 12 }}>
          {cols.map(col => {
            const selected = Object.values(values).includes(col);
            return (
              <Pressable
                key={col}
                onPress={() => setValue(col, col, true)}
                style={[styles.statusOption, selected && { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft }]}
              >
                <Ionicons
                  name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={selected ? theme.colors.accent : theme.colors.inkSoft}
                />
                <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.ink }}>{col}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <Button title="ფოტო" variant="secondary" onPress={onPickPhoto} />
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
  return (
    <View style={{ gap: 14 }}>
      {template?.category === 'harness' ? (
        <View>
          <Text style={styles.label}>ღვედის დასახელება</Text>
          <TextInput
            value={harnessName}
            onChangeText={onHarnessName}
            style={styles.input}
            placeholder="მაგ. Petzl NEWTON"
            placeholderTextColor={theme.colors.inkFaint}
          />
        </View>
      ) : null}
      <View>
        <Text style={styles.label}>დასკვნა</Text>
        <TextInput
          multiline
          value={conclusion}
          onChangeText={onConclusion}
          style={styles.textarea}
          placeholder="აღწერე დეტალურად..."
          placeholderTextColor={theme.colors.inkFaint}
        />
      </View>
      <View>
        <Text style={styles.label}>უსაფრთხოების სტატუსი</Text>
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
          <Text style={{ fontSize: 12, color: theme.colors.danger, marginTop: 6 }}>
            აუცილებლად აირჩიე სტატუსი.
          </Text>
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

import * as Sharing from 'expo-sharing';
import { storageApi as storageFor } from '../../lib/services';
import { STORAGE_BUCKETS as BUCKETS } from '../../lib/supabase';
import * as FS from 'expo-file-system/legacy';

function ResultView({
  questionnaire,
  template,
  onClose,
}: {
  questionnaire: Questionnaire;
  template: Template | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const [sharing, setSharing] = useState(false);

  const share = async () => {
    if (!questionnaire.pdf_url) {
      toast.error('PDF ჯერ არ არის დაგენერირებული');
      return;
    }
    setSharing(true);
    try {
      const url = storageFor.publicUrl(BUCKETS.pdfs, questionnaire.pdf_url);
      const localUri = (FS.cacheDirectory ?? FS.documentDirectory!) + `${questionnaire.id}.pdf`;
      const { uri } = await FS.downloadAsync(url, localUri);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      }
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

          <Button title="PDF-ის გახსნა / გაზიარება" onPress={share} loading={sharing} />
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
    paddingVertical: 12,
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
  photoThumb: {
    width: 80,
    height: 80,
    backgroundColor: theme.colors.subtleSurface,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
