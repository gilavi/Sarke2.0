// Web override for react-native-worklets/lib/module/PlatformChecker/index.js.
//
// The library reads `globalThis.__RUNTIME_KIND` at module-init time to decide
// whether to set `SHOULD_BE_USE_WEB`. On web bundles that flag is unset when
// PlatformChecker first evaluates (it's seeded later, in runtimeKind.ts), so
// `SHOULD_BE_USE_WEB` stays false, `createSerializable` falls through to the
// native code path, and `threads.js` crashes at boot:
//   "createSerializableObject should never be called in JSWorklets".
//
// On web, Platform.OS === 'web' is always true, so we can bypass the runtime-
// kind check entirely and unconditionally export the web-mode flags.
import { Platform } from 'react-native';

export const IS_JEST = !!process.env.JEST_WORKER_ID;
export const IS_WEB = Platform.OS === 'web';
export const IS_WINDOWS = Platform.OS === ('windows' as typeof Platform.OS);
export const SHOULD_BE_USE_WEB = IS_JEST || IS_WEB || IS_WINDOWS;
