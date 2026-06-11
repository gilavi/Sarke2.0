import { useCallback, useEffect, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
  cancelPhotoAnnotate,
  cancelPhotoPicker,
  getLastPhotoFromCapture,
  setPhotoAnnotateCallback,
  setPhotoPickerCallback,
} from '../lib/photoPickerBus';

export interface PickedPhoto {
  uri: string;
  timestamp: Date;
}

/**
 * Hook for all photo-pick flows. (Formerly `usePhotoWithLocation` — photo
 * geotagging was dropped in 2026-06 with the location permission; payloads
 * that still carry latitude/longitude/address columns now always receive null.)
 *
 * - `pickPhotoWithAnnotation` — the canonical SINGLE-photo entry point.
 *   Opens /photo-picker (live camera + gallery), then /photo-annotate.
 *   The annotation step is always presented; the user may save without drawing.
 *   Pass `skipAnnotate: true` for contexts where markup is not useful (incidents,
 *   certificates, qualifications). Returns one photo (or null).
 *
 * - `pickPhotosWithAnnotation` — the MULTI-photo entry point (galleries: inspection
 *   item/summary photos, answer photos, incident photos, project files). Opens
 *   /photo-picker in batch mode. A single live capture still annotates and returns
 *   one photo; a recent-strip / system-library batch skips annotation and returns
 *   all selected photos (sharing one timestamp). Returns `[]` if cancelled.
 *   Callers should upload sequentially (or with a small concurrency cap) — never an
 *   unbounded Promise.all over many full-res photos.
 *
 * - `pickPhotoWithAnnotationFromUri` — re-annotate an existing stored photo.
 *   Opens /photo-annotate directly. Returns the annotated URI, or null if cancelled.
 *
 * - `takePhoto`, `pickPhoto`, `pickMultiplePhotos` — kept for callers that need
 *   direct ImagePicker access (only app/photo-picker.tsx and this hook may use
 *   ImagePicker directly; all other screens must call pickPhotoWithAnnotation).
 */
