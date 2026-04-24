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
import type { Answer, Inspection } from '../types/models';

type AnswerUpsertPayload = Partial<Answer> & {
  id: string;
  inspection_id: string;
  question_id: string;
};

// Name kept for cache-key stability across the 0006 rename; payload now
// targets the `inspections` table. See enqueueQuestionnaireUpdate JSDoc.
type QuestionnaireUpdatePayload = Partial<Inspection> & { id: string };

type QueueOp =
  | { kind: 'answer_upsert'; payload: AnswerUpsertPayload }
  | { kind: 'questionnaire_update'; payload: QuestionnaireUpdatePayload };

const QUEUE_KEY = '@offline:queue';
const answersKey = (qid: string) => `@offline:answers:${qid}`;
const questionnaireKey = (qid: string) => `@offline:questionnaire:${qid}`;

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

async function readQueue(): Promise<QueueOp[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as QueueOp[];
  } catch {
    return [];
  }
}

async function writeQueueRaw(ops: QueueOp[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(ops));
}

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [netReady, setNetReady] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const onlineRef = useRef(true);

  // Serialize ALL queue mutations (enqueue + flush) through a single promise
  // chain. Without this, concurrent readQueue → setQueue cycles race and
  // silently drop ops. Every mutator appends to this chain via
  // `runExclusive(fn)`; the returned promise resolves with the fn's result.
  const queueLock = useRef<Promise<unknown>>(Promise.resolve());
  const runExclusive = useCallback(<T,>(fn: () => Promise<T>): Promise<T> => {
    const next = queueLock.current.then(fn, fn);
    // Keep the chain alive even if fn throws, so the next caller still runs.
    queueLock.current = next.catch(() => undefined);
    return next;
  }, []);

  const setQueue = useCallback(async (ops: QueueOp[]) => {
    await writeQueueRaw(ops);
    setPendingCount(ops.length);
  }, []);

  const flush = useCallback(async (): Promise<void> => {
    if (!onlineRef.current) return;
    await runExclusive(async () => {
      let ops = await readQueue();
      while (ops.length > 0 && onlineRef.current) {
        const op = ops[0];
        try {
          if (op.kind === 'answer_upsert') {
            const { error } = await supabase
              .from('answers')
              .upsert(op.payload, { onConflict: 'inspection_id,question_id' });
            if (error) throw error;
          } else {
            const { id, ...rest } = op.payload;
            const { error } = await supabase
              .from('inspections')
              .update(rest)
              .eq('id', id);
            if (error) throw error;
          }
          ops = ops.slice(1);
          await setQueue(ops);
        } catch {
          // Leave the op at head of queue; retry on next reconnect.
          break;
        }
      }
    });
  }, [setQueue, runExclusive]);

  useEffect(() => {
    void readQueue().then((q) => setPendingCount(q.length));
    // Seed current state once before subscribing, so the first render
    // after `netReady` reflects reality instead of the `true` default.
    void NetInfo.fetch().then((s) => {
      const online = !!s.isConnected && s.isInternetReachable !== false;
      onlineRef.current = online;
      setIsOnline(online);
      setNetReady(true);
      if (online) void flush();
    });
    const unsub = NetInfo.addEventListener((s) => {
      const online = !!s.isConnected && s.isInternetReachable !== false;
      onlineRef.current = online;
      setIsOnline(online);
      setNetReady(true);
      if (online) void flush();
    });
    return () => unsub();
  }, [flush]);

  const enqueueAnswerUpsert = useCallback<OfflineContextValue['enqueueAnswerUpsert']>(
    async (payload) => {
      await runExclusive(async () => {
        const ops = await readQueue();
        // Coalesce: drop any prior pending upsert for the same (inspection, question).
        const filtered = ops.filter(
          (o) =>
            !(
              o.kind === 'answer_upsert' &&
              o.payload.inspection_id === payload.inspection_id &&
              o.payload.question_id === payload.question_id
            ),
        );
        filtered.push({ kind: 'answer_upsert', payload });
        await setQueue(filtered);
      });
      if (onlineRef.current) void flush();
    },
    [flush, setQueue, runExclusive],
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
      await runExclusive(async () => {
        const ops = await readQueue();
        // If the patch marks the inspection completed and no completed_at
        // was supplied, stamp one now. Otherwise a flush that lands hours later
        // would mark the row completed with a null timestamp and break audit.
        const stamped: typeof payload =
          payload.status === 'completed' && !payload.completed_at
            ? { ...payload, completed_at: new Date().toISOString() }
            : payload;
        let merged = { ...stamped };
        const filtered: QueueOp[] = [];
        for (const op of ops) {
          if (op.kind === 'questionnaire_update' && op.payload.id === payload.id) {
            // Merge older patch into the new one so nothing is lost.
            merged = { ...op.payload, ...merged };
          } else {
            filtered.push(op);
          }
        }
        filtered.push({ kind: 'questionnaire_update', payload: merged });
        // Also stash the merged patch so the screen can hydrate it before remote sync.
        await AsyncStorage.setItem(questionnaireKey(payload.id), JSON.stringify(merged));
        await setQueue(filtered);
      });
      if (onlineRef.current) void flush();
    },
    [flush, setQueue, runExclusive],
  );

  const hydrateAnswers = useCallback<OfflineContextValue['hydrateAnswers']>(async (qid) => {
    const raw = await AsyncStorage.getItem(answersKey(qid));
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, Answer>;
    } catch {
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
    } catch {
      return null;
    }
  }, []);

  const pendingAnswerQuestionIds = useCallback<
    OfflineContextValue['pendingAnswerQuestionIds']
  >(async (inspectionId) => {
    const ops = await readQueue();
    const ids = new Set<string>();
    for (const op of ops) {
      if (op.kind === 'answer_upsert' && op.payload.inspection_id === inspectionId) {
        ids.add(op.payload.question_id);
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
