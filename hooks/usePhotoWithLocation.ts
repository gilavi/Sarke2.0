import { useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { getCurrentLocation } from '../utils/location';
import type { PhotoLocation } from '../utils/location';

export interface PhotoWithLocation {
  uri: string;
  timestamp: Date;
  location: PhotoLocation | null;
}

/**
 * Hook for flows that call ImagePicker directly (incidents, certs, qualifications).
 * For wizard / report flows that use the photo-picker screen, location is captured
 * there and read via getLastPhotoLocation() from photoPickerBus.
 */
export function usePhotoWithLocation() {
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

      // Capture location after the user finishes picking.
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

  return { takePhoto, pickPhoto, pickMultiplePhotos };
}
