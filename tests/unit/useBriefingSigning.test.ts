/**
 * Unit tests for `useBriefingSigning` — the 3-phase briefing signing state
 * machine (worker → interstitial → inspector). All I/O is mocked: briefings/
 * projects APIs, the router, react-query, the completion recorder, the offline
 * write outbox (routed straight to briefingsApi.update, i.e. exactly its online
 * path), and RN Alert (whose button callbacks we invoke manually to drive the
 * skip flow).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ── Mocks ────────────────────────────────────────────────────────────────────
const alertMock = vi.fn();
vi.mock('react-native', () => ({ Alert: { alert: (...a: unknown[]) => alertMock(...a) } }));

const getById = vi.fn();
const update = vi.fn();
vi.mock('../../lib/briefingsApi', () => ({ briefingsApi: { getById: (...a: unknown[]) => getById(...a), update: (...a: unknown[]) => update(...a) } }));

const projectGetById = vi.fn(async (..._a: unknown[]) => ({ id: 'p1', name: 'Project One' }));
vi.mock('../../lib/services', () => ({ projectsApi: { getById: (...a: unknown[]) => projectGetById(...a) } }));

const recordCompletion = vi.fn(async (..._a: unknown[]) => {});
vi.mock('../../lib/calendarSchedule', () => ({ recordCompletion: (...a: unknown[]) => recordCompletion(...a) }));

const invalidateRecordLists = vi.fn();
vi.mock('../../lib/apiHooks', () => ({
  qk: {
    briefings: { byId: (id: string) => ['briefings', 'byId', id] },
    projects: { byId: (id: string) => ['projects', 'byId', id] },
    calendar: { schedules: ['calendar', 'schedules'], allBriefings: ['calendar', 'allBriefings'] },
  },
  invalidateRecordLists: (...a: unknown[]) => invalidateRecordLists(...a),
}));

// cachedRead is a cache-first wrapper around the fetcher; the passthrough keeps
// the load path exercising briefingsApi.getById / projectsApi.getById directly.
vi.mock('../../lib/cachedRead', () => ({
  cachedRead: (_key: unknown, fn: () => unknown) => fn(),
}));

// The hook persists every signing write through the outbox. Online, the outbox
// is documented as "exactly the old briefingsApi.update" — so route it there,
// keeping this file's update-payload assertions meaningful. (Mocking the barrel
// also keeps the real outbox graph — netinfo/expo-crypto native deps vitest
// can't parse — out of the module graph.)
vi.mock('../../lib/outbox', () => ({
  saveRecordThroughOutbox: async (args: { recordId: string; payload: Record<string, unknown> }) => ({
    queued: false,
    record: await update(args.recordId, args.payload),
  }),
}));

const routerBack = vi.fn();
const routerReplace = vi.fn();
vi.mock('expo-router', () => ({ useRouter: () => ({ back: routerBack, replace: routerReplace }) }));

const invalidateQueries = vi.fn();
const queryClientStub = { invalidateQueries };
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => queryClientStub }));

import { useBriefingSigning } from '../../components/briefings/useBriefingSigning';

// ── Fixtures ─────────────────────────────────────────────────────────────────
type P = { name: string; signature?: string; skipped?: boolean };

function makeBriefing(participants: P[], extra: Record<string, unknown> = {}) {
  return {
    id: 'b1',
    projectId: 'p1',
    participants,
    dateTime: '2026-06-18T10:00:00Z',
    inspectorSignature: undefined,
    status: 'draft',
    ...extra,
  };
}

async function mountFor(briefing: ReturnType<typeof makeBriefing>) {
  getById.mockResolvedValue(briefing);
  update.mockImplementation(async (_id: string, patch: Record<string, unknown>) => ({ ...briefing, ...patch }));
  const hook = renderHook(() => useBriefingSigning('b1'));
  await waitFor(() => expect(hook.result.current.briefing).not.toBeNull());
  return hook;
}

beforeEach(() => {
  vi.clearAllMocks();
  projectGetById.mockResolvedValue({ id: 'p1', name: 'Project One' });
  recordCompletion.mockResolvedValue(undefined);
});

// ── Loading + initial position ───────────────────────────────────────────────
describe('useBriefingSigning - load', () => {
  it('starts in loading phase before the briefing resolves', () => {
    getById.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useBriefingSigning('b1'));
    expect(result.current.phase).toBe('loading');
    expect(result.current.briefing).toBeNull();
  });

  it('does nothing without an id', () => {
    renderHook(() => useBriefingSigning(undefined));
    expect(getById).not.toHaveBeenCalled();
  });

  it('points currentIdx at the first pending participant', async () => {
    const { result } = await mountFor(
      makeBriefing([{ name: 'A', signature: 'x' }, { name: 'B' }, { name: 'C' }]),
    );
    expect(result.current.currentIdx).toBe(1);
    expect(result.current.workerName).toBe('B');
    expect(result.current.phase).toBe('worker');
    expect(result.current.totalWorkers).toBe(3);
  });

  it('routes back when the briefing is missing', async () => {
    getById.mockResolvedValue(null);
    renderHook(() => useBriefingSigning('b1'));
    await waitFor(() => expect(routerBack).toHaveBeenCalled());
  });

  it('shows an error alert when the load fails', async () => {
    getById.mockRejectedValue(new Error('boom'));
    renderHook(() => useBriefingSigning('b1'));
    await waitFor(() => expect(alertMock).toHaveBeenCalled());
    expect(String(alertMock.mock.calls[0][1])).toContain('boom');
  });

  it('loads the project name for the header', async () => {
    const { result } = await mountFor(makeBriefing([{ name: 'A' }]));
    await waitFor(() => expect(result.current.project?.name).toBe('Project One'));
  });
});

// ── Phase transitions ────────────────────────────────────────────────────────
describe('useBriefingSigning - phases', () => {
  it('is inspector phase once every worker is handled and none are skipped', async () => {
    const { result } = await mountFor(
      makeBriefing([{ name: 'A', signature: 'x' }, { name: 'B', signature: 'y' }]),
    );
    expect(result.current.currentIdx).toBe(2);
    expect(result.current.phase).toBe('inspector');
    expect(result.current.activeChipIndex).toBe(2);
  });

  it('is interstitial phase when skipped workers remain unreviewed', async () => {
    const { result } = await mountFor(
      makeBriefing([{ name: 'A', signature: 'x' }, { name: 'B', skipped: true }]),
    );
    expect(result.current.phase).toBe('interstitial');
    expect(result.current.skippedCount).toBe(1);
    expect(result.current.activeChipIndex).toBe(-1);
  });

  it('continueFromInterstitial advances to the inspector phase', async () => {
    const { result } = await mountFor(
      makeBriefing([{ name: 'A', signature: 'x' }, { name: 'B', skipped: true }]),
    );
    act(() => result.current.continueFromInterstitial());
    expect(result.current.phase).toBe('inspector');
  });
});

// ── signerChips state mapping (statusOf + chipStateOf) ────────────────────────
describe('useBriefingSigning - signerChips', () => {
  it('maps signed/current/skipped/pending to done/active/skipped/pending + trailing inspector chip', async () => {
    const { result } = await mountFor(
      makeBriefing([{ name: 'A' }, { name: 'B', skipped: true }, { name: 'C', signature: 'z' }]),
    );
    // firstPending = 0 → currentIdx 0, so A is the active signer.
    const chips = result.current.signerChips;
    expect(chips.map((c) => c.state)).toEqual(['active', 'skipped', 'done', 'pending']);
    // i18n is unmocked here, so `t(key)` returns the key verbatim.
    expect(chips[3].label).toBe('briefings.inspectorChipLabel');
  });

  it('marks the inspector chip done when the inspector has signed', async () => {
    const { result } = await mountFor(
      makeBriefing([{ name: 'A', signature: 'x' }], { inspectorSignature: 'sig' }),
    );
    expect(result.current.signerChips.at(-1)?.state).toBe('done');
  });
});

// ── handleOK ─────────────────────────────────────────────────────────────────
describe('useBriefingSigning - handleOK', () => {
  it('worker branch persists the stripped signature and advances to the next pending', async () => {
    const { result } = await mountFor(makeBriefing([{ name: 'A' }, { name: 'B' }]));
    await act(async () => {
      await result.current.handleOK('data:image/png;base64,SIGDATA');
    });
    expect(update).toHaveBeenCalledWith('b1', {
      participants: [
        { name: 'A', signature: 'SIGDATA', skipped: false },
        { name: 'B' },
      ],
    });
    expect(result.current.currentIdx).toBe(1);
  });

  it('inspector branch completes the briefing, records completion, invalidates record lists, routes to done', async () => {
    const { result } = await mountFor(
      makeBriefing([{ name: 'A', signature: 'x' }]),
    );
    expect(result.current.phase).toBe('inspector');
    await act(async () => {
      await result.current.handleOK('data:image/png;base64,INSPECTORSIG');
    });
    expect(update).toHaveBeenCalledWith('b1', { inspectorSignature: 'INSPECTORSIG', status: 'completed' });
    expect(recordCompletion).toHaveBeenCalledWith('briefings', 'b1', '2026-06-18T10:00:00Z', 'p1');
    // Calendar/record refresh is now delegated to invalidateRecordLists(qc)
    // (which covers the calendar namespaces) instead of two direct
    // queryClient.invalidateQueries calls.
    expect(invalidateRecordLists).toHaveBeenCalledTimes(1);
    expect(invalidateRecordLists).toHaveBeenCalledWith(queryClientStub);
    expect(routerReplace).toHaveBeenCalledWith('/briefings/b1/done');
  });

  it('surfaces a save error via alert', async () => {
    const { result } = await mountFor(makeBriefing([{ name: 'A' }, { name: 'B' }]));
    update.mockRejectedValueOnce(new Error('save failed'));
    await act(async () => {
      await result.current.handleOK('data:image/png;base64,SIG');
    });
    expect(String(alertMock.mock.calls.at(-1)?.[1])).toContain('save failed');
  });
});

// ── handleSkip ───────────────────────────────────────────────────────────────
describe('useBriefingSigning - handleSkip', () => {
  function pressSkipButton() {
    const buttons = alertMock.mock.calls.at(-1)?.[2] as { text: string; onPress?: () => void }[];
    // i18n is unmocked, so the confirm button's text is the raw key, not Georgian.
    const skip = buttons.find((b) => b.text === 'briefings.skipAction');
    return skip?.onPress?.();
  }

  it('confirms, persists skipped=true, and advances', async () => {
    const { result } = await mountFor(makeBriefing([{ name: 'A' }, { name: 'B' }]));
    act(() => result.current.handleSkip());
    expect(alertMock).toHaveBeenCalled();
    await act(async () => {
      await pressSkipButton();
    });
    expect(update).toHaveBeenCalledWith('b1', {
      participants: [{ name: 'A', skipped: true }, { name: 'B' }],
    });
    expect(result.current.currentIdx).toBe(1);
  });
});

// ── Navigation: back, chip select, jump ──────────────────────────────────────
describe('useBriefingSigning - navigation', () => {
  it('handleBack steps to the previous signer; backDisabled at index 0', async () => {
    const { result } = await mountFor(makeBriefing([{ name: 'A' }, { name: 'B' }]));
    // Advance to B first.
    await act(async () => {
      await result.current.handleOK('data:image/png;base64,SIG');
    });
    expect(result.current.currentIdx).toBe(1);
    expect(result.current.backDisabled).toBe(false);

    act(() => result.current.handleBack());
    expect(result.current.currentIdx).toBe(0);
    expect(result.current.backDisabled).toBe(true);
  });

  it('selecting the inspector chip jumps past the workers when all are handled', async () => {
    const { result } = await mountFor(
      makeBriefing([{ name: 'A', signature: 'x' }, { name: 'B', signature: 'y' }]),
    );
    act(() => result.current.handleChipSelect(2)); // inspector chip index = participants.length
    expect(result.current.currentIdx).toBe(2);
    expect(result.current.phase).toBe('inspector');
  });

  it('selecting a worker chip restores a skipped signer and makes them active', async () => {
    const { result } = await mountFor(
      makeBriefing([{ name: 'A', signature: 'x' }, { name: 'B', skipped: true }]),
    );
    await act(async () => {
      result.current.handleChipSelect(1);
    });
    await waitFor(() => expect(result.current.currentIdx).toBe(1));
    // jumpTo restores skipped=false via update.
    expect(update).toHaveBeenCalledWith('b1', {
      participants: [{ name: 'A', signature: 'x' }, { name: 'B', skipped: false }],
    });
  });

  it('goToFirstSkipped jumps to the first skipped participant', async () => {
    const { result } = await mountFor(
      makeBriefing([{ name: 'A', signature: 'x' }, { name: 'B', skipped: true }, { name: 'C', skipped: true }]),
    );
    await act(async () => {
      result.current.goToFirstSkipped();
    });
    await waitFor(() => expect(result.current.currentIdx).toBe(1));
  });
});

// ── Stroke + canvas helpers ──────────────────────────────────────────────────
describe('useBriefingSigning - stroke helpers', () => {
  it('onStroke flips hasStroke; handleClear resets it', async () => {
    const { result } = await mountFor(makeBriefing([{ name: 'A' }]));
    act(() => result.current.onStroke());
    expect(result.current.hasStroke).toBe(true);
    act(() => result.current.handleClear());
    expect(result.current.hasStroke).toBe(false);
  });

  it('onCancel routes back', async () => {
    const { result } = await mountFor(makeBriefing([{ name: 'A' }]));
    act(() => result.current.onCancel());
    expect(routerBack).toHaveBeenCalled();
  });

  it('handleConfirm is a no-op without a stroke', async () => {
    const { result } = await mountFor(makeBriefing([{ name: 'A' }]));
    expect(() => act(() => result.current.handleConfirm())).not.toThrow();
  });
});
