import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { supabase } from './supabase';
import { logError } from './logError';
import {
  addToQueue,
  getPendingCount,
  getPendingItems,
  markCompleted,
  markFailed,
  processQueue,
  type QueueItem,
} from './sync-queue';
import type { Answer, Inspection } from '../types/models';

type AnswerUpsertPayload = Partial<Answer> & {
  id: string;
  inspection_id: string;
  question_id: string;
};

// Name kept for cache-key stability across the 0006 rename; payload now
// targets the `inspections` table. See enqueueQuestionnaireUpdate JSDoc.
type QuestionnaireUpdatePayload = Partial<Inspection> & { id: string };

const QUEUE_KEY = '@offline:queue';
const answersKey = (qid: string) => `@offline:answers:${qid}`;
const questionnaireKey = (qid: string) => `@offline:questionnaire:${qid}`;

// Fields the server owns. Persisting them locally and merging back on reload
// would re-apply a queued completion and trigger the wizard↔detail redirect loop.
const SERVER_CANONICAL_INSPECTION_FIELDS = [
  'status',
  'completed_at',
  'updated_at',
  'created_at',
  'user_id',
] as const;

export function stripServerFields<T extends Partial<Inspection>>(patch: T): T {
  const out = { ...patch } as T & Record<string, unknown>;
  for (const k of SERVER_CANONICAL_INSPECTION_FIELDS) {
    delete out[k];
  }
  return out as T;
}

const MAX_OP_RETRIES = 3;

type OfflineContextValue = {
  isOnline: boolean;
  netReady: boolean;
  pendingCount: number;
  enqueueAnswerUpsert: (payload: AnswerUpsertPayload) => Promise<void>;
  enqueueQuestionnaireUpdate: (payload: QuestionnaireUpdatePayload) => Promise<void>;
  hydrateAnswers: (qid: string) => Promise<Record<string, Answer>>;
  cacheAnswers: (qid: string, answers: Record<string, Answer>) => Promise<void>;
  hydrateQuestionnairePatch: (qid: string) => Promise<Partial<Inspection> | null>;
  /** Question IDs with a still-pending answer upsert for the given inspection. */
  pendingAnswerQuestionIds: (inspectionId: string) => Promise<Set<string>>;
  flush: () => Promise<void>;
};

const OfflineCtx = createContext<OfflineContextValue | null>(null);

export function useOffline(): OfflineContextValue {
  const v = useContext(OfflineCtx);
  if (!v) throw new Error('useOffline must be used inside OfflineProvider');
  return v;
}

