import { useCallback, useEffect, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { getCurrentLocation } from '../utils/location';
import type { PhotoLocation } from '../utils/location';
import {
  cancelPhotoAnnotate,
  cancelPhotoPicker,
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
 * - `pickPhotoWithAnnotation` — the canonical mobile entry point.
 *   Opens /photo-picker (live camera + gallery + GPS), then /photo-annotate.
 *   The annotation step is always presented; the user may save without drawing.
 *   Pass `skipAnnotate: true` for contexts where markup is not useful (incidents,
 *   certificates, qualifications).
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

        pickerTokenRef.current = setPhotoPickerCallback((uri) => {
          pickerTokenRef.current = null;
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
    pickPhotoWithAnnotationFromUri,
    takePhoto,
    pickPhoto,
    pickMultiplePhotos,
  };
}
