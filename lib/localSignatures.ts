// Local signature storage (device-only, never sent to server).
// Used by inspection flows that must not persist signature images server-side.

import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'local-sigs:';

const key = (inspectionId: string) => `${PREFIX}${inspectionId}`;

export async function saveLocalSignatures(inspectionId: string, signatures: unknown) {
  await AsyncStorage.setItem(key(inspectionId), JSON.stringify(signatures));
}

export async function loadLocalSignatures(inspectionId: string): Promise<unknown | null> {
  const raw = await AsyncStorage.getItem(key(inspectionId));
  return raw ? JSON.parse(raw) : null;
}

export async function removeLocalSignatures(inspectionId: string) {
  await AsyncStorage.removeItem(key(inspectionId));
}
