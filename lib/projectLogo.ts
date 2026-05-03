import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { logError } from './logError';

// Project logos are rendered as a 88px circle (`ProjectAvatar size={88}`).
// Even at retina 3x that's a 264px source — a 240px-wide downscale gives
// pixel-perfect rendering with zero visible quality loss. Earlier code
// inlined the picker output at quality 0.4, which still produced ~1.36 MB
// base64 strings that bloated the projects table row and made every project
// list query slow. Resizing here cuts a typical iPhone shot to ~20-40 KB.
const LOGO_MAX_WIDTH = 240;
const LOGO_QUALITY = 0.6;

/**
 * Open the photo library and return the picked image as a base64 data URL
 * ready to be persisted as `projects.logo`. Returns `null` if the user
 * cancelled or permission was denied — callers should treat that as a
 * no-op.
 *
 * We feed the picker's base64 output directly into `expo-image-manipulator`
 * as a data URL, never the asset URI. The historical "PHAsset URI / HEIC"
 * failure mode of `renderAsync` happens when the manipulator tries to read
 * a `ph://` source — the data-URL path is in-memory and avoids that entirely.
 */
export async function pickProjectLogo(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (perm.status !== 'granted') {
    Alert.alert('გალერეაზე წვდომა აკრძალულია');
    return null;
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 0.6,
    base64: true,
    exif: false,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  const asset = res.assets[0];

  // Pull the picker's base64 (or read the cached file as a fallback).
  let pickerBase64: string | null = null;
  if (asset.base64 && asset.base64.length > 0) {
    pickerBase64 = asset.base64;
  } else {
    try {
      pickerBase64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch (e) {
      logError(e, 'projectLogo.readBase64');
      Alert.alert('სურათის წაკითხვა ვერ მოხერხდა', String((e as Error)?.message ?? e));
      return null;
    }
  }
  if (!pickerBase64 || pickerBase64.length === 0) return null;

  // Resize + re-encode as JPEG. If the manipulator throws (very rare with a
  // data-URL input), fall back to the picker's raw base64 — better a slow
  // insert than a dead UX.
  try {
    const sourceDataUrl = `data:image/jpeg;base64,${pickerBase64}`;
    const out = await manipulateAsync(
      sourceDataUrl,
      [{ resize: { width: LOGO_MAX_WIDTH } }],
      { compress: LOGO_QUALITY, format: SaveFormat.JPEG, base64: true },
    );
    let finalBase64 = out.base64;
    if (!finalBase64 && out.uri) {
      finalBase64 = await FileSystem.readAsStringAsync(out.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }
    if (out.uri) {
      FileSystem.deleteAsync(out.uri, { idempotent: true }).catch(() => undefined);
    }
    if (finalBase64 && finalBase64.length > 0) {
      return `data:image/jpeg;base64,${finalBase64}`;
    }
  } catch (e) {
    logError(e, 'projectLogo.resize');
  }
  return `data:image/jpeg;base64,${pickerBase64}`;
}
