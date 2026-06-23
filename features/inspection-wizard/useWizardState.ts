// useWizardState.ts - owns the inspection wizard's state, loading, persistence,
// and answer/photo mutations. The InspectionWizard component is a thin shell
// that renders the values returned here.
//
// Kept as one hook (rather than 5+ slices) because the moving pieces are
// deeply intertwined: load() touches every state field, patchAnswer touches
// answers + offline cache, doUpload touches photos + answers + offline. The
// file is over the 150-line "hook" target - see AGENTS.md for why splitting
// further would be net negative.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  answersApi,
  inspectionsApi,
  projectsApi,
  storageApi,
  templatesApi,
} from '../../lib/services';
import { pdfPhotoEmbed } from '../../lib/imageUrl';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { haptic } from '../../lib/haptics';
import { usePhotoPicker } from '../../hooks/usePhotoPicker';
import { useOffline, stripServerFields } from '../../lib/offline';
import { logError, toErrorMessage } from '../../lib/logError';
import { useToast } from '../../lib/toast';
import { recordCompletion } from '../../lib/calendarSchedule';
import { qk } from '../../lib/apiHooks';
import type {
  Answer,
  AnswerPhoto,
  Inspection,
  Project,
  Question,
  Template,
} from '../../types/models';

import {
  buildSteps,
  conclusionKey,
  harnessCountKey,
  harnessNameKey,
  isAnswerShapeValidForType,
  safetyKey,
  stepKey,
} from './wizardSchema';
import { useWizardPersistence } from './hooks/useWizardPersistence';

