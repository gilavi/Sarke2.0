import { useCallback, useEffect, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { getCurrentLocation } from '../utils/location';
import type { PhotoLocation } from '../utils/location';
import {
  cancelPhotoAnnotate,
  cancelPhotoPicker,
  getLastPhotoFromCapture,
  getLastPhotoLocation,
  setPhotoAnnotateCallback,
  setPhotoPickerCallback,
} from '../lib/photoPickerBus';

export interface PhotoWithLocation {
  uri: string;
  timestamp: Date;
  location: PhotoLocation | null;
}

/**
 * Hook for all photo-pick flows.
 *
 * - `pickPhotoWithAnnotation` — the canonical SINGLE-photo entry point.
 *   Opens /photo-picker (live camera + gallery + GPS), then /photo-annotate.
 *   The annotation step is always presented; the user may save without drawing.
 *   Pass `skipAnnotate: true` for contexts where markup is not useful (incidents,
 *   certificates, qualifications). Returns one photo (or null).
 *
 * - `pickPhotosWithAnnotation` — the MULTI-photo entry point (galleries: inspection
 *   item/summary photos, answer photos, incident photos, project files). Opens
 *   /photo-picker in batch mode. A single live capture still annotates and returns
 *   one photo; a recent-strip / system-library batch skips annotation and returns
 *   all selected photos (sharing one location + timestamp). Returns `[]` if cancelled.
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
export function usePhotoWithLocation() {
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
    (opts: { skipAnnotate?: boolean } = {}): Promise<PhotoWithLocation | null> => {
      return new Promise((resolve) => {
        if (pickerTokenRef.current !== null) cancelPhotoPicker(pickerTokenRef.current);
        if (annotateTokenRef.current !== null) cancelPhotoAnnotate(annotateTokenRef.current);

        pickerTokenRef.current = setPhotoPickerCallback((uris) => {
          pickerTokenRef.current = null;
          // Single-photo entry: the bus now delivers an array, but this flow only
          // ever opens the picker in single mode, so take the first (if any).
          const uri = uris && uris.length > 0 ? uris[0] : null;
          if (!uri) { resolve(null); return; }

          const location = getLastPhotoLocation();

          if (opts.skipAnnotate) {
            resolve({ uri, timestamp: new Date(), location });
            return;
          }

          annotateTokenRef.current = setPhotoAnnotateCallback((annotatedUri) => {
            annotateTokenRef.current = null;
            // If user cancels the annotator, fall back to the raw URI.
            resolve({ uri: annotatedUri ?? uri, timestamp: new Date(), location });
          });

          router.replace(
            `/photo-annotate?uri=${encodeURIComponent(uri)}` as never,
          );
        });

        router.push('/photo-picker' as never);
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
   *     sharing one location + timestamp for the whole batch.
   * Resolves with `[]` when cancelled.
   */
  const pickPhotosWithAnnotation = useCallback(
    (opts: { skipAnnotate?: boolean } = {}): Promise<PhotoWithLocation[]> => {
      return new Promise((resolve) => {
        if (pickerTokenRef.current !== null) cancelPhotoPicker(pickerTokenRef.current);
        if (annotateTokenRef.current !== null) cancelPhotoAnnotate(annotateTokenRef.current);

        pickerTokenRef.current = setPhotoPickerCallback((uris) => {
          pickerTokenRef.current = null;
          if (!uris || uris.length === 0) { resolve([]); return; }

          const location = getLastPhotoLocation();
          const timestamp = new Date();
          const fromCapture = getLastPhotoFromCapture();

          // Only a single live capture goes through the annotator; strip/library
          // batches are added directly.
          if (fromCapture && !opts.skipAnnotate && uris.length === 1) {
            const captured = uris[0];
            annotateTokenRef.current = setPhotoAnnotateCallback((annotatedUri) => {
              annotateTokenRef.current = null;
              resolve([{ uri: annotatedUri ?? captured, timestamp, location }]);
            });
            router.replace(
              `/photo-annotate?uri=${encodeURIComponent(captured)}` as never,
            );
            return;
          }

          resolve(uris.map((uri) => ({ uri, timestamp, location })));
        });

        router.push('/photo-picker?multi=1' as never);
      });
    },
    [router],
  );

  const pickPhotoWithAnnotationFromUri = useCallback(
    (sourceUri: string, location: PhotoLocation | null): Promise<string | null> => {
      return new Promise((resolve) => {
        if (annotateTokenRef.current !== null) cancelPhotoAnnotate(annotateTokenRef.current);

        annotateTokenRef.current = setPhotoAnnotateCallback((annotatedUri) => {
          annotateTokenRef.current = null;
          resolve(annotatedUri);
        });

        router.push(
          `/photo-annotate?uri=${encodeURIComponent(sourceUri)}` as never,
        );

        // location is available to the caller immediately via closure if needed;
        // the annotate screen doesn't need it.
        void location;
      });
    },
    [router],
  );

  const takePhoto = useCallback(
    async (
      options: Partial<ImagePicker.ImagePickerOptions> = {},
    ): Promise<PhotoWithLocation | null> => {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return null;

      const [result, location] = await Promise.all([
        ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          ...options,
        }),
        getCurrentLocation(),
      ]);

      if (result.canceled || !result.assets?.[0]) return null;

      return {
        uri: result.assets[0].uri,
        timestamp: new Date(),
        location,
      };
    },
    [],
  );

  const pickPhoto = useCallback(
    async (
      options: Partial<ImagePicker.ImagePickerOptions> = {},
    ): Promise<PhotoWithLocation | null> => {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return null;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        ...options,
      });

      if (result.canceled || !result.assets?.[0]) return null;

      const location = await getCurrentLocation();

      return {
        uri: result.assets[0].uri,
        timestamp: new Date(),
        location,
      };
    },
    [],
  );

  const pickMultiplePhotos = useCallback(
    async (
      options: Partial<ImagePicker.ImagePickerOptions> = {},
    ): Promise<PhotoWithLocation[]> => {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return [];

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsMultipleSelection: true,
        ...options,
      });

      if (result.canceled || !result.assets?.length) return [];

      const location = await getCurrentLocation();
      const timestamp = new Date();

      return result.assets.map(a => ({
        uri: a.uri,
        timestamp,
        location,
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
