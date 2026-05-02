import { Alert } from 'react-native';
import type { Project } from '../types/models';
import type { PhotoLocation } from '../utils/location';
import { getDistanceMeters, reverseGeocode } from '../utils/location';
import { projectsApi } from './services';

export const LOCATION_MISMATCH_THRESHOLD_M = 500;

/**
 * After a photo is taken, show the appropriate project-location prompt:
 *  - If project has no lat/lon → offer to auto-set from the photo location.
 *  - If project has lat/lon and the photo is >500 m away → mismatch warning.
 *
 * Never blocks photo capture — call fire-and-forget after the photo is saved.
 */
export async function showPhotoLocationAlert(
  project: Project,
  location: PhotoLocation | null,
  onProjectUpdated: (updated: Project) => void,
  onNavigateToProjects?: () => void,
): Promise<void> {
  if (!location) return;

  const address = await reverseGeocode(location.latitude, location.longitude).catch(
    () => `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`,
  );

  if (project.latitude == null || project.longitude == null) {
    // ── Case 1: project has no location — offer auto-set ──────────────────────
    Alert.alert(
      'პროექტის ლოკაცია',
      `ავტომატურად განისაზღვრა:\n${address}\n\nდავამატოთ პროექტს?`,
      [
        {
          text: 'კი, დამატება',
          onPress: () => {
            projectsApi
              .update(project.id, {
                address,
                latitude: location.latitude,
                longitude: location.longitude,
              })
              .then(onProjectUpdated)
              .catch(() => {});
          },
        },
        { text: 'არა', style: 'cancel' },
      ],
    );
    return;
  }

  // ── Case 2: project has location — check distance ──────────────────────────
  const distance = getDistanceMeters(
    location.latitude,
    location.longitude,
    project.latitude,
    project.longitude,
  );

  if (distance > LOCATION_MISMATCH_THRESHOLD_M) {
    const photoLat = location.latitude;
    const photoLon = location.longitude;
    const newAddress = address;

    const buttons: Parameters<typeof Alert.alert>[2] = [
      { text: 'კი, სწორია', style: 'default' },
      {
        text: 'პროექტის ლოკაცია შევცვალო',
        onPress: () => {
          projectsApi
            .update(project.id, {
              address: newAddress,
              latitude: photoLat,
              longitude: photoLon,
            })
            .then(onProjectUpdated)
            .catch(() => {});
        },
      },
    ];

    if (onNavigateToProjects) {
      buttons.push({
        text: 'სხვა პროექტზე გადასვლა',
        onPress: onNavigateToProjects,
      });
    }

    Alert.alert(
      'განსხვავებული ლოკაცია',
      `ფოტო გადაღებულია ${Math.round(distance)}მ პროექტის ლოკაციისგან.\n\nსწორ პროექტზე ხართ?`,
      buttons,
    );
  }
}
