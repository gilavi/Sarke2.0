// Bundler-proof web override for react-native-worklets' PlatformChecker.
//
// react-native-worklets/.../PlatformChecker/index.js only computes the web
// flags when globalThis.__RUNTIME_KIND === RuntimeKind.ReactNative at module-
// init; on web that flag is unset at that moment, so SHOULD_BE_USE_WEB stays
// false, reanimated takes the native runtime path and crashes. The Expo app
// fixes this in metro.config.js by redirecting PlatformChecker to a shim. We do
// the same in the Storybook Vite/esbuild graph (see .storybook/main.ts).
//
// Unlike the repo's shims/worklets-platform-checker.web.ts (which imports
// react-native to read Platform.OS), this copy hardcodes the web-mode flags so
// it has ZERO imports — esbuild can inline it during dependency prebundle
// without needing the react-native→react-native-web alias to be in effect yet.
// In Storybook everything is web, so the values are constant.
export const IS_JEST = false;
export const IS_WEB = true;
export const IS_WINDOWS = false;
export const SHOULD_BE_USE_WEB = true;
