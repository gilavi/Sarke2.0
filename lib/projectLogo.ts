import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { logError } from './logError';

/**
 * Open the photo library and return the picked image as a base64 data URL
 * ready to be persisted as `projects.logo`. Returns `null` if the user
 * cancelled or permission was denied — callers should treat that as a
 * no-op.
 *
 * We deliberately skip `expo-image-manipulator` here: on iOS its
 * `renderAsync` path frequently fails with "Image context has been lost"
 * for PHAsset-backed URIs and HEIC sources. The picker itself reliably
 * returns JPEG + base64 when asked, so we just take that and let CSS
 * downscale at render time. `quality: 0.4` keeps the row small enough
 * (~150–400 KB) to live inline on the project record.
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
    quality: 0.4,
    base64: true,
    exif: false,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  const asset = res.assets[0];

  if (asset.base64 && asset.base64.length > 0) {
    return `data:image/jpeg;base64,${asset.base64}`;
  }

  // Fallback: some iOS setups omit base64 from the picker result. Read the
  // cached file the picker handed us instead.
  try {
    const b64 = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    if (b64) return `data:image/jpeg;base64,${b64}`;
  } catch (e) {
    logError(e, 'projectLogo.readBase64');
    Alert.alert('სურათის წაკითხვა ვერ მოხერხდა', String((e as Error)?.message ?? e));
  }
  return null;
}
