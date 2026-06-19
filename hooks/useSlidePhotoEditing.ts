import { useState } from 'react';
import * as Crypto from 'expo-crypto';
import { useBottomSheet } from '../components/BottomSheet';
import { useToast } from '../lib/toast';
import { friendlyError } from '../lib/errorMap';
import { storageApi } from '../lib/services';
import { STORAGE_BUCKETS } from '../lib/supabase';
import { imageForDisplay } from '../lib/imageUrl';
import { MAX_SLIDE_PHOTOS, slideImagePath } from '../lib/reportSlides';
import { usePhotoPicker } from './usePhotoPicker';
import type { Report, SlideImage } from '../types/models';

/**
 * All photo add/change/re-annotate/remove behaviour for the report slide editor,
 * extracted so the route file stays orchestration-only.
 *
 * Photos are matched by object identity (not positional index) when committing an
 * async upload, so a concurrent remove of a lower-indexed photo can't reindex the
 * array and drop or overwrite the wrong photo. The 2-photo cap
 * ({@link MAX_SLIDE_PHOTOS}) is enforced in `addPhoto`.
 *
 * Returns the in-flight flags the photo strip needs plus the two entry points the
 * editor wires up: `addPhoto` (the add affordance) and `onTapPhoto` (an existing
 * tile → change / annotate / delete sheet).
 */
export function useSlidePhotoEditing(params: {
  report: Report | null;
  slideId: string;
  images: SlideImage[];
  setImages: React.Dispatch<React.SetStateAction<SlideImage[]>>;
}) {
  const { report, slideId, images, setImages } = params;
  const { pickPhotoWithAnnotation, pickPhotoWithAnnotationFromUri } = usePhotoPicker();
  const toast = useToast();
  const showSheet = useBottomSheet();
  const [addingPhoto, setAddingPhoto] = useState(false);
  // Tracked by storage PATH, not index — a concurrent remove can reindex the
  // array, and a Set lets two changes be in flight without one clearing the
  // other's spinner. The path stays stable for the duration of one photo's
  // upload (its `images` entry isn't swapped until the upload resolves).
  const [uploadingPaths, setUploadingPaths] = useState<Set<string>>(new Set());
  const setUploading = (path: string, on: boolean) =>
    setUploadingPaths(prev => {
      const next = new Set(prev);
      if (on) next.add(path);
      else next.delete(path);
      return next;
    });

  const uploadLocalUri = async (localUri: string): Promise<string | null> => {
    if (!report) return null;
    const ext = (localUri.split('.').pop() || 'jpg').split('?')[0];
    const path = `${report.id}/${slideId}/annotated-${Crypto.randomUUID()}.${ext}`;
    try {
      await storageApi.uploadFromUri(STORAGE_BUCKETS.reportPhotos, path, localUri, 'image/jpeg', 'report');
      return path;
    } catch (e) {
      toast.error(friendlyError(e, 'სურათის ატვირთვა ვერ მოხერხდა'));
      return null;
    }
  };

  const addPhoto = async () => {
    if (images.length >= MAX_SLIDE_PHOTOS || addingPhoto) return;
    const result = await pickPhotoWithAnnotation();
    if (!result) return;
    setAddingPhoto(true);
    const newPath = await uploadLocalUri(result.uri);
    if (newPath) {
      setImages(prev => [...prev, { image_path: newPath, annotated_image_path: null }]);
    }
    setAddingPhoto(false);
  };

  const changePhoto = async (target: SlideImage) => {
    const path = slideImagePath(target);
    const result = await pickPhotoWithAnnotation();
    if (!result) return;
    if (path) setUploading(path, true);
    const newPath = await uploadLocalUri(result.uri);
    if (newPath) {
      setImages(prev => prev.map(im => (im === target ? { image_path: newPath, annotated_image_path: null } : im)));
    }
    if (path) setUploading(path, false);
  };

  const reAnnotatePhoto = async (target: SlideImage) => {
    const path = slideImagePath(target);
    if (!path) return;
    setUploading(path, true);
    try {
      const signed = await imageForDisplay(STORAGE_BUCKETS.reportPhotos, path);
      const annotatedUri = await pickPhotoWithAnnotationFromUri(signed);
      if (annotatedUri) {
        const newPath = await uploadLocalUri(annotatedUri);
        if (newPath) {
          setImages(prev =>
            prev.map(im => (im === target ? { image_path: newPath, annotated_image_path: null } : im)),
          );
        }
      }
    } catch (e) {
      toast.error(friendlyError(e, 'ხატვის გახსნა ვერ მოხერხდა'));
    } finally {
      setUploading(path, false);
    }
  };

  const removePhoto = (target: SlideImage) => {
    showSheet(
      {
        title: 'სურათის წაშლა?',
        options: ['დიახ, წაშლა', 'გაუქმება'],
        cancelButtonIndex: 1,
        destructiveButtonIndex: 0,
      },
      idx => {
        if (idx !== 0) return;
        setImages(prev => prev.filter(im => im !== target));
      },
    );
  };

  const onTapPhoto = (index: number) => {
    const target = images[index];
    if (!target) return;
    showSheet(
      {
        title: 'სურათის ცვლილება',
        options: ['შეცვლა', 'ხატვა / რედაქტირება', 'წაშლა', 'გაუქმება'],
        cancelButtonIndex: 3,
        destructiveButtonIndex: 2,
      },
      idx => {
        if (idx === 0) void changePhoto(target);
        else if (idx === 1) void reAnnotatePhoto(target);
        else if (idx === 2) removePhoto(target);
      },
    );
  };

  return {
    addingPhoto,
    uploadingPaths,
    uploading: addingPhoto || uploadingPaths.size > 0,
    addPhoto,
    onTapPhoto,
  };
}
