// Pre-seed react-native-worklets runtime kind on web. The library's
// PlatformChecker reads `globalThis.__RUNTIME_KIND` at module-init time, and
// expo-router/entry transitively imports worklets before any of our app code
// runs — so setting this in lib/polyfills.ts is too late on web. Without this
// pre-seed, `SHOULD_BE_USE_WEB` stays false and threads.js crashes at boot
// with `createSerializableObject should never be called in JSWorklets`.
// RuntimeKind.ReactNative === 1.
// Using require() to defeat ES-module import hoisting — `import` statements
// get pulled above sibling code regardless of source order, but require() runs
// in lexical order.
if (typeof globalThis.__RUNTIME_KIND === "undefined") {
  globalThis.__RUNTIME_KIND = 1;
}
require("expo-router/entry");
