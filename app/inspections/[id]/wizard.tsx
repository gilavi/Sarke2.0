import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, InputAccessoryView, Keyboard, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../../components/inputs/FloatingLabelInput';
import { KeyboardAvoidingView, KeyboardAwareScrollView, KeyboardController } from 'react-native-keyboard-controller';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, Card, Screen } from '../../../components/ui';
import { FlowHeader } from '../../../components/FlowHeader';
import { QuestionAvatar, illustrationKeyFor } from '../../../components/QuestionAvatar';
import { Skeleton, SkeletonWizard } from '../../../components/Skeleton';
import { ScaffoldTour } from '../../../components/ScaffoldTour';
import { useScaffoldHelpSheet } from '../../../components/ScaffoldHelpSheet';
import { useBottomSheet } from '../../../components/BottomSheet';
import { SyncStatusPill } from '../../../components/SyncStatusPill';
import { TOUR_SEEN_KEY } from '../../../lib/scaffoldHelp';
import {
  QuestionCard,
  AnswerButtons,
  WizardStepTransition,
} from '../../../components/wizard';
import { HarnessListFlow } from '../../../components/HarnessListFlow';
import {
  answersApi,
  inspectionsApi,
  projectsApi,
  storageApi,
  templatesApi,
} from '../../../lib/services';
import { imageForDisplay, pdfPhotoEmbed } from '../../../lib/imageUrl';
import { STORAGE_BUCKETS } from '../../../lib/supabase';
import { haptic } from '../../../lib/haptics';
import { setPhotoPickerCallback, setPhotoAnnotateCallback, cancelPhotoPicker, cancelPhotoAnnotate, getLastPhotoLocation } from '../../../lib/photoPickerBus';
import { getCurrentLocation, reverseGeocode } from '../../../utils/location';
import type { PhotoLocation } from '../../../utils/location';
import { showPhotoLocationAlert } from '../../../lib/photoLocationAlert';
import { useOffline, stripServerFields } from '../../../lib/offline';
import { recordRedirect, isOscillating } from '../../../lib/navigationGuard';
import { logError, toErrorMessage } from '../../../lib/logError';
import { useToast } from '../../../lib/toast';
import { useTheme } from '../../../lib/theme';
import { useQueryClient } from '@tanstack/react-query';
import { recordCompletion } from '../../../lib/calendarSchedule';
import { qk } from '../../../lib/apiHooks';

import { a11y } from '../../../lib/accessibility';
import type {
  Answer,
  AnswerPhoto,
  GridValues,
  Inspection,
  Project,
  Question,
  Template,
} from '../../../types/models';

const PICKER_OPTS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  quality: 0.7,
  base64: false,
};

const stepKey = (qid: string) => `wizard:${qid}:step`;
const harnessCountKey = (qid: string) => `wizard:${qid}:harnessCount`;
const conclusionKey = (qid: string) => `wizard:${qid}:conclusion`;
const safetyKey = (qid: string) => `wizard:${qid}:safety`;
const harnessNameKey = (qid: string) => `wizard:${qid}:harnessName`;

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
  | { kind: 'harnessFlow'; question: Question }
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
      if (isHarness) {
        // HarnessListFlow: count picker → per-harness chip list (full-screen takeover).
        steps.push({ kind: 'harnessFlow', question: q });
      } else {
        for (const row of q.grid_rows) steps.push({ kind: 'gridRow', question: q, row });
      }
    } else {
      steps.push({ kind: 'question', question: q });
    }
  }
  steps.push({ kind: 'conclusion' });
  return steps;
}

