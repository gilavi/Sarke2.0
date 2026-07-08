/**
 * Unit tests for the shared equipment photo quartet
 * (lib/inspection/useEquipmentPhotos.ts): add appends the uploaded path via
 * the route's item updater + autosaves, delete removes it, a failed upload
 * toasts but keeps processing the batch, offline adds surface the same
 * "photo saved locally" toast as the generic wizard, and the bobcat/excavator
 * summary strip persists to AsyncStorage instead of the autosave patch.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const setItem = vi.fn(async (_k: string, _v: string) => undefined);
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async () => null),
    setItem: (k: string, v: string) => setItem(k, v),
  },
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('../../lib/toast', () => ({
  useToast: () => ({ success: toastSuccess, error: toastError, info: vi.fn() }),
}));
vi.mock('../../lib/errorMap', () => ({
  friendlyError: (_e: unknown, fallback: string) => fallback,
}));

import { onlineManager } from '@tanstack/react-query';
import { useEquipmentPhotos } from '../../lib/inspection/useEquipmentPhotos';

interface Item { id: number; photo_paths: string[] }
interface Insp { id: string; items: Item[]; summaryPhotos?: string[] | null }

function harness(over: Partial<Parameters<typeof useEquipmentPhotos<Insp, number>>[0]> = {}) {
  let insp: Insp | null = { id: 'i1', items: [{ id: 1, photo_paths: [] }, { id: 2, photo_paths: [] }], summaryPhotos: [] };
  const inspectionRef: { current: Insp | null } = { current: insp };
  const setInspection = vi.fn((updater: Insp | null | ((prev: Insp | null) => Insp | null)) => {
    insp = typeof updater === 'function' ? updater(insp) : updater;
    inspectionRef.current = insp;
  });
  const scheduleSave = vi.fn();
  const uploadItemPhoto = vi.fn(async (id: string, key: number, _uri: string) => `p/${id}/${key}/x.jpg`);
  const uploadSummaryPhoto = vi.fn(async (id: string, _uri: string) => `p/${id}/summary/x.jpg`);
  const deletePhoto = vi.fn(async (_path: string) => undefined);
  const pickPhotos = vi.fn(async () => [{ uri: 'file:///a.jpg' }]);
  const cfg = {
    inspectionRef,
    setInspection,
    scheduleSave,
    pickPhotos,
    uploadItemPhoto,
    uploadSummaryPhoto,
    deletePhoto,
    updateItemPaths: (prev: Insp, key: number, update: (p: string[]) => string[]) => ({
      ...prev,
      items: prev.items.map(i => (i.id === key ? { ...i, photo_paths: update(i.photo_paths) } : i)),
    }),
    ...over,
  };
  const rendered = renderHook(() => useEquipmentPhotos<Insp, number>(cfg));
  return { ...rendered, cfg, current: () => inspectionRef.current };
}

beforeEach(() => {
  vi.clearAllMocks();
  onlineManager.setOnline(true);
});

afterEach(() => {
  onlineManager.setOnline(true);
});

describe('item photos', () => {
  it('uploads each picked photo, appends its path to the keyed item, and autosaves', async () => {
    const h = harness({ pickPhotos: vi.fn(async () => [{ uri: 'file:///a.jpg' }, { uri: 'file:///b.jpg' }]) });
    await act(() => h.result.current.handleAddItemPhoto(2));
    expect(h.cfg.uploadItemPhoto).toHaveBeenCalledTimes(2);
    expect(h.current()!.items[1].photo_paths).toEqual(['p/i1/2/x.jpg', 'p/i1/2/x.jpg']);
    expect(h.current()!.items[0].photo_paths).toEqual([]);
    expect(h.cfg.scheduleSave).toHaveBeenCalledTimes(2);
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('a failed upload toasts but the rest of the batch still lands', async () => {
    const upload = vi.fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('p/i1/1/ok.jpg');
    const h = harness({
      pickPhotos: vi.fn(async () => [{ uri: 'file:///a.jpg' }, { uri: 'file:///b.jpg' }]),
      uploadItemPhoto: upload,
    });
    await act(() => h.result.current.handleAddItemPhoto(1));
    expect(toastError).toHaveBeenCalledWith('errors.uploadFailed');
    expect(h.current()!.items[0].photo_paths).toEqual(['p/i1/1/ok.jpg']);
  });

  it('offline adds toast the generic wizard\'s "photo saved locally" once per batch', async () => {
    onlineManager.setOnline(false);
    const h = harness({ pickPhotos: vi.fn(async () => [{ uri: 'file:///a.jpg' }, { uri: 'file:///b.jpg' }]) });
    await act(() => h.result.current.handleAddItemPhoto(1));
    expect(toastSuccess).toHaveBeenCalledTimes(1);
    expect(toastSuccess).toHaveBeenCalledWith('notifications.photoSavedLocally');
  });

  it('delete removes the path and autosaves; a failed delete leaves state untouched', async () => {
    const h = harness();
    await act(() => h.result.current.handleAddItemPhoto(1));
    expect(h.current()!.items[0].photo_paths).toHaveLength(1);
    await act(() => h.result.current.handleDeleteItemPhoto(1, 'p/i1/1/x.jpg'));
    expect(h.current()!.items[0].photo_paths).toEqual([]);

    (h.cfg.deletePhoto as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('boom'));
    await act(() => h.result.current.handleAddItemPhoto(1));
    await act(() => h.result.current.handleDeleteItemPhoto(1, 'p/i1/1/x.jpg'));
    expect(toastError).toHaveBeenCalledWith('errors.deleteFailed');
    expect(h.current()!.items[0].photo_paths).toHaveLength(1);
  });
});

describe('summary photos', () => {
  it('appends + autosaves through the patch by default', async () => {
    const h = harness();
    await act(() => h.result.current.handleAddSummaryPhoto());
    expect(h.current()!.summaryPhotos).toEqual(['p/i1/summary/x.jpg']);
    expect(h.cfg.scheduleSave).toHaveBeenCalledTimes(1);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('persists to AsyncStorage instead when summaryStorageKey is set (bobcat/excavator)', async () => {
    const h = harness({ summaryStorageKey: 'bobcat-wizard:i1:summaryPhotos' });
    await act(() => h.result.current.handleAddSummaryPhoto());
    expect(h.current()!.summaryPhotos).toEqual(['p/i1/summary/x.jpg']);
    expect(h.cfg.scheduleSave).not.toHaveBeenCalled();
    expect(setItem).toHaveBeenCalledWith(
      'bobcat-wizard:i1:summaryPhotos',
      JSON.stringify(['p/i1/summary/x.jpg']),
    );

    await act(() => h.result.current.handleDeleteSummaryPhoto('p/i1/summary/x.jpg'));
    expect(h.current()!.summaryPhotos).toEqual([]);
    expect(setItem).toHaveBeenLastCalledWith('bobcat-wizard:i1:summaryPhotos', '[]');
    expect(h.cfg.scheduleSave).not.toHaveBeenCalled();
  });

  it('is a no-op when the type has no summary strip', async () => {
    const h = harness({ uploadSummaryPhoto: undefined });
    await act(() => h.result.current.handleAddSummaryPhoto());
    expect(h.cfg.pickPhotos).not.toHaveBeenCalled();
  });
});
