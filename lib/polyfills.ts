// Polyfill globalThis.crypto.randomUUID for Hermes in Expo Go.
import * as Crypto from 'expo-crypto';

declare const globalThis: {
  crypto?: { randomUUID?: () => string };
  __RUNTIME_KIND?: number;
};

if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = {};
}
if (typeof globalThis.crypto!.randomUUID !== 'function') {
  globalThis.crypto!.randomUUID = () => Crypto.randomUUID();
}

// react-native-worklets seeds `globalThis.__RUNTIME_KIND` lazily inside
// `runtimeKind.ts`, but its `PlatformChecker/index.ts` reads `__RUNTIME_KIND`
// at module-init time to decide whether `SHOULD_BE_USE_WEB` should be true.
// On web, if PlatformChecker evaluates before runtimeKind, `SHOULD_BE_USE_WEB`
// stays false and `createSerializable` is wired to the native code path,
// which throws `createSerializableObject should never be called in JSWorklets`
// the moment any Reanimated-using component mounts. Pre-seeding the runtime
// kind here (before `react-native-worklets` is first required) avoids that
// boot-time crash on web. RuntimeKind.ReactNative === 1.
if (typeof globalThis.__RUNTIME_KIND === 'undefined') {
  globalThis.__RUNTIME_KIND = 1;
}
