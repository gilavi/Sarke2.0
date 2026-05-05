import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { supabase } from './supabase';
import { storageApi } from './services';
import { logError } from './logError';
import { stageCompressedPhotoForOffline } from './photoCompression';
import { flushPendingPdfUploads } from './pdfUploadQueue';
import { useToast } from './toast';
import type { Answer, AnswerPhoto, Inspection } from '../types/models';

type AnswerUpsertPayload = Partial<Answer> & {
  id: string;
  inspection_id: string;
  question_id: string;
};

// Name kept for cache-key stability across the 0006 rename; payload now
// targets the `inspections` table. See enqueueQuestionnaireUpdate JSDoc.
type QuestionnaireUpdatePayload = Partial<Inspection> & { id: string };

// Photo upload op. We stage the local file under a queue-owned cache dir so
// the original picker URI (which the OS may evict) doesn't have to survive
// app restarts. On flush: upload local file → storage, then insert the
// answer_photos row, then delete the staged file.
type PhotoUploadPayload = {
  /** Stable local file URI inside our queue cache dir. */
  localUri: string;
  bucket: string;
  /** Target path inside the bucket. */
  path: string;
  contentType: string;
  answerId: string;
  inspectionId: string;
  /** `row:<key>` for grid-row photos; null for everything else. */
  caption: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
};

type QueueOp =
  | { kind: 'answer_upsert'; payload: AnswerUpsertPayload; attempts?: number }
  | { kind: 'questionnaire_update'; payload: QuestionnaireUpdatePayload; attempts?: number }
  | { kind: 'photo_upload'; payload: PhotoUploadPayload; attempts?: number };

const QUEUE_KEY = '@offline:queue';
const FAILED_QUEUE_KEY = '@offline:failed';
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

// Monotonic counter for optimistic photo ids. Combined with a timestamp +
// random suffix so two photos captured in the same millisecond cannot
// produce identical ids (4 chars of base36 random was a real collision
// risk on fast capture loops).
let pendingPhotoSeq = 0;
function nextPendingPhotoId(): string {
  pendingPhotoSeq += 1;
  const rand = Math.random().toString(36).slice(2, 10);
  return `pending:${Date.now()}-${pendingPhotoSeq}-${rand}`;
}

type OfflineContextValue = {
  isOnline: boolean;
  netReady: boolean;
  pendingCount: number;
  enqueueAnswerUpsert: (payload: AnswerUpsertPayload) => Promise<void>;
  enqueueQuestionnaireUpdate: (payload: QuestionnaireUpdatePayload) => Promise<void>;
  /**
   * Stage `sourceUri` into our cache dir and queue an upload + answer_photos
   * insert. Returns a pseudo `AnswerPhoto` so the UI can render the photo
   * immediately from the local file while the queue catches up.
   */
  enqueuePhotoUpload: (args: {
    sourceUri: string;
    bucket: string;
    path: string;
    contentType: string;
    answerId: string;
    inspectionId: string;
    caption?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    address?: string | null;
  }) => Promise<AnswerPhoto>;
  hydrateAnswers: (qid: string) => Promise<Record<string, Answer>>;
  cacheAnswers: (qid: string, answers: Record<string, Answer>) => Promise<void>;
  hydrateQuestionnairePatch: (qid: string) => Promise<Partial<Inspection> | null>;
  clearQuestionnairePatch: (qid: string) => Promise<void>;
  /** Question IDs with a still-pending answer upsert for the given inspection. */
  pendingAnswerQuestionIds: (inspectionId: string) => Promise<Set<string>>;
  flush: () => Promise<void>;
  failedCount: number;
  retryFailed: () => Promise<void>;
  dismissFailed: () => Promise<void>;
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
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as QueueOp[];
  } catch (e) {
    logError(e, 'offline.readQueue.parse');
    return [];
  }
}

async function writeQueueRaw(ops: QueueOp[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(ops));
}

