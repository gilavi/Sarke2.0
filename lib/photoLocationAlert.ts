import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Project } from '../types/models';
import type { PhotoLocation } from '../utils/location';
import { getDistanceMeters, reverseGeocode } from '../utils/location';
import { projectsApi } from './services';

export const LOCATION_MISMATCH_THRESHOLD_M = 500;

/**
 * Once-per-24h suppression for the photo-location modal.
 *
 * Both modal branches (auto-set prompt and mismatch warning) can be noisy when
 * a user works at the same site for hours: every photo would re-trigger the
 * same question. We mark the modal as "answered" for the current project on
 * either button tap, then short-circuit subsequent calls within 24h.
 *
 * Key is per project so different projects can each surface their own prompt
 * once a day. The flag naturally expires after 24h — if the user is genuinely
 * working at a different site the next day, they'll be re-prompted.
 */
const SUPPRESS_WINDOW_MS = 24 * 60 * 60 * 1000;
const suppressKey = (projectId: string) => `photoLocAlert:dismissed:${projectId}`;

async function isRecentlyDismissed(projectId: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(suppressKey(projectId));
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < SUPPRESS_WINDOW_MS;
  } catch {
    return false;
  }
}

async function markDismissed(projectId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(suppressKey(projectId), String(Date.now()));
  } catch {
    // Storage failure shouldn't block the user — worst case the modal fires
    // again on the next photo. That's the existing behavior.
  }
}

/**
 * Test-only: clears the persisted suppression flag for a project so the next
 * photo upload triggers the modal again. Exported for tests; production code
 * should rely on the 24h TTL.
 */
export async function _resetPhotoLocationSuppression(projectId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(suppressKey(projectId));
  } catch {
    // ignore
  }
}

/**
 * After a photo is taken, show the appropriate project-location prompt:
 *  - If project has no lat/lon → offer to auto-set from the photo location.
 *  - If project has lat/lon and the photo is >500 m away → mismatch warning.
 *
 * Suppression: after either prompt is answered (any button, including
 * "სხვა პროექტზე გადასვლა"), the modal is muted for the same project for 24
 * hours so a user working at one site doesn't get re-prompted on every
 * photo. See `isRecentlyDismissed` / `markDismissed`.
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

  // Short-circuit BEFORE the (network-touching) reverseGeocode call when the
  // modal would just be re-shown and dismissed again.
  if (await isRecentlyDismissed(project.id)) return;

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
            void markDismissed(project.id);
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
        {
          text: 'არა',
          style: 'cancel',
          onPress: () => { void markDismissed(project.id); },
        },
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

  if (distance <= LOCATION_MISMATCH_THRESHOLD_M) return;

  const photoLat = location.latitude;
  const photoLon = location.longitude;
  const newAddress = address;

  const buttons: Parameters<typeof Alert.alert>[2] = [
    {
      text: 'კი, სწორია',
      style: 'default',
      onPress: () => { void markDismissed(project.id); },
    },
    {
      text: 'პროექტის ლოკაცია შევცვალო',
      onPress: () => {
        void markDismissed(project.id);
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
      onPress: () => {
        void markDismissed(project.id);
        onNavigateToProjects();
      },
    });
  }

  Alert.alert(
    'განსხვავებული ლოკაცია',
    `ფოტო გადაღებულია ${Math.round(distance)}მ პროექტის ლოკაციისგან.\n\nსწორ პროექტზე ხართ?`,
    buttons,
  );
}
