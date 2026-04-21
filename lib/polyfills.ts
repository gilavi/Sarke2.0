// Polyfill globalThis.crypto.randomUUID for Hermes in Expo Go.
import * as Crypto from 'expo-crypto';

declare const globalThis: { crypto?: { randomUUID?: () => string } };

if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = {};
}
if (typeof globalThis.crypto!.randomUUID !== 'function') {
  globalThis.crypto!.randomUUID = () => Crypto.randomUUID();
}