// In-memory cache for photo display URLs to avoid redundant fetches.
// Bounded — Map preserves insertion order, so the oldest entry is evicted
// once the cap is hit. Without a bound this Map grew for the lifetime of
// the JS context and leaked memory across multiple inspection sessions.
const PHOTO_URL_CACHE_MAX = 100;
const photoUrlCache = new Map<string, string>();
function setPhotoUrlCache(key: string, url: string) {
  if (photoUrlCache.has(key)) photoUrlCache.delete(key);
  photoUrlCache.set(key, url);
  if (photoUrlCache.size > PHOTO_URL_CACHE_MAX) {
    const oldest = photoUrlCache.keys().next().value;
    if (oldest !== undefined) photoUrlCache.delete(oldest);
  }
}

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
  // harnessFlow manages its own completion internally — always considered answered.
  if (step.kind === 'harnessFlow') return true;
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
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const toast = useToast();
  const offline = useOffline();
  const insets = useSafeAreaInsets();

  const queryClient = useQueryClient();
  const [questionnaire, setQuestionnaire] = useState<Inspection | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [photos, setPhotos] = useState<Record<string, AnswerPhoto[]>>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const [animateSteps, setAnimateSteps] = useState(false);
  const [harnessRowCount, setHarnessRowCount] = useState(5);
  // Measured WizardHeader height — used as keyboardVerticalOffset so the
  // keyboard avoidance lines up exactly with the rendered header above KAV.
  const [headerH, setHeaderH] = useState(0);
  const pendingPhotoContext = useRef<{
    questionId: string;
    rowKey?: string;
    mime: string;
    ext: string;
    path: string;
  } | null>(null);
  const pickerTokenRef = useRef<number | null>(null);
  const annotateTokenRef = useRef<number | null>(null);
  const [photoUploadCount, setPhotoUploadCount] = useState(0);
  const [conclusion, setConclusion] = useState('');
  const [isSafe, setIsSafe] = useState<boolean | null>(null);
  const [harnessName, setHarnessName] = useState('');
  // Guards saveConclusionAndGo against double-tap. The "დასრულება" button uses
  // this for both the visual loading state and to short-circuit re-entry while
  // the offline queue/flush is in flight.
  const [finishing, setFinishing] = useState(false);
  // Kamari overview state: which belt index (1-based) is currently open in the
  // detail modal, plus a set of visited indices for the amber "in-progress"
  // tint shown when a belt was opened but no problems were logged.
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const showHelp = useScaffoldHelpSheet();
  const showSheet = useBottomSheet();

  useEffect(() => {
    if (!template || template.category === 'harness') return;
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

  // Navigation timeout guard: if loading takes >5 s, show recovery UI.
  useEffect(() => {
    if (!loading) {
      setLoadTimedOut(false);
      return;
    }
    const t = setTimeout(() => setLoadTimedOut(true), 5000);
    return () => clearTimeout(t);
  }, [loading]);

  const dismissTour = useCallback(() => {
    setShowTour(false);
    AsyncStorage.setItem(TOUR_SEEN_KEY, '1').catch(() => {});
  }, []);

  // Cancel any dangling photo-picker bus tokens on unmount
  useEffect(() => {
    return () => {
      if (pickerTokenRef.current !== null) cancelPhotoPicker(pickerTokenRef.current);
      if (annotateTokenRef.current !== null) cancelPhotoAnnotate(annotateTokenRef.current);
    };
  }, []);

  // Step transition direction. Forward navigation slides the new step in
  // from the right and the old one out to the left; back nav reverses both.
  // The actual slide+fade is rendered by WizardStepTransition below.
  const prevStepIndexRef = useRef(stepIndex);
  const stepDirection: 'next' | 'prev' =
    stepIndex >= prevStepIndexRef.current ? 'next' : 'prev';
  useEffect(() => {
    prevStepIndexRef.current = stepIndex;
  }, [stepIndex]);

  // Enable step transition animations only after the initial load (which may
  // restore a non-zero saved step) has settled. This prevents the entrance
  // animation firing on load for a mid-flow step resumed from AsyncStorage.
  useEffect(() => {
    if (!loading) setAnimateSteps(true);
  }, [loading]);

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
      projectsApi.getById(qMerged.project_id).then((p) => {
        if (!ctrl.cancelled) setProject(p);
      }).catch(() => null);
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
          toast.info('ჩატვირთულია ლოკალური ასლი — სინქრონიზაცია მოხდება ავტომატურად.');
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
      const [savedStep, savedHarness, savedConclusion, savedSafety, savedHarnessName] =
        await Promise.all([
          AsyncStorage.getItem(stepKey(id)),
          AsyncStorage.getItem(harnessCountKey(id)),
          AsyncStorage.getItem(conclusionKey(id)),
          AsyncStorage.getItem(safetyKey(id)),
          AsyncStorage.getItem(harnessNameKey(id)),
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
      // Cached unsaved edits win over the remote row — same precedence we
      // use for cached answers when the user has pending offline ops.
      if (savedConclusion != null) setConclusion(savedConclusion);
      if (savedSafety === 'true') setIsSafe(true);
      else if (savedSafety === 'false') setIsSafe(false);
      if (savedHarnessName != null) setHarnessName(savedHarnessName);
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

  // Persist conclusion + safety + harness name as the user edits them so
  // backing out of the wizard mid-edit doesn't lose the typed conclusion.
  // Cleared on successful finish (see finishInspection below).
  useEffect(() => {
    if (!id || loading) return;
    AsyncStorage.setItem(conclusionKey(id), conclusion).catch((e) =>
      logError(e, 'wizard.persistConclusion'),
    );
  }, [id, conclusion, loading]);

  useEffect(() => {
    if (!id || loading) return;
    if (isSafe === null) {
      AsyncStorage.removeItem(safetyKey(id)).catch(() => {});
    } else {
      AsyncStorage.setItem(safetyKey(id), String(isSafe)).catch((e) =>
        logError(e, 'wizard.persistSafety'),
      );
    }
  }, [id, isSafe, loading]);

  useEffect(() => {
    if (!id || loading) return;
    AsyncStorage.setItem(harnessNameKey(id), harnessName).catch((e) =>
      logError(e, 'wizard.persistHarnessName'),
    );
  }, [id, harnessName, loading]);

  // Load on mount AND when id changes (useFocusEffect alone misses the
  // initial load if id is still resolving from params when the screen
  // is already focused). The cancellation token in load() handles any
  // benign double-fire.
  useEffect(() => {
    if (id) void load();
    return () => { loadCtrlRef.current.cancelled = true; };
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
  // Clamp so a stale cached stepIndex never produces an undefined step.
  const safeStepIndex = Math.min(stepIndex, Math.max(0, steps.length - 1));
  const step = steps[safeStepIndex];

  // Section 3 photo_upload no longer has its own step — the answer/photos
  // attach to it but render on the conclusion screen as "საერთო ფოტოები".
  const photoQuestion = useMemo(
    () => questions.find(q => q.type === 'photo_upload') ?? null,
    [questions],
  );
  const photoAnswerId = photoQuestion ? answers[photoQuestion.id]?.id ?? null : null;
  const generalPhotos: AnswerPhoto[] = photoAnswerId ? photos[photoAnswerId] ?? [] : [];

  const patchAnswer = useCallback(async (question: Question, mutate: (a: Answer) => Answer) => {
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
      toast.error('პასუხის ფორმატი არასწორია. გთხოვთ, შეასწოროთ.');
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
  }, [questionnaire, answers, offline, toast]);

  const doUpload = async (
    uri: string,
    question: Question,
    rowKey?: string,
    mime?: string,
    ext?: string,
    path?: string,
    location?: PhotoLocation | null,
  ) => {
    if (!questionnaire) return;
    setPhotoUploadCount(c => c + 1);
    const actualMime = mime ?? 'image/jpeg';
    const actualExt = ext ?? 'jpg';
    const actualPath = path ?? `${questionnaire.id}/${question.id}/${Date.now()}.${actualExt}`;

    // caption is only used for grid-row association; location is stored in dedicated columns.
    const captionStr: string | null = rowKey ? `row:${rowKey}` : null;
    let photoAddress: string | null = null;
    if (!rowKey && location) {
      photoAddress = await reverseGeocode(location.latitude, location.longitude).catch(
        () => `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`,
      );
    }

    // Ensure an Answer row exists locally so the photo can attach to a stable
    // answer.id whether we upload now or queue. The upsert is enqueued via
    // patchAnswer if offline; if online we still go through the live path so
    // the server returns the canonical row.
    const existing = answers[question.id];
    const answerId = existing?.id ?? crypto.randomUUID();
    const baseAnswer: Answer = {
      id: answerId,
      inspection_id: questionnaire.id,
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
        // Offline path — stage the file, queue upload+row insert, optimistic UI.
        if (!existing) {
          setAnswers(prev => ({ ...prev, [question.id]: baseAnswer }));
          await offline.enqueueAnswerUpsert(baseAnswer);
        }
        const optimistic = await offline.enqueuePhotoUpload({
          sourceUri: uri,
          bucket: STORAGE_BUCKETS.answerPhotos,
          path: actualPath,
          contentType: actualMime,
          answerId,
          inspectionId: questionnaire.id,
          caption: captionStr,
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
          address: photoAddress,
        });
        setPhotos(prev => ({ ...prev, [answerId]: [...(prev[answerId] ?? []), optimistic] }));
        toast.success('ფოტო შენახულია — აიტვირთება ქსელის დაბრუნებისას');
        return;
      }
      await storageApi.uploadFromUri(STORAGE_BUCKETS.answerPhotos, actualPath, uri, actualMime, 'inspection');
      const answer = await answersApi.upsert(baseAnswer);
      if (!existing) setAnswers(prev => ({ ...prev, [question.id]: answer }));
      const photo = await answersApi.addPhoto(answer.id, actualPath, {
        caption: captionStr,
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        address: photoAddress,
      });
      setPhotos(prev => ({ ...prev, [answer.id]: [...(prev[answer.id] ?? []), photo] }));
      // Proactively cache the resized version so PDF generation is fast later
      // (especially useful when the user goes offline before generating the certificate).
      pdfPhotoEmbed(STORAGE_BUCKETS.answerPhotos, actualPath).catch(() => undefined);
      toast.success('ფოტო აიტვირთა');
      // Show project-location prompt after a successful upload (fire-and-forget).
      if (project && location) {
        showPhotoLocationAlert(project, location, setProject).catch(() => {});
      }
    } catch (e) {
      toast.error(`ფოტო ვერ აიტვირთა: ${toErrorMessage(e, 'ქსელის შეცდომა')}`);
    } finally {
      setPhotoUploadCount(c => Math.max(0, c - 1));
    }
  };

  const launchPicker = async (
    source: 'camera' | 'library',
    question: Question,
    rowKey?: string,
  ) => {
    if (!questionnaire) return;
    haptic.medium();
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error(source === 'camera' ? 'კამერაზე წვდომა საჭიროა' : 'გალერეაზე წვდომა საჭიროა');
      return;
    }
    let result: Awaited<ReturnType<typeof ImagePicker.launchCameraAsync>>;
    let location: PhotoLocation | null = null;
    if (source === 'camera') {
      // Capture location concurrently with the photo for camera mode.
      const [res, loc] = await Promise.all([
        ImagePicker.launchCameraAsync(PICKER_OPTS),
        getCurrentLocation(),
      ]);
      result = res;
      location = loc;
    } else {
      result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTS);
      location = await getCurrentLocation();
    }
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    const mime = asset.mimeType ?? 'image/jpeg';
    const ext = mime.split('/')[1] ?? 'jpg';
    const path = `${questionnaire.id}/${question.id}/${Date.now()}.${ext}`;
    const capturedLocation = location;
    pendingPhotoContext.current = { questionId: question.id, rowKey, mime, ext, path };
    // Cancel any stale annotate token before registering new one
    if (annotateTokenRef.current !== null) cancelPhotoAnnotate(annotateTokenRef.current);

    annotateTokenRef.current = setPhotoAnnotateCallback((annotatedUri) => {
      if (!annotatedUri) {
        pendingPhotoContext.current = null;
        annotateTokenRef.current = null;
        return;
      }
      const ctx = pendingPhotoContext.current;
      if (!ctx) return;
      const q = questions.find(q => q.id === ctx.questionId);
      if (q) doUpload(annotatedUri, q, ctx.rowKey, ctx.mime, ctx.ext, ctx.path, capturedLocation);
      pendingPhotoContext.current = null;
      annotateTokenRef.current = null;
    });
    router.push(
      `/photo-annotate?uri=${encodeURIComponent(asset.uri)}` as any,
    );
  };

  const pickPhoto = (question: Question, rowKey?: string) => {
    if (!questionnaire) return;
    haptic.light();
    const mime = 'image/jpeg';
    const ext = 'jpg';
    const path = `${questionnaire.id}/${question.id}/${Date.now()}.${ext}`;
    pendingPhotoContext.current = { questionId: question.id, rowKey, mime, ext, path };
    // Cancel any stale picker/annotate tokens before registering new ones
    if (pickerTokenRef.current !== null) cancelPhotoPicker(pickerTokenRef.current);
    if (annotateTokenRef.current !== null) cancelPhotoAnnotate(annotateTokenRef.current);

    pickerTokenRef.current = setPhotoPickerCallback((uri) => {
      if (!uri) {
        pendingPhotoContext.current = null;
        pickerTokenRef.current = null;
        return;
      }
      // Read location captured by photo-picker.tsx (stored in bus side-channel).
      const location = getLastPhotoLocation();
      annotateTokenRef.current = setPhotoAnnotateCallback((annotatedUri) => {
        if (!annotatedUri) {
          pendingPhotoContext.current = null;
          annotateTokenRef.current = null;
          return;
        }
        const ctx = pendingPhotoContext.current;
        if (!ctx) return;
        const q = questions.find(q => q.id === ctx.questionId);
        if (q) doUpload(annotatedUri, q, ctx.rowKey, ctx.mime, ctx.ext, ctx.path, location);
        pendingPhotoContext.current = null;
        annotateTokenRef.current = null;
      });
      // Replace the picker with the annotator so the user returns straight
      // to the wizard on annotate-back, instead of being dropped back onto
      // the picker (which would force a second close).
      router.replace(
        `/photo-annotate?uri=${encodeURIComponent(uri)}` as any,
      );
      pickerTokenRef.current = null;
    });
    router.push('/photo-picker' as any);
  };

  // Annotated photo is now handled via setPhotoAnnotateCallback in pickPhoto/launchPicker.

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
    if (finishing) return; // double-tap guard — already in flight
    haptic.medium();
    const missing: string[] = [];
    if (isSafe === null) missing.push('უსაფრთხოების სტატუსი');
    if (!conclusion.trim()) missing.push('დასკვნა');
    if (template?.category === 'harness' && !harnessName.trim()) missing.push('ღვედის დასახელება');
    if (missing.length > 0) {
      toast.error(`შეავსეთ: ${missing.join(', ')}`);
      return;
    }
    setFinishing(true);
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
      // Clear the cached questionnaire patch so a later reload doesn't
      // re-apply stale completed/status fields.
      await offline.clearQuestionnairePatch(questionnaire.id).catch(() => {});
      // Record schedule entry — non-fatal, must never block the inspection.
      const calCompletedAt = new Date().toISOString();
      const calGroupKey = `${questionnaire.project_id}:${questionnaire.template_id}`;
      await recordCompletion('inspections', questionnaire.id, calCompletedAt, calGroupKey).catch(() => {});
      void queryClient.invalidateQueries({ queryKey: qk.calendar.schedules });
      void queryClient.invalidateQueries({ queryKey: qk.calendar.allInspections });
      // Drop the mid-flow caches once the inspection is committed.
      await Promise.all([
        AsyncStorage.removeItem(conclusionKey(questionnaire.id)),
        AsyncStorage.removeItem(safetyKey(questionnaire.id)),
        AsyncStorage.removeItem(harnessNameKey(questionnaire.id)),
        AsyncStorage.removeItem(stepKey(questionnaire.id)),
      ]).catch(() => {});
      haptic.success();
      router.replace(`/inspections/${questionnaire.id}/done` as any);
    } catch (e) {
      haptic.error();
      toast.error(`შემოწმების აქტის დასრულება ვერ მოხერხდა: ${toErrorMessage(e, 'ქსელის შეცდომა')}`);
      setFinishing(false);
    }
    // On success we navigate away, so we don't reset finishing — leaving
    // the button disabled until unmount avoids a flash of the active state
    // before the route change settles.
  };

  // Swipe-right anywhere on the wizard body goes to the previous step. We
  // disable the native iOS swipe-back (gestureEnabled=false on Stack.Screen)
  // so this can't accidentally exit the flow mid-inspection.
  // Declared before any early return so hook order stays stable across the
  // skeleton → ready transition.
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
    [stepIndex],
  );

  // Navigation callbacks. Declared before any early return so hook order
  // stays stable across the skeleton → ready transition.
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
  }, [stepIndex, steps, answers, toast]);

  const goBack = useCallback(() => {
    haptic.light();
    setStepIndex(i => Math.max(0, i - 1));
  }, []);

  // Hold the loading screen until EVERYTHING we need to paint a real step
  // has arrived. Previously the guard was too permissive (!!template && !!step)
  // which let the conclusion form flash with empty isSafe/conclusion values
  // for ~100-200 ms while answers were still hydrating.
  const ready = !loading && !!questionnaire && !!template;
  // Early return — absolutely NO form elements render while data is missing.
  if (!ready) {
    if (loadTimedOut) {
      return <NavigationRecovery id={id} onRetry={() => { setLoadTimedOut(false); setLoading(true); load(); }} />;
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

  // Completed inspection → bounce to the dedicated detail screen. The
  // redirect fires in an effect so we don't mutate navigation during render.
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


  // HarnessListFlow: full-screen takeover for harness templates.
  // Render it directly without Screen wrapper — HarnessListFlow owns its own
  // SafeAreaView and layout; nesting inside Screen causes double insets.
  if (step.kind === 'harnessFlow') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.card }}>
        <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
        <HarnessListFlow
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
    <Screen edgeToEdge edges={['top']} style={{ backgroundColor: theme.colors.card }}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <ScaffoldTour visible={showTour} onClose={dismissTour} />
      <SyncStatusPill />
      {questions.length === 0 ? (
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
            <Text style={uploadPillStyles.text}>
              {photoUploadCount > 1 ? `ფოტოები იტვირთება (${photoUploadCount})…` : 'ფოტო იტვირთება…'}
            </Text>
          </View>
        </View>
      ) : null}
      <Animated.View style={{ flex: 1, opacity: enterAnim }}>
        <View onLayout={e => setHeaderH(e.nativeEvent.layout.height)}>
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
        <KeyboardAvoidingView
          behavior="padding"
          style={{ flex: 1 }}
          keyboardVerticalOffset={insets.top + headerH}
        >
          <WizardStepTransition stepKey={stepIndex} direction={stepDirection} animate={animateSteps && Math.abs(stepIndex - prevStepIndexRef.current) <= 1}>
            {step.kind === 'gridRow' ? (
              <GridRowStep
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
                onAdvance={goNext}
              />
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

        {/* Delete confirmation modal */}
        <Modal visible={deleteConfirmVisible} transparent animationType="fade" onRequestClose={() => setDeleteConfirmVisible(false)}>
          <View style={styles.confirmOverlay}>
            <Pressable style={styles.confirmBackdrop} onPress={() => setDeleteConfirmVisible(false)} {...a11y('გაუქმება', 'შეეხეთ გასაუქმებლად', 'button')} />
            <View style={styles.confirmCard}>
              <View style={{ alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.dangerSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="warning-outline" size={28} color={theme.colors.danger} />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.ink }}>წაშლა?</Text>
                <Text style={{ fontSize: 14, color: theme.colors.inkSoft, textAlign: 'center', lineHeight: 20 }}>
                  შემოწმების აქტი სამუდამოდ წაიშლება.
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
                  loading={deleting}
                  disabled={deleting}
                  onPress={async () => {
                    setDeleting(true);
                    setDeleteConfirmVisible(false);
                    if (!id) { setDeleting(false); return; }
                    try {
                      await inspectionsApi.remove(id);
                      haptic.success();
                      toast.success('წაიშალა');
                      router.back();
                    } catch (e) {
                      setDeleting(false);
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
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const [previewPhoto, setPreviewPhoto] = useState<AnswerPhoto | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const answerPhotos = answer ? photosByAnswer[answer.id] ?? [] : [];
  const hasNote = !!(answer?.notes && answer.notes.length > 0);
  const showNoteField = noteOpen || hasNote;
  const hasPhotos = answerPhotos.length > 0;

  const illoKey = illustrationKeyFor(question.title);

  return (
    <View style={[staticStyles.gap16, staticStyles.padTop16]}>
      <View style={staticStyles.centerGap14}>
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
          დაამატეთ ფოტოები ქვემოთ
        </Text>
      ) : null}

      {hasPhotos ? (
        <View style={staticStyles.gap8}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[staticStyles.gap10, staticStyles.padV8]}
          >
            {answerPhotos.map(p => (
              <Pressable key={p.id} onPress={() => setPreviewPhoto(p)} style={styles.photoTile} {...a11y('ფოტოს ნახვა', 'შეეხეთ ფოტოს დიდად სანახავად', 'button')}>
                <PhotoThumb photo={p} size={120} />
              </Pressable>
            ))}
            <Pressable onPress={onPickPhoto} style={styles.addPhotoTile} {...a11y('ფოტოს დამატება', 'შეეხეთ ახალი ფოტოს ასატვირთად', 'button')}>
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
            <Pressable onPress={onPickPhoto} style={styles.assistChip} {...a11y('ფოტოს დამატება', 'შეეხეთ ახალი ფოტოს ასატვირთად', 'button')}>
              <Ionicons name="camera-outline" size={18} color={theme.colors.inkSoft} />
              <Text style={styles.assistChipText}>ფოტო</Text>
            </Pressable>
          ) : null}
          {!showNoteField ? (
            <Pressable onPress={() => setNoteOpen(true)} style={styles.assistChip} {...a11y('შენიშვნა', 'შეეხეთ შენიშვნის დასამატებლად', 'button')}>
              <Ionicons name="create-outline" size={18} color={theme.colors.inkSoft} />
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
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const [text, setText] = useState(initial);
  const lastCommitted = useRef(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accessoryId = Platform.OS === 'ios' ? 'wizard-freetext-accessory' : undefined;

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
    }, 1000);
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
    <>
      <FloatingLabelInput
        label="დასკვნა"
        value={text}
        onChangeText={setText}
        onEndEditing={() => onCommit(text)}
        multiline
        inputAccessoryViewID={accessoryId}
      />
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={accessoryId}>
          <View style={[styles.accessoryBar, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.hairline }]}>
            <Pressable
              onPress={() => KeyboardController.dismiss()}
              style={styles.accessoryBtn}
            >
              <Text style={[styles.accessoryBtnText, { color: theme.colors.accent }]}>მზადაა</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      )}
    </>
  );
}