async function readFailedQueue(): Promise<QueueOp[]> {
  const raw = await AsyncStorage.getItem(FAILED_QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as QueueOp[];
  } catch (e) {
    logError(e, 'offline.readFailedQueue.parse');
    return [];
  }
}

async function writeFailedQueueRaw(ops: QueueOp[]): Promise<void> {
  await AsyncStorage.setItem(FAILED_QUEUE_KEY, JSON.stringify(ops));
}

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [netReady, setNetReady] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const onlineRef = useRef(true);
  const toast = useToast();

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

  const setFailedQueue = useCallback(async (ops: QueueOp[]) => {
    await writeFailedQueueRaw(ops);
    setFailedCount(ops.length);
  }, []);

  const flush = useCallback(async (): Promise<void> => {
    if (!onlineRef.current) return;
    await runExclusive(async () => {
      let ops = await readQueue();
      // Cap iterations to the starting count so a single bad payload
      // can't stall the queue — failing ops rotate to the back.
      let processed = 0;
      const startCount = ops.length;
      while (ops.length > 0 && onlineRef.current && processed < startCount) {
        const op = ops[0];
        try {
          if (op.kind === 'answer_upsert') {
            const { error } = await supabase
              .from('answers')
              .upsert(op.payload, { onConflict: 'inspection_id,question_id' });
            if (error) throw error;
          } else if (op.kind === 'questionnaire_update') {
            const { id, ...rest } = op.payload;
            const { error } = await supabase
              .from('inspections')
              .update(rest)
              .eq('id', id);
            if (error) throw error;
          } else {
            // photo_upload — upload local file, insert answer_photos row, then
            // delete the staged file. Retry-safe: storageApi.uploadFromUri is
            // upsert and the row insert is idempotent on (answer_id, storage_path)
            // for our caller's usage pattern (one path per capture).
            const { localUri, bucket, path, contentType, answerId, caption, latitude, longitude, address } = op.payload;
            await storageApi.uploadFromUri(bucket, path, localUri, contentType);
            const { error } = await supabase
              .from('answer_photos')
              .insert({ answer_id: answerId, storage_path: path, caption: caption ?? null, latitude: latitude ?? null, longitude: longitude ?? null, address: address ?? null });
            if (error) throw error;
            FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => undefined);
          }
          ops = ops.slice(1);
          await setQueue(ops);
        } catch (err) {
          const attempts = (op.attempts ?? 0) + 1;
          if (attempts >= MAX_OP_RETRIES) {
            logError(err, `offline.flush.fail.${op.kind}`);
            ops = ops.slice(1);
            const failed = await readFailedQueue();
            failed.push({ ...op, attempts: 0 });
            await setFailedQueue(failed);
            toast.error('სინქრონიზაცია ვერ მოხერხდა');
          } else {
            // Rotate to the back so subsequent ops still get a chance.
            ops = [...ops.slice(1), { ...op, attempts }];
          }
          await setQueue(ops);
        }
        processed++;
      }
    });
  }, [setQueue, runExclusive]);

  useEffect(() => {
    void readQueue().then((q) => setPendingCount(q.length));
    void readFailedQueue().then((q) => setFailedCount(q.length));
    // Seed current state once before subscribing, so the first render
    // after `netReady` reflects reality instead of the `true` default.
    void NetInfo.fetch().then((s) => {
      const online = !!s.isConnected && s.isInternetReachable !== false;
      onlineRef.current = online;
      setIsOnline(online);
      setNetReady(true);
      if (online) {
        void flush();
        void flushPendingPdfUploads();
      }
    });
    const unsub = NetInfo.addEventListener((s) => {
      const online = !!s.isConnected && s.isInternetReachable !== false;
      onlineRef.current = online;
      setIsOnline(online);
      setNetReady(true);
      if (online) {
        void flush();
        void flushPendingPdfUploads();
      }
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
        // Cache patch must NOT include server-canonical fields: re-applying
        // them on reload triggered the wizard↔detail redirect loop.
        const cachePatch = stripServerFields(merged);
        await AsyncStorage.setItem(questionnaireKey(payload.id), JSON.stringify(cachePatch));
        await setQueue(filtered);
      });
      if (onlineRef.current) void flush();
    },
    [flush, setQueue, runExclusive],
  );

  const enqueuePhotoUpload = useCallback<OfflineContextValue['enqueuePhotoUpload']>(
    async ({ sourceUri, bucket, path, contentType, answerId, inspectionId, caption, latitude, longitude, address }) => {
      const localUri = await stageCompressedPhotoForOffline(sourceUri, 'inspection');
      await runExclusive(async () => {
        const ops = await readQueue();
        ops.push({
          kind: 'photo_upload',
          payload: {
            localUri,
            bucket,
            path,
            contentType,
            answerId,
            inspectionId,
            caption: caption ?? null,
            latitude: latitude ?? null,
            longitude: longitude ?? null,
            address: address ?? null,
          },
        });
        await setQueue(ops);
      });
      if (onlineRef.current) void flush();
      // Optimistic record so the UI can render the photo from the local file
      // immediately. Once the queue flushes the server-issued row will replace
      // it on the next reload.
      const optimistic: AnswerPhoto = {
        id: nextPendingPhotoId(),
        answer_id: answerId,
        storage_path: localUri,
        caption: caption ?? null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        address: address ?? null,
        created_at: new Date().toISOString(),
      };
      return optimistic;
    },
    [flush, setQueue, runExclusive],
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

  const clearQuestionnairePatch = useCallback<
    OfflineContextValue['clearQuestionnairePatch']
  >(async (qid) => {
    await AsyncStorage.removeItem(questionnaireKey(qid));
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

  // Memoize so consumers don't re-render on every parent render — only when
  // an actual field they care about changes. The five callbacks are already
  // stable via useCallback, so the value identity is driven by the three
  // observable state fields.
  const retryFailed = useCallback(async () => {
    await runExclusive(async () => {
      const failed = await readFailedQueue();
      if (failed.length === 0) return;
      const queue = await readQueue();
      queue.push(...failed.map(op => ({ ...op, attempts: 0 })));
      await writeQueueRaw(queue);
      await writeFailedQueueRaw([]);
      setPendingCount(queue.length);
      setFailedCount(0);
    });
    if (onlineRef.current) void flush();
  }, [runExclusive, flush]);

  const dismissFailed = useCallback(async () => {
    await runExclusive(async () => {
      const failed = await readFailedQueue();
      for (const op of failed) {
        if (op.kind === 'photo_upload') {
          FileSystem.deleteAsync(op.payload.localUri, { idempotent: true }).catch(() => undefined);
        }
      }
      await writeFailedQueueRaw([]);
      setFailedCount(0);
    });
  }, [runExclusive]);

  const value = useMemo<OfflineContextValue>(
    () => ({
      isOnline,
      netReady,
      pendingCount,
      enqueueAnswerUpsert,
      enqueueQuestionnaireUpdate,
      enqueuePhotoUpload,
      hydrateAnswers,
      cacheAnswers,
      hydrateQuestionnairePatch,
      clearQuestionnairePatch,
      pendingAnswerQuestionIds,
      flush,
      failedCount,
      retryFailed,
      dismissFailed,
    }),
    [
      isOnline,
      netReady,
      pendingCount,
      failedCount,
      enqueueAnswerUpsert,
      enqueueQuestionnaireUpdate,
      enqueuePhotoUpload,
      hydrateAnswers,
      cacheAnswers,
      hydrateQuestionnairePatch,
      clearQuestionnairePatch,
      pendingAnswerQuestionIds,
      flush,
      retryFailed,
      dismissFailed,
    ],
  );

  return <OfflineCtx.Provider value={value}>{children}</OfflineCtx.Provider>;
}