export function usePhotoPicker() {
  const router = useRouter();
  const pickerTokenRef = useRef<number | null>(null);
  const annotateTokenRef = useRef<number | null>(null);

  // Cancel any stale tokens when the component unmounts.
  useEffect(() => {
    return () => {
      if (pickerTokenRef.current !== null) cancelPhotoPicker(pickerTokenRef.current);
      if (annotateTokenRef.current !== null) cancelPhotoAnnotate(annotateTokenRef.current);
    };
  }, []);

  const pickPhotoWithAnnotation = useCallback(
    (opts: { skipAnnotate?: boolean } = {}): Promise<PickedPhoto | null> => {
      return new Promise((resolve) => {
        if (pickerTokenRef.current !== null) cancelPhotoPicker(pickerTokenRef.current);
        if (annotateTokenRef.current !== null) cancelPhotoAnnotate(annotateTokenRef.current);

        pickerTokenRef.current = setPhotoPickerCallback((uris) => {
          pickerTokenRef.current = null;
          // Single-photo entry: the bus now delivers an array, but this flow only
          // ever opens the picker in single mode, so take the first (if any).
          const uri = uris && uris.length > 0 ? uris[0] : null;
          if (!uri) { resolve(null); return; }

          if (opts.skipAnnotate) {
            resolve({ uri, timestamp: new Date() });
            return;
          }

          annotateTokenRef.current = setPhotoAnnotateCallback((annotatedUri) => {
            annotateTokenRef.current = null;
            // If user cancels the annotator, fall back to the raw URI.
            resolve({ uri: annotatedUri ?? uri, timestamp: new Date() });
          });

          router.replace(
            `/photo-annotate?uri=${encodeURIComponent(uri)}` as never,
          );
        });

        // `skip=1` tells the picker that picks won't be annotated (so it must dismiss
        // itself after resolving, since the annotate `router.replace` never runs).
        router.push((opts.skipAnnotate ? '/photo-picker?skip=1' : '/photo-picker') as never);
      });
    },
    [router],
  );

  /**
   * Multi-photo entry point. Opens /photo-picker in batch mode (recent-strip
   * multi-select + system-library multi-select). Returns an array:
   *   - a single shutter capture keeps the annotate step (unless `skipAnnotate`)
   *     and resolves with one photo;
   *   - a strip/library batch skips annotation and resolves with all of them,
   *     sharing one timestamp for the whole batch.
   * Resolves with `[]` when cancelled.
   */
  const pickPhotosWithAnnotation = useCallback(
    (opts: { skipAnnotate?: boolean } = {}): Promise<PickedPhoto[]> => {
      return new Promise((resolve) => {
        if (pickerTokenRef.current !== null) cancelPhotoPicker(pickerTokenRef.current);
        if (annotateTokenRef.current !== null) cancelPhotoAnnotate(annotateTokenRef.current);

        pickerTokenRef.current = setPhotoPickerCallback((uris) => {
          pickerTokenRef.current = null;
          if (!uris || uris.length === 0) { resolve([]); return; }

          const timestamp = new Date();
          const fromCapture = getLastPhotoFromCapture();

          // Only a single live capture goes through the annotator; strip/library
          // batches are added directly.
          if (fromCapture && !opts.skipAnnotate && uris.length === 1) {
            const captured = uris[0];
            annotateTokenRef.current = setPhotoAnnotateCallback((annotatedUri) => {
              annotateTokenRef.current = null;
              resolve([{ uri: annotatedUri ?? captured, timestamp }]);
            });
            router.replace(
              `/photo-annotate?uri=${encodeURIComponent(captured)}` as never,
            );
            return;
          }

          resolve(uris.map((uri) => ({ uri, timestamp })));
        });

        router.push(
          (opts.skipAnnotate ? '/photo-picker?multi=1&skip=1' : '/photo-picker?multi=1') as never,
        );
      });
    },
    [router],
  );

  const pickPhotoWithAnnotationFromUri = useCallback(
    (sourceUri: string): Promise<string | null> => {
      return new Promise((resolve) => {
        if (annotateTokenRef.current !== null) cancelPhotoAnnotate(annotateTokenRef.current);

        annotateTokenRef.current = setPhotoAnnotateCallback((annotatedUri) => {
          annotateTokenRef.current = null;
          resolve(annotatedUri);
        });

        router.push(
          `/photo-annotate?uri=${encodeURIComponent(sourceUri)}` as never,
        );
      });
    },
    [router],
  );

  const takePhoto = useCallback(
    async (
      options: Partial<ImagePicker.ImagePickerOptions> = {},
    ): Promise<PickedPhoto | null> => {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return null;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        ...options,
      });

      if (result.canceled || !result.assets?.[0]) return null;

      return {
        uri: result.assets[0].uri,
        timestamp: new Date(),
      };
    },
    [],
  );

  const pickPhoto = useCallback(
    async (
      options: Partial<ImagePicker.ImagePickerOptions> = {},
    ): Promise<PickedPhoto | null> => {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return null;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        ...options,
      });

      if (result.canceled || !result.assets?.[0]) return null;

      return {
        uri: result.assets[0].uri,
        timestamp: new Date(),
      };
    },
    [],
  );

  const pickMultiplePhotos = useCallback(
    async (
      options: Partial<ImagePicker.ImagePickerOptions> = {},
    ): Promise<PickedPhoto[]> => {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return [];

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsMultipleSelection: true,
        ...options,
      });

      if (result.canceled || !result.assets?.length) return [];

      const timestamp = new Date();

      return result.assets.map(a => ({
        uri: a.uri,
        timestamp,
      }));
    },
    [],
  );

  return {
    pickPhotoWithAnnotation,
    pickPhotosWithAnnotation,
    pickPhotoWithAnnotationFromUri,
    takePhoto,
    pickPhoto,
    pickMultiplePhotos,
  };
}