function DebouncedNotes({
  initial,
  onCommit,
}: {
  initial: string | null;
  onCommit: (value: string) => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const [text, setText] = useState(initial ?? '');
  const lastCommitted = useRef(initial ?? '');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accessoryId = Platform.OS === 'ios' ? 'wizard-notes-accessory' : undefined;

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
    }, 1000);
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
      <FloatingLabelInput
        label="შენიშვნა"
        value={text}
        onChangeText={setText}
        onEndEditing={() => onCommit(text)}
        multiline
        maxLength={500}
        style={{ marginBottom: 4 }}
        inputAccessoryViewID={accessoryId}
      />
      <Text style={[styles.label, { textAlign: 'right', marginBottom: 0 }]}>
        {text.length}/500
      </Text>
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={accessoryId}>
          <View style={[styles.accessoryBar, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.hairline }]}>
            <Pressable
              onPress={() => KeyboardController.dismiss()}
              style={styles.accessoryBtn}
            >
              <Text style={[styles.accessoryBtnText, { color: theme.colors.accent }]}>მზადაა</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      )}
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
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

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
    }, 1000);
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
      <View style={staticStyles.rowCenterGap10}>
        <FloatingLabelInput
          label={`${question.title ?? ''}${question.unit ? ` (${question.unit})` : ''}`}
          value={text}
          onChangeText={setText}
          onEndEditing={() => onCommit(parseMeasure(text))}
          keyboardType="decimal-pad"
          style={{ marginBottom: 0, flex: 1 }}
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
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

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
    const { tint, bg, icon } = scaffoldColStyle(col, theme);
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
        {...a11y('სტატუსი: ' + col, 'შეეხეთ ამ სტატუსის ასარჩევად', 'button')}
      >
        <Ionicons
          name={isSelected ? (icon as any) : 'ellipse-outline'}
          size={22}
          color={isSelected ? tint : theme.colors.inkFaint}
        />
        <Text
          style={[
            staticStyles.statusOptionText,
            { color: isSelected ? tint : theme.colors.ink },
          ]}
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
    <View style={staticStyles.gap8}>
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
function scaffoldColStyle(col: string, theme: any): { tint: string; bg: string; icon: string } {
  if (col.includes('დაზიანება')) return { tint: theme.colors.danger, bg: theme.colors.dangerSoft, icon: 'close-circle' };
  if (col.includes('გამართულია')) return { tint: theme.colors.accent, bg: theme.colors.accentSoft, icon: 'checkmark-circle' };
  return { tint: theme.colors.inkSoft, bg: theme.colors.subtleSurface, icon: 'remove-circle' };
}

