/**
 * Unit tests for `useWizardState` — the orchestration hook behind every
 * template-based inspection wizard flow (features/inspection-wizard).
 *
 * All I/O is mocked at the module boundary, following the patterns proven in
 * useBriefingSigning.test.ts / warmHomeCaches.test.ts (the wizardBootstrap
 * reads, lib/services, lib/offline, toast, router, react-query, AsyncStorage
 * — which also keeps the netinfo/expo-crypto/Flow-syntax native graph out of
 * vitest). `wizardSchema.ts` and `hooks/useWizardPersistence.ts` run REAL, so
 * the step model and the AsyncStorage write-through mirror are exercised, not
 * stubbed.
 *
 * Covered high-risk behaviors:
 *  - draft hydration: server answers + the batched `answersApi.photosByAnswerIds`
 *    fetch (incl. []-backfill for photo-less answers), offline patch merge with
 *    server-canonical field stripping, offline answer-cache fallback, pending
 *    local answers overriding remote, AsyncStorage mid-flow state restore;
 *  - step assembly + index clamping;
 *  - patchAnswer set/update semantics (id reuse, shape validation, offline
 *    enqueue, cache write-through);
 *  - photo upload online vs offline deferral (optimistic photo, no network
 *    calls), the in-flight uploads counter, the completed-race swallow;
 *  - saveConclusionAndGo: validation gating, pending-upload gating, double-tap
 *    guard, and the full completion payload assembly (enqueue → flush → clear
 *    persistence keys → recordCompletion → invalidate → navigate);
 *  - the 5 s load-timeout recovery flag (fake timers).
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type {
  Answer,
  AnswerPhoto,
  Inspection,
  Project,
  Question,
  Template,
} from '../../types/models';

// ── Mocks ────────────────────────────────────────────────────────────────────

const alertMock = vi.fn();
vi.mock('react-native', () => ({ Alert: { alert: (...a: unknown[]) => alertMock(...a) } }));

// t() echoes the key plus any interpolation values, so assertions can check
// both which message fired and which fields it listed.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts && Object.keys(opts).length > 0 ? `${key} ${Object.values(opts).join(' ')}` : key,
  }),
}));

const routerReplace = vi.fn();
const routerBack = vi.fn();
vi.mock('expo-router', () => ({ useRouter: () => ({ replace: routerReplace, back: routerBack }) }));

const queryClientStub = {};
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => queryClientStub }));

// In-memory AsyncStorage backing the REAL useWizardPersistence write-through.
const storage = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (k: string) => storage.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => {
      storage.set(k, v);
    }),
    removeItem: vi.fn(async (k: string) => {
      storage.delete(k);
    }),
  },
}));

// The five flow-start reads (mocking these keeps lib/apiHooks + the real
// Supabase client + the outbox graph out of the module graph).
const loadInspection = vi.fn();
const loadProject = vi.fn();
const loadTemplate = vi.fn();
const loadQuestions = vi.fn();
const loadAnswers = vi.fn();
vi.mock('../../features/inspection-wizard/wizardBootstrap', () => ({
  loadWizardInspection: (...a: unknown[]) => loadInspection(...a),
  loadWizardProject: (...a: unknown[]) => loadProject(...a),
  loadWizardTemplate: (...a: unknown[]) => loadTemplate(...a),
  loadWizardQuestions: (...a: unknown[]) => loadQuestions(...a),
  loadWizardAnswers: (...a: unknown[]) => loadAnswers(...a),
}));

const photosByAnswerIds = vi.fn();
const answerUpsert = vi.fn();
const addPhoto = vi.fn();
const removePhoto = vi.fn();
const inspectionRemove = vi.fn();
const uploadFromUri = vi.fn();
vi.mock('../../lib/services', () => ({
  answersApi: {
    photosByAnswerIds: (...a: unknown[]) => photosByAnswerIds(...a),
    upsert: (...a: unknown[]) => answerUpsert(...a),
    addPhoto: (...a: unknown[]) => addPhoto(...a),
    removePhoto: (...a: unknown[]) => removePhoto(...a),
  },
  inspectionsApi: { remove: (...a: unknown[]) => inspectionRemove(...a) },
  storageApi: { uploadFromUri: (...a: unknown[]) => uploadFromUri(...a) },
}));

const pdfPhotoEmbedMock = vi.fn(async () => 'data:image/jpeg;base64,x');
vi.mock('../../lib/imageUrl', () => ({
  pdfPhotoEmbed: (...a: unknown[]) => pdfPhotoEmbedMock(...(a as [])),
}));

// Avoid instantiating the real Supabase client just for the bucket constant.
vi.mock('../../lib/supabase', () => ({ STORAGE_BUCKETS: { answerPhotos: 'answer-photos' } }));

vi.mock('../../lib/haptics', async () => (await import('../mocks/rn-ui')).hapticsMock());

const pickPhotosWithAnnotation = vi.fn();
vi.mock('../../hooks/usePhotoPicker', () => ({
  usePhotoPicker: () => ({ pickPhotosWithAnnotation }),
}));

const logErrorMock = vi.fn();
vi.mock('../../lib/logError', () => ({
  logError: (...a: unknown[]) => logErrorMock(...a),
  toErrorMessage: (e: unknown, fallback = '') =>
    e instanceof Error ? e.message : typeof e === 'string' ? e : fallback,
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
const toastInfo = vi.fn();
const toastObj = { success: toastSuccess, error: toastError, info: toastInfo };
vi.mock('../../lib/toast', () => ({ useToast: () => toastObj }));

const recordCompletionMock = vi.fn(async () => {});
vi.mock('../../lib/calendarSchedule', () => ({
  recordCompletion: (...a: unknown[]) => recordCompletionMock(...(a as [])),
}));

const invalidateRecordListsMock = vi.fn();
vi.mock('../../lib/apiHooks', () => ({
  qk: {},
  invalidateRecordLists: (...a: unknown[]) => invalidateRecordListsMock(...a),
}));

// Controllable offline context. `useOffline` reads the CURRENT object so a
// test can flip `isOnline` mid-flight; `stripServerFields` mirrors the real
// server-canonical strip (lib/offline.tsx) that guards the redirect loop.
function makeOfflineCtx() {
  return {
    isOnline: true,
    netReady: true,
    pendingCount: 0,
    enqueueAnswerUpsert: vi.fn(async (_p: Record<string, unknown>) => {}),
    enqueueQuestionnaireUpdate: vi.fn(async (_p: Record<string, unknown>) => {}),
    enqueuePhotoUpload: vi.fn(
      async (args: { path: string; answerId: string; caption?: string | null }): Promise<AnswerPhoto> => ({
        id: `pending:${args.path}`,
        answer_id: args.answerId,
        storage_path: `file:///staged/${args.path}`,
        caption: args.caption ?? null,
        latitude: null,
        longitude: null,
        address: null,
        created_at: new Date().toISOString(),
      }),
    ),
    enqueuePhotoDelete: vi.fn(async (_id: string, _hint?: string) => {}),
    hydrateAnswers: vi.fn(async (): Promise<Record<string, Answer>> => ({})),
    cacheAnswers: vi.fn(async (_qid: string, _a: Record<string, Answer>) => {}),
    hydrateQuestionnairePatch: vi.fn(async (): Promise<Partial<Inspection> | null> => null),
    clearQuestionnairePatch: vi.fn(async (_qid: string) => {}),
    pendingAnswerQuestionIds: vi.fn(async () => new Set<string>()),
    flush: vi.fn(async () => {}),
    failedCount: 0,
    retryFailed: vi.fn(async () => {}),
    dismissFailed: vi.fn(async () => {}),
  };
}
let offlineCtx = makeOfflineCtx();
vi.mock('../../lib/offline', () => ({
  useOffline: () => offlineCtx,
  stripServerFields: (patch: Record<string, unknown>) => {
    const out = { ...patch };
    for (const k of ['status', 'completed_at', 'updated_at', 'created_at', 'user_id']) delete out[k];
    return out;
  },
}));

import { useWizardState } from '../../features/inspection-wizard/useWizardState';

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeInspection(extra: Partial<Inspection> = {}): Inspection {
  return {
    id: 'i1',
    project_id: 'p1',
    project_item_id: null,
    template_id: 't1',
    user_id: 'u1',
    status: 'draft',
    harness_name: null,
    conclusion_text: null,
    is_safe_for_use: null,
    safety_verdict: null,
    conclusion_photo_paths: [],
    created_at: '2026-01-01T00:00:00Z',
    completed_at: null,
    ...extra,
  };
}

function makeTemplate(extra: Partial<Template> = {}): Template {
  return {
    id: 't1',
    owner_id: null,
    name: 'ხარაჩო',
    category: 'scaffold',
    is_system: true,
    required_qualifications: [],
    required_signer_roles: [],
    ...extra,
  };
}

function makeQuestion(extra: Partial<Question> & { id: string; type: Question['type'] }): Question {
  return {
    template_id: 't1',
    section: 1,
    order: 1,
    title: 'კითხვა',
    min_val: null,
    max_val: null,
    unit: null,
    grid_rows: null,
    grid_cols: null,
    ...extra,
  };
}

const qYesno = makeQuestion({ id: 'q1', type: 'yesno', section: 1, order: 1 });
const qMeasure = makeQuestion({ id: 'q2', type: 'measure', section: 1, order: 2 });
const qPhoto = makeQuestion({ id: 'q3', type: 'photo_upload', section: 3, order: 1 });

function makeAnswer(extra: Partial<Answer> & { id: string; question_id: string }): Answer {
  return {
    inspection_id: 'i1',
    value_bool: null,
    value_num: null,
    value_text: null,
    grid_values: null,
    comment: null,
    notes: null,
    ...extra,
  };
}

function makePhoto(extra: Partial<AnswerPhoto> & { id: string; answer_id: string }): AnswerPhoto {
  return {
    storage_path: 'i1/q/x.jpg',
    caption: null,
    latitude: null,
    longitude: null,
    address: null,
    created_at: '2026-01-01T00:00:00Z',
    ...extra,
  };
}

const project: Project = {
  id: 'p1',
  user_id: 'u1',
  name: 'ობიექტი',
  company_name: 'Hubble',
  address: null,
  latitude: null,
  longitude: null,
  crew: null,
  logo: null,
  contact_phone: null,
  created_at: '2026-01-01T00:00:00Z',
};

async function mountSettled(id = 'i1') {
  const hook = renderHook(() => useWizardState(id));
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

// ── Setup ────────────────────────────────────────────────────────────────────

let uuidSeq = 0;
beforeAll(() => {
  // patchAnswer/doUpload mint answer ids via crypto.randomUUID, which older
  // jsdoms lack — stub it deterministically.
  vi.stubGlobal('crypto', { randomUUID: () => `uuid-${++uuidSeq}` });
});
afterAll(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.clearAllMocks();
  storage.clear();
  offlineCtx = makeOfflineCtx();
  loadInspection.mockResolvedValue(makeInspection());
  loadProject.mockResolvedValue(project);
  loadTemplate.mockResolvedValue(makeTemplate());
  loadQuestions.mockResolvedValue([qYesno, qMeasure, qPhoto]);
  loadAnswers.mockResolvedValue([]);
  photosByAnswerIds.mockResolvedValue({});
  pickPhotosWithAnnotation.mockResolvedValue([]);
  answerUpsert.mockImplementation(async (a: Answer) => ({ ...a }));
  addPhoto.mockImplementation(
    async (answerId: string, path: string, meta: { caption: string | null }) =>
      makePhoto({ id: `photo:${path}`, answer_id: answerId, storage_path: path, caption: meta.caption }),
  );
  uploadFromUri.mockResolvedValue(undefined);
  removePhoto.mockResolvedValue(undefined);
  inspectionRemove.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

// ── load: draft hydration ────────────────────────────────────────────────────

describe('useWizardState — load & draft hydration', () => {
  it('hydrates answers and batch-fetches photos via answersApi.photosByAnswerIds (single .in() call, []-backfilled)', async () => {
    const a1 = makeAnswer({ id: 'a1', question_id: 'q1', value_bool: true });
    const a2 = makeAnswer({ id: 'a2', question_id: 'q2', value_num: 3 });
    const ph = makePhoto({ id: 'ph1', answer_id: 'a1' });
    loadAnswers.mockResolvedValue([a1, a2]);
    photosByAnswerIds.mockResolvedValue({ a1: [ph] });

    const { result } = await mountSettled();

    expect(result.current.questionnaire?.id).toBe('i1');
    // ONE batched call with every answer id — not one request per answer.
    expect(photosByAnswerIds).toHaveBeenCalledTimes(1);
    expect(photosByAnswerIds).toHaveBeenCalledWith(['a1', 'a2']);
    // Answers keyed by question id; photo-less answers backfilled with [].
    expect(result.current.answers).toEqual({ q1: a1, q2: a2 });
    expect(result.current.photos).toEqual({ a1: [ph], a2: [] });
    // Successful remote load re-primes the offline answers cache.
    expect(offlineCtx.cacheAnswers).toHaveBeenCalledWith('i1', { q1: a1, q2: a2 });
    // Fire-and-forget project fetch lands too.
    await waitFor(() => expect(result.current.project?.id).toBe('p1'));
    expect(toastInfo).not.toHaveBeenCalled();
  });

  it('a photos batch failure degrades to empty galleries instead of failing the load', async () => {
    const a1 = makeAnswer({ id: 'a1', question_id: 'q1', value_bool: false });
    loadAnswers.mockResolvedValue([a1]);
    photosByAnswerIds.mockRejectedValue(new Error('photos down'));

    const { result } = await mountSettled();

    expect(result.current.answers.q1).toEqual(a1);
    expect(result.current.photos).toEqual({ a1: [] });
    expect(logErrorMock).toHaveBeenCalledWith(expect.any(Error), 'wizard.answers.photos');
    expect(toastError).not.toHaveBeenCalled();
  });

  it('merges the local offline patch but strips server-canonical fields (no completed-redirect loop)', async () => {
    offlineCtx.hydrateQuestionnairePatch.mockResolvedValue({
      conclusion_text: 'ლოკალური დასკვნა',
      safety_verdict: 'caution',
      status: 'completed', // server-canonical — must NOT survive the merge
    } as Partial<Inspection>);

    const { result } = await mountSettled();

    expect(result.current.questionnaire?.status).toBe('draft');
    expect(result.current.conclusion).toBe('ლოკალური დასკვნა');
    expect(result.current.safetyVerdict).toBe('caution');
  });

  it('maps the legacy boolean is_safe_for_use onto the 3-state verdict', async () => {
    loadInspection.mockResolvedValue(makeInspection({ safety_verdict: null, is_safe_for_use: true }));
    const { result } = await mountSettled();
    expect(result.current.safetyVerdict).toBe('safe');
  });

  it('falls back to the offline answers cache (with draft toast) when the remote answers list fails', async () => {
    const cached = makeAnswer({ id: 'a1', question_id: 'q1', value_bool: true });
    loadAnswers.mockRejectedValue(new Error('offline'));
    offlineCtx.hydrateAnswers.mockResolvedValue({ q1: cached });

    const { result } = await mountSettled();

    expect(result.current.answers).toEqual({ q1: cached });
    expect(photosByAnswerIds).toHaveBeenCalledWith([]); // no remote answers → empty batch
    expect(toastInfo).toHaveBeenCalledWith('notifications.draftLoaded');
    expect(logErrorMock).toHaveBeenCalledWith(expect.any(Error), 'wizard.answers.list');
    // A failed remote load must NOT overwrite the offline cache.
    expect(offlineCtx.cacheAnswers).not.toHaveBeenCalled();
  });

  it('pending (unflushed) local answers override the remote rows; settled questions keep the server value', async () => {
    const remoteQ1 = makeAnswer({ id: 'a1', question_id: 'q1', value_bool: true });
    const remoteQ2 = makeAnswer({ id: 'a2', question_id: 'q2', value_num: 1 });
    const localQ1 = makeAnswer({ id: 'a1', question_id: 'q1', value_bool: false });
    const localQ2 = makeAnswer({ id: 'a2', question_id: 'q2', value_num: 99 });
    loadAnswers.mockResolvedValue([remoteQ1, remoteQ2]);
    offlineCtx.hydrateAnswers.mockResolvedValue({ q1: localQ1, q2: localQ2 });
    offlineCtx.pendingAnswerQuestionIds.mockResolvedValue(new Set(['q1']));

    const { result } = await mountSettled();

    expect(result.current.answers.q1.value_bool).toBe(false); // pending local wins
    expect(result.current.answers.q2.value_num).toBe(1); // flushed → server wins
  });

  it('restores mid-flow step/harness/conclusion/safety/harnessName from AsyncStorage (incl. legacy safety strings)', async () => {
    storage.set('wizard:i1:step', '1');
    storage.set('wizard:i1:harnessCount', '7');
    storage.set('wizard:i1:conclusion', 'შენახული დასკვნა');
    storage.set('wizard:i1:safety', 'true'); // legacy boolean string → 'safe'
    storage.set('wizard:i1:harnessName', 'H-42');

    const { result } = await mountSettled();

    expect(result.current.stepIndex).toBe(1);
    expect(result.current.harnessRowCount).toBe(7);
    expect(result.current.conclusion).toBe('შენახული დასკვნა');
    expect(result.current.safetyVerdict).toBe('safe');
    expect(result.current.harnessName).toBe('H-42');
  });

  it('ignores NaN step and out-of-range harness count from a corrupt store', async () => {
    storage.set('wizard:i1:step', 'not-a-number');
    storage.set('wizard:i1:harnessCount', '99'); // valid range is 1..15
    storage.set('wizard:i1:safety', 'false'); // legacy → 'unsafe'

    const { result } = await mountSettled();

    expect(result.current.stepIndex).toBe(0);
    expect(result.current.harnessRowCount).toBe(5);
    expect(result.current.safetyVerdict).toBe('unsafe');
  });

  it('does not fetch anything without an id', () => {
    const { result } = renderHook(() => useWizardState(undefined));
    expect(loadInspection).not.toHaveBeenCalled();
    // The [id] effect never calls load(), so the screen stays on the skeleton
    // until the 5 s recovery flag fires — documented current behavior.
    expect(result.current.loading).toBe(true);
  });

  it('surfaces a load failure via toast and settles loading', async () => {
    loadInspection.mockRejectedValue(new Error('boom'));
    const { result } = await mountSettled();
    expect(result.current.questionnaire).toBeNull();
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('inspections.loadErrorWithDetail'));
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('boom'));
    expect(logErrorMock).toHaveBeenCalledWith(expect.any(Error), 'wizard.load');
  });

  it('treats a null inspection as a load error', async () => {
    loadInspection.mockResolvedValue(null);
    const { result } = await mountSettled();
    expect(result.current.questionnaire).toBeNull();
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('inspections.loadError'));
  });

  it('flags loadTimedOut when load hangs past 5 s (recovery UI)', () => {
    vi.useFakeTimers();
    loadInspection.mockReturnValue(new Promise(() => {})); // never settles
    const { result } = renderHook(() => useWizardState('i1'));
    expect(result.current.loadTimedOut).toBe(false);
    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(result.current.loadTimedOut).toBe(false);
    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(result.current.loadTimedOut).toBe(true);
  });
});

// ── steps & derived state ────────────────────────────────────────────────────

describe('useWizardState — steps & derived state', () => {
  it('flattens questions into steps (photo_upload folded out) ending with the conclusion, and clamps stepIndex', async () => {
    const { result } = await mountSettled();

    expect(result.current.steps.map((s) => s.kind)).toEqual(['question', 'question', 'conclusion']);
    expect(result.current.step?.kind).toBe('question');
    // The folded-out photo question still backs the conclusion gallery.
    expect(result.current.photoQuestion?.id).toBe('q3');
    expect(result.current.generalPhotos).toEqual([]);

    // An out-of-range restored index must clamp to the last step, not crash.
    act(() => result.current.setStepIndex(99));
    expect(result.current.step?.kind).toBe('conclusion');
  });

  it('splits scaffold grids one step per row and renders a null-template load as the empty step', async () => {
    const qGrid = makeQuestion({
      id: 'q5',
      type: 'component_grid',
      section: 2,
      grid_rows: ['საყრდენი', 'ფერმა'],
      grid_cols: ['გამართულია'],
    });
    loadQuestions.mockResolvedValue([qGrid]);
    const { result } = await mountSettled();
    expect(result.current.steps.map((s) => s.kind)).toEqual(['gridRow', 'gridRow', 'conclusion']);

    // Template missing → questions never load → single 'empty' step.
    loadTemplate.mockResolvedValue(null);
    const second = await mountSettled();
    expect(second.result.current.steps.map((s) => s.kind)).toEqual(['empty']);
    expect(loadQuestions).toHaveBeenCalledTimes(1); // not re-fetched for the null template
  });
});

// ── patchAnswer ──────────────────────────────────────────────────────────────

describe('useWizardState — patchAnswer', () => {
  it('creates a new answer with a minted id, updates state, caches, and enqueues the offline upsert', async () => {
    const { result } = await mountSettled();

    await act(async () => {
      await result.current.patchAnswer(qMeasure, (a) => ({ ...a, value_num: 42 }));
    });

    const saved = result.current.answers.q2;
    expect(saved.value_num).toBe(42);
    expect(saved.id).toMatch(/^uuid-/);
    expect(saved.inspection_id).toBe('i1');
    expect(offlineCtx.cacheAnswers).toHaveBeenCalledWith(
      'i1',
      expect.objectContaining({ q2: expect.objectContaining({ value_num: 42 }) }),
    );
    expect(offlineCtx.enqueueAnswerUpsert).toHaveBeenCalledWith({
      id: saved.id,
      inspection_id: 'i1',
      question_id: 'q2',
      value_bool: null,
      value_num: 42,
      value_text: null,
      grid_values: null,
      comment: null,
      notes: null,
    });
  });

  it('updates an existing answer in place, preserving its id', async () => {
    const a1 = makeAnswer({ id: 'a1', question_id: 'q1', value_bool: true });
    loadAnswers.mockResolvedValue([a1]);
    const { result } = await mountSettled();

    await act(async () => {
      await result.current.patchAnswer(qYesno, (a) => ({ ...a, value_bool: false }));
    });

    expect(result.current.answers.q1.id).toBe('a1');
    expect(result.current.answers.q1.value_bool).toBe(false);
    expect(offlineCtx.enqueueAnswerUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a1', value_bool: false }),
    );
  });

  it('rejects a shape-invalid mutation: no state change, no enqueue, error toast + log', async () => {
    const { result } = await mountSettled();

    await act(async () => {
      await result.current.patchAnswer(qYesno, (a) => ({
        ...a,
        value_bool: 'yes' as unknown as boolean, // wrong shape for a yesno question
      }));
    });

    expect(result.current.answers.q1).toBeUndefined();
    expect(offlineCtx.enqueueAnswerUpsert).not.toHaveBeenCalled();
    expect(offlineCtx.cacheAnswers).not.toHaveBeenCalledWith('i1', expect.objectContaining({ q1: expect.anything() }));
    expect(toastError).toHaveBeenCalledWith('errors.invalidAnswerFormat');
    expect(logErrorMock).toHaveBeenCalledWith(expect.any(Error), 'wizard.patchAnswer.shape');
  });

  it('keeps the optimistic state and surfaces a toast when the offline enqueue fails', async () => {
    const { result } = await mountSettled();
    offlineCtx.enqueueAnswerUpsert.mockRejectedValueOnce(new Error('queue full'));

    await act(async () => {
      await result.current.patchAnswer(qMeasure, (a) => ({ ...a, value_num: 7 }));
    });

    expect(result.current.answers.q2.value_num).toBe(7); // optimistic state kept
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('inspections.answerSaveFailed'));
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('queue full'));
  });
});

// ── photos: pickPhoto online / offline ───────────────────────────────────────

describe('useWizardState — photo upload', () => {
  it('online: uploads to storage, upserts the answer, inserts the photo row, and embeds for PDF', async () => {
    pickPhotosWithAnnotation.mockResolvedValue([{ uri: 'file:///cam/1.jpg' }]);
    const { result } = await mountSettled();

    await act(async () => {
      await result.current.pickPhoto(qPhoto);
    });

    expect(uploadFromUri).toHaveBeenCalledTimes(1);
    const [bucket, path, uri, mime, kind] = uploadFromUri.mock.calls[0];
    expect(bucket).toBe('answer-photos');
    expect(path).toMatch(/^i1\/q3\/\d+_0\.jpg$/);
    expect(uri).toBe('file:///cam/1.jpg');
    expect(mime).toBe('image/jpeg');
    expect(kind).toBe('inspection');

    expect(answerUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ inspection_id: 'i1', question_id: 'q3' }),
    );
    const answerId = (answerUpsert.mock.calls[0][0] as Answer).id;
    expect(addPhoto).toHaveBeenCalledWith(answerId, path, {
      caption: null,
      latitude: null,
      longitude: null,
      address: null,
    });
    expect(result.current.answers.q3.id).toBe(answerId);
    expect(result.current.photos[answerId]).toHaveLength(1);
    // q3 is the photo question → the conclusion gallery sees it.
    expect(result.current.generalPhotos).toHaveLength(1);
    expect(pdfPhotoEmbedMock).toHaveBeenCalledWith('answer-photos', path);
    expect(toastSuccess).toHaveBeenCalledWith('notifications.photoUploaded');
    expect(offlineCtx.enqueuePhotoUpload).not.toHaveBeenCalled();
  });

  it('offline: defers through the queue with an optimistic photo — no network calls', async () => {
    offlineCtx.isOnline = false;
    pickPhotosWithAnnotation.mockResolvedValue([{ uri: 'file:///cam/2.jpg' }]);
    const { result } = await mountSettled();

    await act(async () => {
      await result.current.pickPhoto(qYesno, 'N2');
    });

    // The answer stub is created + enqueued so the photo has a parent row.
    expect(offlineCtx.enqueueAnswerUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ inspection_id: 'i1', question_id: 'q1' }),
    );
    expect(offlineCtx.enqueuePhotoUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceUri: 'file:///cam/2.jpg',
        bucket: 'answer-photos',
        inspectionId: 'i1',
        contentType: 'image/jpeg',
        caption: 'row:N2', // grid rowKey is preserved for the row gallery
      }),
    );
    expect(uploadFromUri).not.toHaveBeenCalled();
    expect(answerUpsert).not.toHaveBeenCalled();
    expect(addPhoto).not.toHaveBeenCalled();

    const call = offlineCtx.enqueuePhotoUpload.mock.calls[0][0] as { answerId: string };
    expect(result.current.photos[call.answerId]).toHaveLength(1);
    expect(result.current.photos[call.answerId][0].id).toMatch(/^pending:/);
    expect(toastSuccess).toHaveBeenCalledWith('notifications.photoSavedLocally');
  });

  it('multi-select uploads sequentially with unique per-photo paths (no Date.now() collision)', async () => {
    pickPhotosWithAnnotation.mockResolvedValue([{ uri: 'file:///a.jpg' }, { uri: 'file:///b.jpg' }]);
    const { result } = await mountSettled();

    await act(async () => {
      await result.current.pickPhoto(qPhoto);
    });

    expect(uploadFromUri).toHaveBeenCalledTimes(2);
    const p0 = uploadFromUri.mock.calls[0][1] as string;
    const p1 = uploadFromUri.mock.calls[1][1] as string;
    expect(p0).not.toBe(p1);
    expect(p0.endsWith('_0.jpg')).toBe(true);
    expect(p1.endsWith('_1.jpg')).toBe(true);
  });

  it('swallows the completed-while-uploading race silently (no error toast)', async () => {
    uploadFromUri.mockRejectedValue(new Error('inspection is completed'));
    pickPhotosWithAnnotation.mockResolvedValue([{ uri: 'file:///late.jpg' }]);
    const { result } = await mountSettled();

    await act(async () => {
      await result.current.pickPhoto(qPhoto);
    });

    expect(toastError).not.toHaveBeenCalled();
    expect(result.current.photoUploadCount).toBe(0); // counter still decremented
  });

  it('any other upload failure surfaces a toast and decrements the counter', async () => {
    uploadFromUri.mockRejectedValue(new Error('bucket unavailable'));
    pickPhotosWithAnnotation.mockResolvedValue([{ uri: 'file:///x.jpg' }]);
    const { result } = await mountSettled();

    await act(async () => {
      await result.current.pickPhoto(qPhoto);
    });

    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('inspections.photoUploadFailed'));
    expect(result.current.photoUploadCount).toBe(0);
  });
});

// ── deletePhoto ──────────────────────────────────────────────────────────────

describe('useWizardState — deletePhoto', () => {
  function pressDestructiveButton() {
    const buttons = alertMock.mock.calls.at(-1)?.[2] as { style?: string; onPress?: () => Promise<void> | void }[];
    const del = buttons.find((b) => b.style === 'destructive');
    return del?.onPress?.();
  }

  async function mountWithPhoto() {
    const a1 = makeAnswer({ id: 'a1', question_id: 'q1' });
    const ph = makePhoto({ id: 'ph1', answer_id: 'a1', storage_path: 'i1/q1/x.jpg' });
    loadAnswers.mockResolvedValue([a1]);
    photosByAnswerIds.mockResolvedValue({ a1: [ph] });
    const hook = await mountSettled();
    return { hook, ph };
  }

  it('online: confirms via Alert, removes the row, and drops the photo from state', async () => {
    const { hook, ph } = await mountWithPhoto();

    act(() => {
      void hook.result.current.deletePhoto(ph);
    });
    expect(alertMock).toHaveBeenCalledTimes(1);
    expect(removePhoto).not.toHaveBeenCalled(); // nothing before confirmation

    await act(async () => {
      await pressDestructiveButton();
    });

    expect(removePhoto).toHaveBeenCalledWith('ph1');
    expect(hook.result.current.photos.a1).toEqual([]);
    expect(toastSuccess).toHaveBeenCalledWith('notifications.photoDeleted');
  });

  it('offline: defers the deletion through the queue instead of calling the API', async () => {
    const { hook, ph } = await mountWithPhoto();
    offlineCtx.isOnline = false;

    act(() => {
      void hook.result.current.deletePhoto(ph);
    });
    await act(async () => {
      await pressDestructiveButton();
    });

    expect(offlineCtx.enqueuePhotoDelete).toHaveBeenCalledWith('ph1', 'i1/q1/x.jpg');
    expect(removePhoto).not.toHaveBeenCalled();
    expect(hook.result.current.photos.a1).toEqual([]);
    expect(toastSuccess).toHaveBeenCalledWith('notifications.photoDeletedLocally');
  });
});

// ── saveConclusionAndGo: gating + completion payload ─────────────────────────

describe('useWizardState — saveConclusionAndGo', () => {
  it('blocks completion while a photo upload is in flight (photoUploadCount gate)', async () => {
    let release!: () => void;
    uploadFromUri.mockImplementation(() => new Promise<void>((res) => (release = res)));
    pickPhotosWithAnnotation.mockResolvedValue([{ uri: 'file:///slow.jpg' }]);
    const { result } = await mountSettled();

    let pickPromise!: Promise<void>;
    act(() => {
      pickPromise = result.current.pickPhoto(qPhoto);
    });
    await waitFor(() => expect(result.current.photoUploadCount).toBe(1));

    await act(async () => {
      await result.current.saveConclusionAndGo();
    });
    expect(toastError).toHaveBeenCalledWith('errors.photoSavingPending');
    expect(offlineCtx.enqueueQuestionnaireUpdate).not.toHaveBeenCalled();
    expect(routerReplace).not.toHaveBeenCalled();

    await act(async () => {
      release();
      await pickPromise;
    });
    expect(result.current.photoUploadCount).toBe(0);
  });

  it('gates on missing verdict + conclusion, listing every missing field', async () => {
    const { result } = await mountSettled();

    await act(async () => {
      await result.current.saveConclusionAndGo();
    });

    expect(toastError).toHaveBeenCalledTimes(1);
    const msg = toastError.mock.calls[0][0] as string;
    expect(msg).toContain('errors.missingFields');
    expect(msg).toContain('inspections.missingSafetyStatus');
    expect(msg).toContain('inspections.missingConclusion');
    expect(offlineCtx.enqueueQuestionnaireUpdate).not.toHaveBeenCalled();
    expect(result.current.finishing).toBe(false);
  });

  it('harness templates additionally require a harness name', async () => {
    loadTemplate.mockResolvedValue(makeTemplate({ category: 'harness' }));
    const { result } = await mountSettled();

    act(() => {
      result.current.setSafetyVerdict('safe');
      result.current.setConclusion('ყველაფერი რიგზეა');
    });
    await act(async () => {
      await result.current.saveConclusionAndGo();
    });

    const msg = toastError.mock.calls[0][0] as string;
    expect(msg).toContain('inspections.missingHarnessName');
    expect(msg).not.toContain('inspections.missingConclusion');
    expect(offlineCtx.enqueueQuestionnaireUpdate).not.toHaveBeenCalled();
  });

  it('assembles the full completion payload, flushes, clears local draft state, and navigates to done', async () => {
    const { result } = await mountSettled();

    act(() => {
      result.current.setSafetyVerdict('safe');
      result.current.setConclusion('დასრულებულია');
    });
    // The write-through mirror persisted the draft fields…
    await waitFor(() => expect(storage.get('wizard:i1:conclusion')).toBe('დასრულებულია'));

    await act(async () => {
      await result.current.saveConclusionAndGo();
    });

    expect(offlineCtx.enqueueQuestionnaireUpdate).toHaveBeenCalledWith({
      id: 'i1',
      conclusion_text: 'დასრულებულია',
      safety_verdict: 'safe',
      is_safe_for_use: true,
      harness_name: null, // '' coerces to null
      status: 'completed',
      completed_at: expect.any(String),
    });
    expect(offlineCtx.flush).toHaveBeenCalledTimes(1);
    expect(offlineCtx.clearQuestionnairePatch).toHaveBeenCalledWith('i1');
    expect(recordCompletionMock).toHaveBeenCalledWith('inspections', 'i1', expect.any(String), 'p1:t1');
    expect(invalidateRecordListsMock).toHaveBeenCalledWith(queryClientStub);
    // …and the finish clears every persisted wizard key.
    expect(storage.has('wizard:i1:conclusion')).toBe(false);
    expect(storage.has('wizard:i1:safety')).toBe(false);
    expect(storage.has('wizard:i1:harnessName')).toBe(false);
    expect(storage.has('wizard:i1:step')).toBe(false);
    expect(routerReplace).toHaveBeenCalledWith('/inspections/i1/done');
    expect(result.current.finishing).toBe(true);
  });

  it("a 'caution' verdict completes with is_safe_for_use=false and keeps the harness name", async () => {
    loadTemplate.mockResolvedValue(makeTemplate({ category: 'harness' }));
    const { result } = await mountSettled();

    act(() => {
      result.current.setSafetyVerdict('caution');
      result.current.setConclusion('შენიშვნებით');
      result.current.setHarnessName('H-7');
    });
    await act(async () => {
      await result.current.saveConclusionAndGo();
    });

    expect(offlineCtx.enqueueQuestionnaireUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        safety_verdict: 'caution',
        is_safe_for_use: false,
        harness_name: 'H-7',
        status: 'completed',
      }),
    );
    expect(routerReplace).toHaveBeenCalledWith('/inspections/i1/done');
  });

  it('resets finishing and shows an error toast when the completion enqueue fails', async () => {
    const { result } = await mountSettled();
    offlineCtx.enqueueQuestionnaireUpdate.mockRejectedValueOnce(new Error('db down'));

    act(() => {
      result.current.setSafetyVerdict('unsafe');
      result.current.setConclusion('საშიშია');
    });
    await act(async () => {
      await result.current.saveConclusionAndGo();
    });

    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('inspections.completeError'));
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('db down'));
    expect(result.current.finishing).toBe(false);
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it('the finishing flag guards against a double-tap re-submitting the completion', async () => {
    const { result } = await mountSettled();
    let release!: () => void;
    offlineCtx.enqueueQuestionnaireUpdate.mockImplementation(
      () => new Promise<void>((res) => (release = res)),
    );

    act(() => {
      result.current.setSafetyVerdict('safe');
      result.current.setConclusion('ok');
    });
    act(() => {
      void result.current.saveConclusionAndGo();
    });
    await waitFor(() => expect(result.current.finishing).toBe(true));

    await act(async () => {
      await result.current.saveConclusionAndGo(); // second tap while in flight
    });
    expect(offlineCtx.enqueueQuestionnaireUpdate).toHaveBeenCalledTimes(1);

    await act(async () => {
      release();
    });
    await waitFor(() => expect(routerReplace).toHaveBeenCalledTimes(1));
  });
});

// ── persistence write-through (useWizardPersistence, real) ───────────────────

describe('useWizardState — AsyncStorage write-through', () => {
  it('mirrors step/conclusion/safety/harness edits into AsyncStorage once loading settles', async () => {
    const { result } = await mountSettled();

    act(() => result.current.setStepIndex(1));
    await waitFor(() => expect(storage.get('wizard:i1:step')).toBe('1'));

    act(() => result.current.setConclusion('შუალედური'));
    await waitFor(() => expect(storage.get('wizard:i1:conclusion')).toBe('შუალედური'));

    act(() => result.current.setSafetyVerdict('caution'));
    await waitFor(() => expect(storage.get('wizard:i1:safety')).toBe('caution'));

    // Clearing the verdict removes the key (not "null" as a string).
    act(() => result.current.setSafetyVerdict(null));
    await waitFor(() => expect(storage.has('wizard:i1:safety')).toBe(false));

    act(() => result.current.setHarnessRowCount(9));
    await waitFor(() => expect(storage.get('wizard:i1:harnessCount')).toBe('9'));

    act(() => result.current.setHarnessName('H-1'));
    await waitFor(() => expect(storage.get('wizard:i1:harnessName')).toBe('H-1'));
  });

  it('never clobbers a saved step with the initial 0 while load is still running', async () => {
    storage.set('wizard:i1:step', '2');
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;

    const { result } = await mountSettled();

    expect(result.current.stepIndex).toBe(2);
    const stepWrites = vi
      .mocked(AsyncStorage.setItem)
      .mock.calls.filter(([k]) => k === 'wizard:i1:step')
      .map(([, v]) => v);
    expect(stepWrites).not.toContain('0'); // the loading gate held
    expect(storage.get('wizard:i1:step')).toBe('2');
  });
});

// ── removeInspection ─────────────────────────────────────────────────────────

describe('useWizardState — removeInspection', () => {
  it('removes the inspection, invalidates record lists, navigates back, returns true', async () => {
    const { result } = await mountSettled();

    let ok = false;
    await act(async () => {
      ok = await result.current.removeInspection();
    });

    expect(ok).toBe(true);
    expect(inspectionRemove).toHaveBeenCalledWith('i1');
    expect(invalidateRecordListsMock).toHaveBeenCalledWith(queryClientStub);
    expect(toastSuccess).toHaveBeenCalledWith('notifications.deleted');
    expect(routerBack).toHaveBeenCalledTimes(1);
  });

  it('returns false, resets deleting, and shows an error toast on failure', async () => {
    inspectionRemove.mockRejectedValueOnce(new Error('rls denied'));
    const { result } = await mountSettled();

    let ok = true;
    await act(async () => {
      ok = await result.current.removeInspection();
    });

    expect(ok).toBe(false);
    expect(result.current.deleting).toBe(false);
    expect(toastError).toHaveBeenCalledWith('rls denied');
    expect(routerBack).not.toHaveBeenCalled();
  });
});
