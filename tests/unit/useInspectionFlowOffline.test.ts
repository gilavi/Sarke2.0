/**
 * Unit tests for useInspectionFlow's offline branches
 * (lib/inspection/useInspectionFlow.ts): completing an equipment act offline
 * proceeds (writes queue in the service layer) and toasts "saved offline"
 * instead of "completed"; online completion keeps the success toast; and the
 * debounced autosave seeds the equipment detail cache so a re-entered offline
 * wizard serves the queued edits via cachedRead.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const store = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (k: string) => store.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
    removeItem: vi.fn(async (k: string) => {
      store.delete(k);
    }),
  },
}));
vi.mock('expo-router', () => ({ useRouter: () => ({ back: vi.fn(), push: vi.fn() }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('../../lib/toast', () => ({
  useToast: () => ({ success: toastSuccess, error: toastError, info: vi.fn() }),
}));
vi.mock('../../lib/session', () => ({
  useSession: () => ({
    state: {
      status: 'signedIn',
      user: { first_name: 'ლუკა', last_name: 'ქიმი' },
      session: { user: { id: 'u1' } },
    },
  }),
}));
vi.mock('../../lib/usePdfUsage', () => ({
  usePdfUsage: () => ({ data: { isLocked: false } }),
  useInvalidatePdfUsage: () => vi.fn(),
}));
vi.mock('../../lib/services', () => ({ projectsApi: { getById: vi.fn(async () => null) } }));
const recordCompletionMock = vi.fn(async (..._a: unknown[]) => undefined);
vi.mock('../../lib/calendarSchedule', () => ({
  recordCompletion: (...a: unknown[]) => recordCompletionMock(...a),
}));
vi.mock('../../lib/queryClient', async () => {
  const { QueryClient } = await import('@tanstack/react-query');
  return { queryClient: new QueryClient() };
});
vi.mock('../../lib/apiHooks', () => ({
  invalidateRecordLists: vi.fn(),
  qk: {
    equipmentInspection: {
      byId: (type: string, id: string) => ['equipmentInspection', 'detail', type, id] as const,
    },
    projects: { byId: (id: string) => ['projects', 'detail', id] as const },
  },
}));
vi.mock('../../lib/cachedRead', () => ({
  cachedRead: vi.fn(async (_key: readonly unknown[], fn: () => Promise<unknown>) => fn()),
}));
vi.mock('../../lib/documents/reopen', () => ({ reopenDocument: vi.fn(async () => undefined) }));
vi.mock('../../lib/errorMap', () => ({ friendlyError: (_e: unknown, f: string) => f }));
vi.mock('../../lib/haptics', () => ({
  haptic: { inspectionComplete: vi.fn(), medium: vi.fn() },
}));
vi.mock('../../lib/pdfOpen', () => ({
  generateAndSharePdf: vi.fn(async () => undefined),
  PdfLimitReachedError: class PdfLimitReachedError extends Error {},
}));
vi.mock('../../lib/pdfName', () => ({ generatePdfName: () => 'x.pdf' }));
vi.mock('../../lib/inspection/renderMobile', () => ({
  renderInspectionPdf: vi.fn(async () => '<html/>'),
}));

import { onlineManager } from '@tanstack/react-query';
import { queryClient } from '../../lib/queryClient';
import { useInspectionFlow } from '../../lib/inspection/useInspectionFlow';

interface TestInsp {
  id: string;
  projectId: string;
  status: string;
  inspectionDate: string;
  inspectorName?: string | null;
  notes?: string | null;
}

const baseInsp: TestInsp = {
  id: 'i1',
  projectId: 'p1',
  status: 'draft',
  inspectionDate: '2026-07-08',
  inspectorName: 'x',
};

function makeApi() {
  return {
    getById: vi.fn(async () => ({ ...baseInsp })),
    patch: vi.fn(async () => undefined),
    complete: vi.fn(async () => undefined),
  };
}

function renderFlow(api = makeApi()) {
  const rendered = renderHook(() =>
    useInspectionFlow<TestInsp>({
      id: 'i1',
      firstStep: 1,
      lastStep: 3,
      persistPrefix: 'test-wizard',
      templateId: 't1',
      schema: { category: 'bobcat' } as never,
      api,
      toPatch: (insp) => ({ notes: insp.notes ?? null }),
      validateMissing: () => [],
      autofill: (insp) => ({ next: insp, patch: null }),
      pdf: { nameLabel: 'Test', title: 'Test', subject: 'Test' },
      loadingTitle: 'Test',
    }),
  );
  return { ...rendered, api };
}

beforeEach(() => {
  vi.clearAllMocks();
  store.clear();
  queryClient.clear();
  onlineManager.setOnline(true);
});

afterEach(() => {
  onlineManager.setOnline(true);
});

describe('complete()', () => {
  it('offline: proceeds (queued writes) and toasts savedOffline instead of completeSuccess', async () => {
    const { result, api } = renderFlow();
    await waitFor(() => expect(result.current.loading).toBe(false));

    onlineManager.setOnline(false);
    let ok = false;
    await act(async () => {
      ok = await result.current.complete();
    });

    expect(ok).toBe(true);
    expect(api.patch).toHaveBeenCalledWith('i1', { notes: null });
    expect(api.complete).toHaveBeenCalledWith('i1');
    expect(toastSuccess).toHaveBeenCalledWith('components.savedOffline');
    expect(result.current.inspection?.status).toBe('completed');
    // Detail cache seeded with the completed model — an offline re-open of
    // this act (cachedRead on the same key) sees it as completed.
    const cached = queryClient.getQueryData<TestInsp>(['equipmentInspection', 'detail', 'bobcat', 'i1']);
    expect(cached?.status).toBe('completed');
    expect(recordCompletionMock).toHaveBeenCalled();
  });

  it('online: keeps the completeSuccess toast', async () => {
    const { result } = renderFlow();
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.complete();
    });
    expect(toastSuccess).toHaveBeenCalledWith('inspections.completeSuccess');
  });

  it('still fails (with a toast) on a non-network error', async () => {
    const api = makeApi();
    api.complete.mockRejectedValueOnce(new Error('row-level security'));
    const { result } = renderFlow(api);
    await waitFor(() => expect(result.current.loading).toBe(false));
    let ok = true;
    await act(async () => {
      ok = await result.current.complete();
    });
    expect(ok).toBe(false);
    expect(toastError).toHaveBeenCalled();
    expect(result.current.inspection?.status).toBe('draft');
  });
});

describe('scheduleSave', () => {
  it('seeds the equipment detail cache alongside the debounced patch', async () => {
    const { result, api } = renderFlow();
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.update('notes', 'offline edit');
    });
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('i1', { notes: 'offline edit' }), {
      timeout: 2000,
    });
    const cached = queryClient.getQueryData<TestInsp>(['equipmentInspection', 'detail', 'bobcat', 'i1']);
    expect(cached?.notes).toBe('offline edit');
  });
});