function WizardHeader({
  step,
  stepIndex,
  total,
  project,
  template,
  hasProgress,
  onBack,
  onClose,
}: {
  step: FlatStep;
  stepIndex: number;
  total: number;
  project: Project | null;
  template: Template | null;
  hasProgress: boolean;
  onBack: () => void;
  onClose: () => void;
}) {
  // step is unused now that the header always shows the flow title — kept in
  // the signature so the call site doesn't have to change shape.
  void step;
  return (
    <FlowHeader
      flowTitle={template?.name ?? 'კითხვარი'}
      project={project}
      step={stepIndex + 1}
      totalSteps={total}
      leading="back"
      trailing="close"
      onBack={onBack}
      onClose={onClose}
      backDisabled={stepIndex === 0}
      confirmExit={hasProgress}
    />
  );
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
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const cols = question.grid_cols ?? [];
  const isHarness = (question.grid_rows?.[0] ?? '') === 'N1';
  const values: Record<string, string> = (answer?.grid_values ?? {})[row] ?? {};
  // The whole component_grid shares one answer record; photos for that
  // answer are tagged with `caption = "row:<row>"` at upload so we can scope
  // them back to the row that uploaded them.
  const allAnswerPhotos = answer ? photosByAnswer[answer.id] ?? [] : [];
  const rowTag = `row:${row}`;
  const answerPhotos = allAnswerPhotos.filter(p => p.caption === rowTag);
  const hasPhotos = answerPhotos.length > 0;
  const [previewPhoto, setPreviewPhoto] = useState<AnswerPhoto | null>(null);

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
    const [commentOpen, setCommentOpen] = useState(false);
    const showCommentField = !!commentValue || commentOpen;
    const noneCol = statusCols.find(c => c.includes('გააჩნია')) ?? null;
    const scrollRef = useRef<ScrollView>(null);

    return (
      <KeyboardAwareScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[staticStyles.padH16, staticStyles.padTop16, staticStyles.padB24, staticStyles.gap16]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        bottomOffset={120}
      >
        <View style={staticStyles.centerPadV8Gap12}>
          <QuestionAvatar illustrationKey={illustrationKeyFor(row)} />
          <Text style={{ fontSize: 22, fontWeight: '800', color: theme.colors.ink, textAlign: 'center' }}>
            {row}
          </Text>
        </View>

        <>
            {hasPhotos ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[staticStyles.gap10, staticStyles.padV8]}
              >
                {answerPhotos.map(p => (
                  <Pressable key={p.id} onPress={() => setPreviewPhoto(p)} style={styles.photoTile} {...a11y('ფოტოს ნახვა', 'შეეხეთ ფოტოს დიდად სანახავად', 'button')}>
                    <PhotoThumb photo={p} size={120} />
                  </Pressable>
                ))}
                <Pressable onPress={onPickPhoto} style={styles.addPhotoTile} {...a11y('ფოტოს დამატება', 'შეეხეთ ახალი ფოტოს ასატვირთად', 'button')}>
                  <Ionicons name="add" size={32} color={theme.colors.inkSoft} />
                </Pressable>
              </ScrollView>
            ) : null}

            {hasComment && showCommentField ? (
              <FloatingLabelInput
                label="კომენტარი"
                value={commentValue}
                onChangeText={text => setValue('კომენტარი', text || null, false)}
                autoFocus
                onFocus={() => {
                  // KeyboardAwareScrollView handles scroll-to-focus automatically
                }}
              />
            ) : null}

            {!hasPhotos || (hasComment && !showCommentField) ? (
              <View style={styles.chipRow}>
                {!hasPhotos ? (
                  <Pressable onPress={onPickPhoto} style={styles.assistChip} {...a11y('ფოტოს დამატება', 'შეეხეთ ახალი ფოტოს ასატვირთად', 'button')}>
                    <Ionicons name="camera-outline" size={18} color={theme.colors.inkSoft} />
                    <Text style={styles.assistChipText}>ფოტო</Text>
                  </Pressable>
                ) : null}
                {hasComment && !showCommentField ? (
                  <Pressable
                    onPress={() => setCommentOpen(true)}
                    style={styles.assistChip}
                    {...a11y('კომენტარი', 'შეეხეთ კომენტარის დასამატებლად', 'button')}
                  >
                    <Ionicons name="create-outline" size={18} color={theme.colors.inkSoft} />
                    <Text style={styles.assistChipText}>კომენტარი</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </>

        <PhotoPreviewModal
          photo={previewPhoto}
          visible={!!previewPhoto}
          onClose={() => setPreviewPhoto(null)}
          onDelete={async (photo) => {
            await onDeletePhoto(photo);
          }}
        />
      </KeyboardAwareScrollView>
    );
  }

  // Harness: scrollable list of components with ✓/✗ chips
  return (
    <KeyboardAwareScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[staticStyles.stepScrollContent, staticStyles.padTop16]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
      bottomOffset={120}
    >
      <View style={{ alignItems: 'center', paddingVertical: 8, gap: 4 }}>
        <Text style={{ fontSize: 12, color: theme.colors.inkSoft }}>{question.title}</Text>
        <Text style={{ fontSize: 28, fontWeight: '800', color: theme.colors.ink, textAlign: 'center' }}>
          {row}
        </Text>
      </View>

      {isFirstRow ? (
        <View style={staticStyles.rowBetweenPadH4}>
          <Text style={{ fontWeight: '600' }}>რამდენი ქამარი სულ?</Text>
          <View style={staticStyles.rowCenterGap12}>
            <Pressable onPress={() => setHarnessRowCount(Math.max(1, harnessRowCount - 1))} {...a11y('ქამრების რაოდენობის შემცირება', 'შეეხეთ რაოდენობის შესამცირებლად', 'button')}>
              <Ionicons name="remove-circle" size={28} color={theme.colors.accent} />
            </Pressable>
            <Text style={{ fontSize: 18, fontWeight: '700' }}>{harnessRowCount}</Text>
            <Pressable onPress={() => setHarnessRowCount(Math.min(15, harnessRowCount + 1))} {...a11y('ქამრების რაოდენობის გაზრდა', 'შეეხეთ რაოდენობის გასაზრდელად', 'button')}>
              <Ionicons name="add-circle" size={28} color={theme.colors.accent} />
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={staticStyles.gap8}>
        {cols.map(col => {
          const current = values[col];
          return (
            <View key={col} style={styles.harnessRow}>
              <Text style={staticStyles.harnessColLabel}>{col}</Text>
              <View style={staticStyles.harnessChipRow}>
                <Pressable
                  onPress={() => setValue(col, 'ვარგისია', false)}
                  style={[
                    styles.chip,
                    current === 'ვარგისია' && {
                      backgroundColor: theme.colors.accentSoft,
                      borderColor: theme.colors.accent,
                    },
                  ]}
                  {...a11y(col + ' - ვარგისია', 'შეეხეთ ვარგისად მოსანიშნად', 'button')}
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
                  {...a11y(col + ' - დაზიანებულია', 'შეეხეთ დაზიანებულად მოსანიშნად', 'button')}
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
          contentContainerStyle={[staticStyles.gap10, staticStyles.padV8]}
        >
          {answerPhotos.map(p => (
            <Pressable key={p.id} onPress={() => setPreviewPhoto(p)} style={styles.photoTile} {...a11y('ფოტოს ნახვა', 'შეეხეთ ფოტოს დიდად სანახავად', 'button')}>
              <PhotoThumb photo={p} size={120} />
            </Pressable>
          ))}
          <Pressable onPress={onPickPhoto} style={styles.addPhotoTile} {...a11y('ფოტოს დამატება', 'შეეხეთ ახალი ფოტოს ასატვირთად', 'button')}>
            <Ionicons name="add" size={32} color={theme.colors.inkSoft} />
          </Pressable>
        </ScrollView>
      ) : (
        <View style={styles.chipRow}>
          <Pressable onPress={onPickPhoto} style={styles.assistChip} {...a11y('ფოტოს დამატება', 'შეეხეთ ახალი ფოტოს ასატვირთად', 'button')}>
            <Ionicons name="camera-outline" size={18} color={theme.colors.inkSoft} />
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
    </KeyboardAwareScrollView>
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
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const needsHarness = template?.category === 'harness';
  const harnessEmpty = needsHarness && !harnessName.trim();
  const conclusionEmpty = !conclusion.trim();
  const [previewPhoto, setPreviewPhoto] = useState<AnswerPhoto | null>(null);
  const hasPhotos = photos.length > 0;
  const accessoryId = 'wizardConclusionAccessory';

  return (
    <View style={staticStyles.gap18}>
      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={accessoryId}>
          <View style={styles.kbAccessory}>
            <Pressable
              hitSlop={10}
              onPress={() => Keyboard.dismiss()}
              style={({ pressed }) => [styles.kbDoneBtn, pressed && { opacity: 0.6 }]}
              {...a11y('მზადაა', 'შეეხეთ კლავიატურის დასახურად', 'button')}
            >
              <Text style={styles.kbDoneText}>მზადაა</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
      <View style={{ alignItems: 'center', paddingTop: 8 }}>
        <QuestionAvatar illustrationKey="conclusion" />
      </View>
      {needsHarness ? (
        <FloatingLabelInput
          label="ღვედის დასახელება"
          required
          value={harnessName}
          onChangeText={onHarnessName}
          error={harnessEmpty ? 'სავალდებულო ველი' : undefined}
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
          inputAccessoryViewID={Platform.OS === 'ios' ? accessoryId : undefined}
        />
      ) : null}
      <View style={staticStyles.gap10}>
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
            {...a11y('უსაფრთხოა', 'შეეხეთ თუ ობიექტი უსაფრთხოა', 'button')}
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
            {...a11y('არ არის უსაფრთხო', 'შეეხეთ თუ ობიექტი არ არის უსაფრთხო', 'button')}
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
          <Text style={styles.fieldError}>აუცილებლად აირჩიეთ სტატუსი.</Text>
        ) : null}
      </View>
      {photoQuestion ? (
        <View style={staticStyles.gap8}>
          <Text style={styles.label}>საერთო ფოტოები</Text>
          {hasPhotos ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[staticStyles.gap10, staticStyles.padV8]}
            >
              {photos.map(p => (
                <Pressable key={p.id} onPress={() => setPreviewPhoto(p)} style={styles.photoTile} {...a11y('ფოტოს ნახვა', 'შეეხეთ ფოტოს დიდად სანახავად', 'button')}>
                  <PhotoThumb photo={p} size={120} />
                </Pressable>
              ))}
              <Pressable onPress={onPickPhoto} style={styles.addPhotoTile} {...a11y('ფოტოს დამატება', 'შეეხეთ ახალი ფოტოს ასატვირთად', 'button')}>
                <Ionicons name="add" size={32} color={theme.colors.inkSoft} />
              </Pressable>
            </ScrollView>
          ) : (
            <View style={styles.chipRow}>
              <Pressable onPress={onPickPhoto} style={styles.assistChip} {...a11y('ფოტოს დამატება', 'შეეხეთ ახალი ფოტოს ასატვირთად', 'button')}>
                <Ionicons name="camera-outline" size={18} color={theme.colors.inkSoft} />
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
      <View>
        <FloatingLabelInput
          label="დასკვნა"
          required
          value={conclusion}
          onChangeText={onConclusion}
          error={conclusionEmpty ? 'სავალდებულო ველი' : undefined}
          multiline
          inputAccessoryViewID={Platform.OS === 'ios' ? accessoryId : undefined}
        />
      </View>
    </View>
  );
});

const PhotoThumb = memo(function PhotoThumb({ photo, size = 80 }: { photo: AnswerPhoto; size?: number }) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

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
      const url = await imageForDisplay(STORAGE_BUCKETS.answerPhotos, photo.storage_path);
      setPhotoUrlCache(cacheKey, url);
      setUri(url);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } catch {
      const fallback = storageApi.publicUrl(STORAGE_BUCKETS.answerPhotos, photo.storage_path);
      setPhotoUrlCache(cacheKey, fallback);
      setUri(fallback);
      fadeAnim.setValue(1);
    } finally {
      setLoading(false);
    }
  }, [photo.storage_path, isLocal, fadeAnim]);

  useEffect(() => {
    void load();
    return () => { fadeAnim.stopAnimation(); };
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
      <Pressable onPress={load} style={containerStyle} {...a11y('განახლება', 'შეეხეთ ფოტოს ხელახლა ჩასატვირთად', 'button')}>
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
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const loadUri = useCallback(() => {
    if (!photo) {
      setUri(null);
      setError(false);
      return;
    }
    const isLocal = /^(file|content|ph|asset):\/\//.test(photo.storage_path);
    if (isLocal) {
      setUri(photo.storage_path);
      setLoading(false);
      setError(false);
      return;
    }
    setLoading(true);
    setError(false);
    let cancelled = false;
    imageForDisplay(STORAGE_BUCKETS.answerPhotos, photo.storage_path)
      .then(url => { if (!cancelled) setUri(url); })
      .catch((e) => {
        logError(e, 'wizard.photoDisplayUrl');
        if (!cancelled) {
          setUri(storageApi.publicUrl(STORAGE_BUCKETS.answerPhotos, photo.storage_path));
          setError(true);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [photo]);

  useEffect(() => {
    const cleanup = loadUri();
    return cleanup;
  }, [loadUri]);

  if (!visible || !photo) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.previewOverlay}>
        <Pressable style={styles.previewBackdrop} onPress={onClose} {...a11y('დახურვა', 'შეეხეთ ფოტოს გადახურვისთვის', 'button')} />
        {loading || !uri ? (
          <View style={[styles.previewImage, { alignItems: 'center', justifyContent: 'center' }]}>
            <Skeleton width={120} height={120} radius={12} />
          </View>
        ) : error ? (
          <View style={[styles.previewImage, { alignItems: 'center', justifyContent: 'center', gap: 12 }]}>
            <Ionicons name="image-outline" size={48} color="rgba(255,255,255,0.5)" />
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>ფოტო ვერ ჩაიტვირთა</Text>
            <Pressable onPress={loadUri} style={{ padding: 8 }} {...a11y('თავიდან ცდა', 'შეეხეთ ფოტოს ხელახლა ჩასატვირთად', 'button')}>
              <Ionicons name="refresh" size={28} color="rgba(255,255,255,0.7)" />
            </Pressable>
          </View>
        ) : (
          <Image
            source={{ uri }}
            style={styles.previewImage}
            contentFit="contain"
            onError={() => setError(true)}
          />
        )}
        <Pressable
          style={styles.previewDeleteBtn}
          onPress={async () => {
            await onDelete(photo);
            onClose();
          }}
          {...a11y('წაშლა', 'შეეხეთ წასაშლელად', 'button')}
        >
          <Ionicons name="trash-outline" size={22} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>წაშლა</Text>
        </Pressable>
        <Pressable style={styles.previewCloseBtn} onPress={onClose} {...a11y('დახურვა', 'შეეხეთ დასახურად', 'button')}>
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
    recordRedirect('wizard', 'detail');
    router.replace(`/inspections/${id}` as any);
  }, [id, router]);
  return null;
}

function NavigationRecovery({ id, onRetry }: { id: string; onRetry: () => void }) {
  const { theme } = useTheme();
  const router = useRouter();
  return (
    <Screen edgeToEdge edges={['top']} style={{ backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Ionicons name="warning-outline" size={48} color={theme.colors.semantic.warning} style={{ marginBottom: 16 }} />
        <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.ink, marginBottom: 8, textAlign: 'center' }}>
          ჩატვირთვა ვერ მოხერხდა
        </Text>
        <Text style={{ fontSize: 14, color: theme.colors.inkSoft, marginBottom: 24, textAlign: 'center' }}>
          ინსპექციის მონაცემების ჩატვირთვა ძალიან დიდხანს გრძელდება. სცადეთ თავიდან ან გადადით უკან.
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button variant="secondary" onPress={() => router.back()} title="უკან" />
          <Button variant="primary" onPress={onRetry} title="თავიდან ცდა" />
        </View>
      </SafeAreaView>
    </Screen>
  );
}

function getstyles(theme: any) {
  return StyleSheet.create({
  kbAccessory: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.hairline,
  },
  kbDoneBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  kbDoneText: {
    color: theme.colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  accessoryBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  accessoryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  accessoryBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
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
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.hairline,
    backgroundColor: theme.colors.card,
  },
  assistChipText: {
    fontSize: 16,
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
}

const staticStyles = StyleSheet.create({
  statusOptionText: { flex: 1, fontSize: 15, fontWeight: '600' },
  harnessColLabel: { flex: 1, fontSize: 13 },
  harnessChipRow: { flexDirection: 'row', gap: 6 },
  gap8: { gap: 8 },
  gap10: { gap: 10 },
  gap14: { gap: 14 },
  gap16: { gap: 16 },
  gap18: { gap: 18 },
  padTop16: { paddingTop: 16 },
  padTop20: { paddingTop: 20 },
  padV8: { paddingVertical: 8 },
  padH16: { paddingHorizontal: 24 },
  padB12: { paddingBottom: 12 },
  padB16: { paddingBottom: 16 },
  padB24: { paddingBottom: 24 },
  flexRow: { flexDirection: 'row' },
  flexRowCenter: { flexDirection: 'row', alignItems: 'center' },
  center: { alignItems: 'center' },
  centerGap14: { alignItems: 'center', gap: 14 },
  centerPadV8Gap12: { alignItems: 'center', paddingVertical: 8, gap: 12 },
  rowCenterGap10: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowBetweenPadH4: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  rowCenterGap12: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mt24gap16: { marginTop: 24, gap: 16 },
  mt12: { marginTop: 12 },
  padH16gap8: { paddingHorizontal: 24, gap: 8 },
  stepScrollContent: { padding: 20, paddingBottom: 12, gap: 16 },
});

const uploadPillStyles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(17,24,39,0.92)',
  },
  text: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
});