export function useWizardState(id: string | undefined) {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const offline = useOffline();
  const queryClient = useQueryClient();
  const { pickPhotosWithAnnotation } = usePhotoPicker();

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
  const [photoUploadCount, setPhotoUploadCount] = useState(0);
  const [conclusion, setConclusion] = useState('');
  const [safetyVerdict, setSafetyVerdict] = useState<'safe' | 'caution' | 'unsafe' | null>(null);
  const [harnessName, setHarnessName] = useState('');
  // Guards saveConclusionAndGo against double-tap.
  const [finishing, setFinishing] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Navigation timeout guard: if loading takes >5 s, show recovery UI.
  useEffect(() => {
    if (!loading) {
      setLoadTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setLoadTimedOut(true), 5000);
    return () => clearTimeout(timer);
  }, [loading]);

  // Enable step transition animations only after the initial load has settled.
  useEffect(() => {
    if (!loading) setAnimateSteps(true);
  }, [loading]);

  // Cancellation token for in-flight load(). See original wizard.tsx for why.
  const loadCtrlRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    loadCtrlRef.current.cancelled = true;
    const ctrl = { cancelled: false };
    loadCtrlRef.current = ctrl;
    setLoading(true);
    try {
      const q = await inspectionsApi.getById(id);
      if (ctrl.cancelled) return;
      if (!q) throw new Error(t('inspections.loadError'));
      const localPatch = await offline.hydrateQuestionnairePatch(q.id);
      if (ctrl.cancelled) return;
      const safePatch = localPatch ? stripServerFields(localPatch) : null;
      const qMerged: Inspection = { ...q, ...(safePatch ?? {}) };
      setQuestionnaire(qMerged);
      projectsApi.getById(qMerged.project_id).then((p) => {
        if (!ctrl.cancelled) setProject(p);
      }).catch(() => null);
      const tmpl = await templatesApi.getById(qMerged.template_id);
      if (ctrl.cancelled) return;
      setTemplate(tmpl);
      setConclusion(qMerged.conclusion_text ?? '');
      setSafetyVerdict(qMerged.safety_verdict ?? (qMerged.is_safe_for_use === true ? 'safe' : qMerged.is_safe_for_use === false ? 'unsafe' : null));
      setHarnessName(qMerged.harness_name ?? '');
      if (tmpl) {
        const qs = await templatesApi.questions(tmpl.id);
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
          toast.info(t('notifications.draftLoaded'));
        }
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
        if (remoteOk) {
          await offline.cacheAnswers(qMerged.id, map);
        }
      }
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
      if (savedConclusion != null) setConclusion(savedConclusion);
      // Accept new values ('safe'/'caution'/'unsafe') and old boolean strings for backwards compat.
      if (savedSafety === 'safe' || savedSafety === 'true') setSafetyVerdict('safe');
      else if (savedSafety === 'caution') setSafetyVerdict('caution');
      else if (savedSafety === 'unsafe' || savedSafety === 'false') setSafetyVerdict('unsafe');
      if (savedHarnessName != null) setHarnessName(savedHarnessName);
    } catch (e) {
      if (!ctrl.cancelled) {
        logError(e, 'wizard.load');
        toast.error(t('inspections.loadErrorWithDetail', { detail: toErrorMessage(e) }));
      }
    } finally {
      if (loadCtrlRef.current === ctrl) {
        setLoading(false);
      }
    }
  }, [id, toast, offline]);

  // Per-field AsyncStorage write-through. See ./hooks/useWizardPersistence.
  useWizardPersistence({
    id, loading, stepIndex, harnessRowCount, conclusion, safetyVerdict, harnessName,
  });

  // Initial + focus loads. The cancellation token in load() handles benign double-fire.
  // Load once per inspection id. We intentionally do NOT reload on screen
  // re-focus: the wizard owns its in-flight state (answers, step, harness
  // position, optimistic photos) and a focus refetch would tear the UI down
  // and overwrite local state - e.g. returning from the photo picker would
  // "reload" the screen mid-flow. Matches the equipment screens, which also
  // load once on [id]. Resume-after-kill is covered by the offline cache.
  useEffect(() => {
    if (id) void load();
    return () => { loadCtrlRef.current.cancelled = true; };
  }, [id]);

  const steps = useMemo(
    () => buildSteps(questions, harnessRowCount),
    [questions, harnessRowCount],
  );
  const safeStepIndex = Math.min(stepIndex, Math.max(0, steps.length - 1));
  const step = steps[safeStepIndex];

  const photoQuestion = useMemo(
    () => questions.find(q => q.type === 'photo_upload') ?? null,
    [questions],
  );
  const photoAnswerId = photoQuestion ? answers[photoQuestion.id]?.id ?? null : null;
  const generalPhotos: AnswerPhoto[] = photoAnswerId ? photos[photoAnswerId] ?? [] : [];

  const patchingRef = useRef<Set<string>>(new Set());

  const patchAnswer = useCallback(async (question: Question, mutate: (a: Answer) => Answer) => {
    if (!questionnaire) return;
    if (patchingRef.current.has(question.id)) return;
    patchingRef.current.add(question.id);
    try {
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
        toast.error(t('errors.invalidAnswerFormat'));
        return;
      }
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
        toast.error(t('inspections.answerSaveFailed', { detail: toErrorMessage(e) }));
      }
    } finally {
      patchingRef.current.delete(question.id);
    }
  }, [questionnaire, answers, offline, toast]);

  const doUpload = useCallback(async (
    uri: string,
    question: Question,
    rowKey?: string,
    mime?: string,
    ext?: string,
    path?: string,
  ) => {
    if (!questionnaire) return;
    setPhotoUploadCount(c => c + 1);
    const actualMime = mime ?? 'image/jpeg';
    const actualExt = ext ?? 'jpg';
    const actualPath = path ?? `${questionnaire.id}/${question.id}/${Date.now()}.${actualExt}`;

    const captionStr: string | null = rowKey ? `row:${rowKey}` : null;

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
          latitude: null,
          longitude: null,
          address: null,
        });
        setPhotos(prev => ({ ...prev, [answerId]: [...(prev[answerId] ?? []), optimistic] }));
        toast.success(t('notifications.photoSavedLocally'));
        return;
      }
      await storageApi.uploadFromUri(STORAGE_BUCKETS.answerPhotos, actualPath, uri, actualMime, 'inspection');
      const answer = await answersApi.upsert(baseAnswer);
      if (!existing) setAnswers(prev => ({ ...prev, [question.id]: answer }));
      const photo = await answersApi.addPhoto(answer.id, actualPath, {
        caption: captionStr,
        latitude: null,
        longitude: null,
        address: null,
      });
      setPhotos(prev => ({ ...prev, [answer.id]: [...(prev[answer.id] ?? []), photo] }));
      pdfPhotoEmbed(STORAGE_BUCKETS.answerPhotos, actualPath).catch(() => undefined);
      toast.success(t('notifications.photoUploaded'));
    } catch (e) {
      // If the inspection was completed while this upload was in flight the DB
      // trigger rejects the answer write. The completion already succeeded, so
      // there is nothing to recover - swallow silently instead of alarming the
      // user with a red toast on the success screen.
      const msg = toErrorMessage(e, '');
      if (msg.includes('is completed')) return;
      toast.error(t('inspections.photoUploadFailed', { detail: toErrorMessage(e, t('errors.network')) }));
    } finally {
      setPhotoUploadCount(c => Math.max(0, c - 1));
    }
  }, [questionnaire, answers, offline, project, toast]);

  const pickPhoto = useCallback(async (question: Question, rowKey?: string) => {
    if (!questionnaire) return;
    haptic.light();
    const results = await pickPhotosWithAnnotation();
    if (results.length === 0) return;
    const mime = 'image/jpeg';
    const ext = 'jpg';
    // Upload sequentially; unique path per photo so a batch can't collide on Date.now().
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const path = `${questionnaire.id}/${question.id}/${Date.now()}_${i}.${ext}`;
      await doUpload(result.uri, question, rowKey, mime, ext, path);
    }
  }, [questionnaire, pickPhotosWithAnnotation, doUpload]);

  const deletePhoto = useCallback(async (photo: AnswerPhoto) => {
    haptic.deletePhoto();
    const doDelete = async () => {
      try {
        if (!offline.isOnline) {
          await offline.enqueuePhotoDelete(photo.id, photo.storage_path);
          setPhotos(prev => {
            const next: Record<string, AnswerPhoto[]> = {};
            for (const [aid, list] of Object.entries(prev)) {
              next[aid] = list.filter(p => p.id !== photo.id);
            }
            return next;
          });
          toast.success(t('notifications.photoDeletedLocally'));
          return;
        }
        await answersApi.removePhoto(photo.id);
        setPhotos(prev => {
          const next: Record<string, AnswerPhoto[]> = {};
          for (const [aid, list] of Object.entries(prev)) {
            next[aid] = list.filter(p => p.id !== photo.id);
          }
          return next;
        });
        toast.success(t('notifications.photoDeleted'));
      } catch (e) {
        toast.error(t('inspections.photoDeleteFailed', { detail: toErrorMessage(e, t('errors.network')) }));
      }
    };
    Alert.alert(
      t('inspections.deletePhotoTitle'),
      t('inspections.deletePhotoBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: doDelete },
      ],
    );
  }, [offline, toast]);

  const saveConclusionAndGo = useCallback(async () => {
    if (!questionnaire) return;
    if (finishing) return;
    if (photoUploadCount > 0) {
      haptic.validationError();
      toast.error(t('errors.photoSavingPending'));
      return;
    }
    // The finish Button already fired the Medium press beat; here we only emit
    // the validation-error outcome (or success, below).
    const missing: string[] = [];
    if (safetyVerdict === null) missing.push(t('inspections.missingSafetyStatus'));
    if (!conclusion.trim()) missing.push(t('inspections.missingConclusion'));
    if (template?.category === 'harness' && !harnessName.trim()) missing.push(t('inspections.missingHarnessName'));
    if (missing.length > 0) {
      haptic.validationError();
      toast.error(t('errors.missingFields', { fields: missing.join(', ') }));
      return;
    }
    setFinishing(true);
    try {
      await offline.enqueueQuestionnaireUpdate({
        id: questionnaire.id,
        conclusion_text: conclusion,
        safety_verdict: safetyVerdict,
        is_safe_for_use: safetyVerdict === 'safe',
        harness_name: harnessName || null,
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
      await offline.flush();
      await offline.clearQuestionnairePatch(questionnaire.id).catch(() => {});
      const calCompletedAt = new Date().toISOString();
      const calGroupKey = `${questionnaire.project_id}:${questionnaire.template_id}`;
      await recordCompletion('inspections', questionnaire.id, calCompletedAt, calGroupKey).catch(() => {});
      void queryClient.invalidateQueries({ queryKey: qk.calendar.schedules });
      void queryClient.invalidateQueries({ queryKey: qk.calendar.allInspections });
      await Promise.all([
        AsyncStorage.removeItem(conclusionKey(questionnaire.id)),
        AsyncStorage.removeItem(safetyKey(questionnaire.id)),
        AsyncStorage.removeItem(harnessNameKey(questionnaire.id)),
        AsyncStorage.removeItem(stepKey(questionnaire.id)),
      ]).catch(() => {});
      haptic.success();
      const navTimeout = setTimeout(() => {
        setFinishing(false);
        toast.error(t('errors.navFailed'));
      }, 5000);
      router.replace(`/inspections/${questionnaire.id}/done` as any);
      clearTimeout(navTimeout);
    } catch (e) {
      haptic.error();
      toast.error(t('inspections.completeError', { detail: toErrorMessage(e, t('errors.network')) }));
      setFinishing(false);
    }
  }, [questionnaire, finishing, photoUploadCount, safetyVerdict, conclusion, template, harnessName, offline, queryClient, router, toast]);

  const removeInspection = useCallback(async () => {
    if (!id) return false;
    setDeleting(true);
    setDeleteConfirmVisible(false);
    try {
      await inspectionsApi.remove(id);
      haptic.success();
      toast.success(t('notifications.deleted'));
      router.back();
      return true;
    } catch (e) {
      setDeleting(false);
      haptic.error();
      toast.error(toErrorMessage(e, t('certificates.deleteError')));
      return false;
    }
  }, [id, router, toast]);

  return {
    // raw entities
    questionnaire,
    project,
    template,
    questions,
    answers,
    photos,
    // step state
    steps,
    step,
    stepIndex,
    setStepIndex,
    // ui state
    loading,
    loadTimedOut,
    setLoadTimedOut,
    setLoading,
    animateSteps,
    harnessRowCount,
    setHarnessRowCount,
    photoUploadCount,
    // form fields
    conclusion,
    setConclusion,
    safetyVerdict,
    setSafetyVerdict,
    harnessName,
    setHarnessName,
    finishing,
    deleteConfirmVisible,
    setDeleteConfirmVisible,
    deleting,
    // derived
    photoQuestion,
    photoAnswerId,
    generalPhotos,
    // actions
    load,
    patchAnswer,
    pickPhoto,
    deletePhoto,
    saveConclusionAndGo,
    removeInspection,
  };
}

export type WizardState = ReturnType<typeof useWizardState>;
