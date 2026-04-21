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
import type { Answer, Questionnaire } from '../types/models';

type AnswerUpsertPayload = Partial<Answer> & {
  id: string;
  questionnaire_id: string;
  question_id: string;
};

type QuestionnaireUpdatePayload = Partial<Questionnaire> & { id: string };

type QueueOp =
  | { kind: 'answer_upsert'; payload: AnswerUpsertPayload }
  | { kind: 'questionnaire_update'; payload: QuestionnaireUpdatePayload };

const QUEUE_KEY = '@offline:queue';
const answersKey = (qid: string) => `@offline:answers:${qid}`;
const questionnaireKey = (qid: string) => `@offline:questionnaire:${qid}`;

type OfflineContextValue = {
  isOnline: boolean;
  pendingCount: number;
  enqueueAnswerUpsert: (payload: AnswerUpsertPayload) => Promise<void>;
  enqueueQuestionnaireUpdate: (payload: QuestionnaireUpdatePayload) => Promise<void>;
  hydrateAnswers: (qid: string) => Promise<Record<string, Answer>>;
  cacheAnswers: (qid: string, answers: Record<string, Answer>) => Promise<void>;
  hydrateQuestionnairePatch: (qid: string) => Promise<Partial<Questionnaire> | null>;
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
  const [pendingCount, setPendingCount] = useState(0);
  const flushing = useRef(false);
  const onlineRef = useRef(true);

  const setQueue = useCallback(async (ops: QueueOp[]) => {
    await writeQueueRaw(ops);
    setPendingCount(ops.length);
  }, []);

  const flush = useCallback(async () => {
    if (flushing.current) return;
    if (!onlineRef.current) return;
    flushing.current = true;
    try {
      let ops = await readQueue();
      while (ops.length > 0 && onlineRef.current) {
        const op = ops[0];
        try {
          if (op.kind === 'answer_upsert') {
            const { error } = await supabase
              .from('answers')
              .upsert(op.payload, { onConflict: 'questionnaire_id,question_id' });
            if (error) throw error;
          } else {
            const { id, ...rest } = op.payload;
            const { error } = await supabase
              .from('questionnaires')
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
    } finally {
      flushing.current = false;
    }
  }, [setQueue]);

  useEffect(() => {
    void readQueue().then((q) => setPendingCount(q.length));
    const unsub = NetInfo.addEventListener((s) => {
      const online = !!s.isConnected && s.isInternetReachable !== false;
      onlineRef.current = online;
      setIsOnline(online);
      if (online) void flush();
    });
    return () => unsub();
  }, [flush]);

  const enqueueAnswerUpsert = useCallback<OfflineContextValue['enqueueAnswerUpsert']>(
    async (payload) => {
      const ops = await readQueue();
      // Coalesce: drop any prior pending upsert for the same (questionnaire, question).
      const filtered = ops.filter(
        (o) =>
          !(
            o.kind === 'answer_upsert' &&
            o.payload.questionnaire_id === payload.questionnaire_id &&
            o.payload.question_id === payload.question_id
          ),
      );
      filtered.push({ kind: 'answer_upsert', payload });
      await setQueue(filtered);
      if (onlineRef.current) void flush();
    },
    [flush, setQueue],
  );

  const enqueueQuestionnaireUpdate = useCallback<
    OfflineContextValue['enqueueQuestionnaireUpdate']
  >(
    async (payload) => {
      const ops = await readQueue();
      let merged = { ...payload };
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
      if (onlineRef.current) void flush();
    },
    [flush, setQueue],
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
      return JSON.parse(raw) as Partial<Questionnaire>;
    } catch {
      return null;
    }
  }, []);

  const value: OfflineContextValue = {
    isOnline,
    pendingCount,
    enqueueAnswerUpsert,
    enqueueQuestionnaireUpdate,
    hydrateAnswers,
    cacheAnswers,
    hydrateQuestionnairePatch,
    flush,
  };

  return <OfflineCtx.Provider value={value}>{children}</OfflineCtx.Provider>;
}
