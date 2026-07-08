/**
 * Shared photo add/delete handler quartet for the typed equipment wizards.
 * Eight routes (bobcat, excavator, forklift, cargo-platform, general-equipment,
 * lifting-accessories, mobile-ladder, safety-net) repeated the same ~80 lines:
 * pick photos → upload each → append the returned storage path to the item's
 * `photo_paths` (or the summary strip) → autosave; plus the mirror-image
 * delete. The route supplies only the type-specific upload call and item-array
 * updater. Preserved difference: bobcat + excavator keep their summary strip
 * in AsyncStorage (no DB column) — pass `summaryStorageKey` for that.
 * Side effects: storage upload/delete via the per-type service (offline both
 * stage + queue through the outbox — see lib/inspection/service.ts
 * uploadPhotoAt/deletePhoto; a queued add shows the same "photo saved locally"
 * toast as the generic wizard), screen state mutation, and the debounced
 * autosave persisting photo_paths.
 */
import { useCallback } from 'react';
import type React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onlineManager } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '../toast';
import { friendlyError } from '../errorMap';

/** Minimum inspection shape the hook needs. */
interface WithSummaryPhotos { id: string; summaryPhotos?: string[] | null }

export interface EquipmentPhotosConfig<T extends WithSummaryPhotos, K> {
  inspectionRef: React.MutableRefObject<T | null>;
  setInspection: React.Dispatch<React.SetStateAction<T | null>>;
  /** Debounced autosave from useInspectionFlow — persists photo_path changes. */
  scheduleSave: (insp: T) => void;
  /**
   * The photo picker (`usePhotoPicker().pickPhotosWithAnnotation`). Injected by
   * the route because lib/ modules don't import from hooks/.
   */
  pickPhotos: () => Promise<Array<{ uri: string }>>;
  /** Upload one item photo; resolves with its storage path. */
  uploadItemPhoto: (inspectionId: string, key: K, uri: string) => Promise<string>;
  /** Upload one summary photo. Omit when the type has no summary strip. */
  uploadSummaryPhoto?: (inspectionId: string, uri: string) => Promise<string>;
  /** Remove a photo object (item or summary) from storage. */
  deletePhoto: (path: string) => Promise<void>;
  /** Copy of `insp` with the keyed item's photo_paths mapped through `update`. */
  updateItemPaths: (insp: T, key: K, update: (paths: string[]) => string[]) => T;
  /**
   * When set (bobcat/excavator), the summaryPhotos list persists to this
   * AsyncStorage key instead of the autosave patch.
   */
  summaryStorageKey?: string;
}

export interface EquipmentPhotosResult<K> {
  handleAddItemPhoto: (key: K) => Promise<void>;
  handleDeleteItemPhoto: (key: K, path: string) => Promise<void>;
  handleAddSummaryPhoto: () => Promise<void>;
  handleDeleteSummaryPhoto: (path: string) => Promise<void>;
}

export function useEquipmentPhotos<T extends WithSummaryPhotos, K>(
  cfg: EquipmentPhotosConfig<T, K>,
): EquipmentPhotosResult<K> {
  const { t } = useTranslation();
  const toast = useToast();
  const {
    inspectionRef, setInspection, scheduleSave, pickPhotos,
    uploadItemPhoto, uploadSummaryPhoto, deletePhoto, updateItemPaths,
    summaryStorageKey,
  } = cfg;

  const persistSummary = useCallback((next: T) => {
    if (summaryStorageKey) {
      AsyncStorage.setItem(summaryStorageKey, JSON.stringify(next.summaryPhotos ?? [])).catch(() => {});
    } else {
      scheduleSave(next);
    }
  }, [summaryStorageKey, scheduleSave]);

  /** Pick → upload each → apply to state. Shared by item + summary adds. */
  const addPhotos = useCallback(async (
    upload: (inspectionId: string, uri: string) => Promise<string>,
    apply: (prev: T, path: string) => T,
  ) => {
    const results = await pickPhotos();
    if (results.length === 0) return;
    const insp = inspectionRef.current;
    if (!insp) return;
    const offline = !onlineManager.isOnline();
    let staged = 0;
    for (const result of results) {
      try {
        const path = await upload(insp.id, result.uri);
        staged++;
        setInspection(prev => (prev ? apply(prev, path) : prev));
      } catch (e) {
        toast.error(friendlyError(e, t('errors.uploadFailed')));
      }
    }
    // Offline adds queued through the outbox — same feedback as the generic
    // wizard's offline photo staging (features/inspection-wizard).
    if (offline && staged > 0) toast.success(t('notifications.photoSavedLocally'));
  }, [pickPhotos, toast, t, inspectionRef, setInspection]);

  const deleteByPath = useCallback(async (path: string, apply: (prev: T) => T) => {
    try {
      await deletePhoto(path);
    } catch (e) {
      toast.error(friendlyError(e, t('errors.deleteFailed')));
      return;
    }
    setInspection(prev => (prev ? apply(prev) : prev));
  }, [deletePhoto, toast, t, setInspection]);

  const handleAddItemPhoto = useCallback((key: K) =>
    addPhotos(
      (inspectionId, uri) => uploadItemPhoto(inspectionId, key, uri),
      (prev, path) => {
        const next = updateItemPaths(prev, key, paths => [...paths, path]);
        scheduleSave(next);
        return next;
      },
    ), [addPhotos, uploadItemPhoto, updateItemPaths, scheduleSave]);

  const handleDeleteItemPhoto = useCallback((key: K, path: string) =>
    deleteByPath(path, prev => {
      const next = updateItemPaths(prev, key, paths => paths.filter(p => p !== path));
      scheduleSave(next);
      return next;
    }), [deleteByPath, updateItemPaths, scheduleSave]);

  const handleAddSummaryPhoto = useCallback(async () => {
    if (!uploadSummaryPhoto) return;
    await addPhotos(uploadSummaryPhoto, (prev, path) => {
      const next = { ...prev, summaryPhotos: [...(prev.summaryPhotos ?? []), path] };
      persistSummary(next);
      return next;
    });
  }, [addPhotos, uploadSummaryPhoto, persistSummary]);

  const handleDeleteSummaryPhoto = useCallback((path: string) =>
    deleteByPath(path, prev => {
      const next = { ...prev, summaryPhotos: (prev.summaryPhotos ?? []).filter(p => p !== path) };
      persistSummary(next);
      return next;
    }), [deleteByPath, persistSummary]);

  return { handleAddItemPhoto, handleDeleteItemPhoto, handleAddSummaryPhoto, handleDeleteSummaryPhoto };
}
