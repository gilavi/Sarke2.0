import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Button, Card, Screen } from '../../components/ui';
import {
  answersApi,
  questionnairesApi,
  storageApi,
  templatesApi,
} from '../../lib/services';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { theme } from '../../lib/theme';
import type {
  Answer,
  AnswerPhoto,
  GridValues,
  Question,
  Questionnaire,
  Template,
} from '../../types/models';

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

  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [photos, setPhotos] = useState<Record<string, AnswerPhoto[]>>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [harnessRowCount, setHarnessRowCount] = useState(5);
  const [conclusion, setConclusion] = useState('');
  const [isSafe, setIsSafe] = useState(true);
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
      setIsSafe(q.is_safe_for_use ?? true);
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
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [id]);

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
    await questionnairesApi.update({
      id: questionnaire.id,
      conclusion_text: conclusion,
      is_safe_for_use: isSafe,
      harness_name: harnessName || null,
    });
    router.push({ pathname: '/questionnaire/[id]/signing', params: { id: questionnaire.id } });
  };

  if (loading || !step) {
    return (
      <Screen>
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={theme.colors.accent} />
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
        <TextInput
          multiline
          value={answer?.value_text ?? ''}
          onChangeText={t => onAnswer(question, a => ({ ...a, value_text: t }))}
          style={styles.textarea}
          placeholder="შეავსე აქ..."
          placeholderTextColor={theme.colors.inkFaint}
        />
      ) : null}
      {question.type === 'photo_upload' ? (
        <>
          <Button title="ფოტოების დამატება" variant="secondary" onPress={onPickPhoto} />
          <PhotoGrid photos={(answer && photosByAnswer[answer.id]) ?? []} />
        </>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button
          title="ფოტო"
          variant="secondary"
          onPress={onPickPhoto}
          style={{ flex: 1 }}
        />
      </View>
    </View>
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
  isSafe: boolean;
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
      <Pressable
        onPress={() => onIsSafe(!isSafe)}
        style={[
          styles.checkboxRow,
          isSafe && { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accent },
        ]}
      >
        <Ionicons
          name={isSafe ? 'checkbox' : 'square-outline'}
          size={24}
          color={isSafe ? theme.colors.accent : theme.colors.inkSoft}
        />
        <Text style={{ fontSize: 15, fontWeight: '600' }}>უსაფრთხოა ექსპლუატაციისთვის</Text>
      </Pressable>
    </View>
  );
}

function PhotoGrid({ photos }: { photos: AnswerPhoto[] }) {
  if (!photos.length) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      {photos.map(p => (
        <View key={p.id} style={styles.photoThumb}>
          <Ionicons name="image" size={20} color={theme.colors.accent} />
        </View>
      ))}
    </View>
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
  photoThumb: {
    width: 80,
    height: 80,
    backgroundColor: theme.colors.subtleSurface,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