/** One-time migration: move old AsyncStorage queue into SQLite, then delete. */
async function migrateLegacyQueue(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return;
    const ops = JSON.parse(raw) as Array<
      | { kind: 'answer_upsert'; payload: AnswerUpsertPayload }
      | { kind: 'questionnaire_update'; payload: QuestionnaireUpdatePayload }
    >;
    for (const op of ops) {
      if (op.kind === 'answer_upsert') {
        await addToQueue(
          'answer_upsert',
          'answers',
          `${op.payload.inspection_id}:${op.payload.question_id}`,
          op.payload,
        );
      } else {
        await addToQueue(
          'questionnaire_update',
          'inspections',
          op.payload.id,
          op.payload,
        );
      }
    }
    await AsyncStorage.removeItem(QUEUE_KEY);
  } catch (e) {
    logError(e, 'offline.migrateLegacyQueue');
  }
}

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [netReady, setNetReady] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const onlineRef = useRef(true);
  const migratedRef = useRef(false);

  const refreshCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  const flush = useCallback(async (): Promise<void> => {
    if (!onlineRef.current) return;
    await processQueue(async (item: QueueItem) => {
      const payload = JSON.parse(item.payload_json);
      if (item.operation_type === 'answer_upsert') {
        const { error } = await supabase
          .from('answers')
          .upsert(payload, { onConflict: 'inspection_id,question_id' });
        if (error) throw error;
      } else if (item.operation_type === 'questionnaire_update') {
        const { id, ...rest } = payload;
        const { error } = await supabase.from('inspections').update(rest).eq('id', id);
        if (error) throw error;
      }
      await markCompleted(item.id);
    });
    await refreshCount();
  }, [refreshCount]);

  useEffect(() => {
    void (async () => {
      if (!migratedRef.current) {
        await migrateLegacyQueue();
        migratedRef.current = true;
      }
      await refreshCount();
      const s = await NetInfo.fetch();
      const online = !!s.isConnected && s.isInternetReachable !== false;
      onlineRef.current = online;
      setIsOnline(online);
      setNetReady(true);
      if (online) void flush();
    })();
    const unsub = NetInfo.addEventListener((s) => {
      const online = !!s.isConnected && s.isInternetReachable !== false;
      onlineRef.current = online;
      setIsOnline(online);
      setNetReady(true);
      if (online) void flush();
    });
    return () => unsub();
  }, [flush, refreshCount]);

  const enqueueAnswerUpsert = useCallback<OfflineContextValue['enqueueAnswerUpsert']>(
    async (payload) => {
      // Coalesce: drop any prior pending upsert for the same (inspection, question).
      const items = await getPendingItems(1000);
      for (const item of items) {
        if (item.operation_type !== 'answer_upsert') continue;
        const p = JSON.parse(item.payload_json) as AnswerUpsertPayload;
        if (p.inspection_id === payload.inspection_id && p.question_id === payload.question_id) {
          await markCompleted(item.id);
        }
      }
      await addToQueue(
        'answer_upsert',
        'answers',
        `${payload.inspection_id}:${payload.question_id}`,
        payload,
      );
      await refreshCount();
      if (onlineRef.current) void flush();
    },
    [flush, refreshCount],
  );

  /**
   * Enqueue a partial update against the `inspections` table. Method name
   * still says "Questionnaire" to preserve AsyncStorage cache keys from
   * before the 0006 rename — a key change would silently orphan any
   * in-flight drafts on upgrade. Semantics: inspection.
   */
  const enqueueQuestionnaireUpdate = useCallback<
    OfflineContextValue['enqueueQuestionnaireUpdate']
  >(
    async (payload) => {
      // If the patch marks the inspection completed and no completed_at
      // was supplied, stamp one now. Otherwise a flush that lands hours later
      // would mark the row completed with a null timestamp and break audit.
      const stamped: typeof payload =
        payload.status === 'completed' && !payload.completed_at
          ? { ...payload, completed_at: new Date().toISOString() }
          : payload;

      // Merge with any existing pending update for this inspection.
      const items = await getPendingItems(1000);
      let merged = { ...stamped };
      for (const item of items) {
        if (item.operation_type === 'questionnaire_update' && item.target_id === payload.id) {
          const oldPayload = JSON.parse(item.payload_json) as QuestionnaireUpdatePayload;
          merged = { ...oldPayload, ...merged };
          await markCompleted(item.id);
        }
      }

      await addToQueue('questionnaire_update', 'inspections', payload.id, merged);

      // Cache patch must NOT include server-canonical fields: re-applying
      // them on reload triggered the wizard↔detail redirect loop.
      const cachePatch = stripServerFields(merged);
      await AsyncStorage.setItem(questionnaireKey(payload.id), JSON.stringify(cachePatch));
      await refreshCount();
      if (onlineRef.current) void flush();
    },
    [flush, refreshCount],
  );

  const hydrateAnswers = useCallback<OfflineContextValue['hydrateAnswers']>(async (qid) => {
    const raw = await AsyncStorage.getItem(answersKey(qid));
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, Answer>;
    } catch (e) {
      logError(e, 'offline.hydrateAnswers.parse');
      return {};
    }
  }, []);

  const cacheAnswers = useCallback<OfflineContextValue['cacheAnswers']>(
    async (qid, answers) => {
      await AsyncStorage.setItem(answersKey(qid), JSON.stringify(answers));
    },
    [],
  );

  const hydrateQuestionnairePatch = useCallback<
    OfflineContextValue['hydrateQuestionnairePatch']
  >(async (qid) => {
    const raw = await AsyncStorage.getItem(questionnaireKey(qid));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Partial<Inspection>;
    } catch (e) {
      logError(e, 'offline.hydrateQuestionnairePatch.parse');
      return null;
    }
  }, []);

  const pendingAnswerQuestionIds = useCallback<
    OfflineContextValue['pendingAnswerQuestionIds']
  >(async (inspectionId) => {
    const items = await getPendingItems(1000);
    const ids = new Set<string>();
    for (const item of items) {
      if (item.operation_type === 'answer_upsert') {
        const p = JSON.parse(item.payload_json) as AnswerUpsertPayload;
        if (p.inspection_id === inspectionId) {
          ids.add(p.question_id);
        }
      }
    }
    return ids;
  }, []);

  const value: OfflineContextValue = {
    isOnline,
    netReady,
    pendingCount,
    enqueueAnswerUpsert,
    enqueueQuestionnaireUpdate,
    hydrateAnswers,
    cacheAnswers,
    hydrateQuestionnairePatch,
    pendingAnswerQuestionIds,
    flush,
  };

  return <OfflineCtx.Provider value={value}>{children}</OfflineCtx.Provider>;
}
