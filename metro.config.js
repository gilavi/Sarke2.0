// Metro bundler config.
//
// We extend Expo's default config to enable the `web` platform — without
// this, bundling for web fails to resolve `react-native-web/dist/index`
// and `react-dom/client` because Metro's default platforms list is
// `['ios', 'android']` only.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.platforms = Array.from(
  new Set([...(config.resolver.platforms ?? []), 'web']),
);

// Skip these directories entirely during native (iOS/Android) Metro
// resolution. They are sibling projects (web-app/ Vite app, website/ Docusaurus,
// supabase/ migrations, docs/) that Metro should never crawl for source — every
// hot reload would otherwise stat thousands of files for nothing.
// Metro accepts a single RegExp or a RegExp[]; using one combined regex with
// platform-agnostic separators (matches both / and \) so this works on Windows
// dev machines as well as iOS/macOS CI.
config.resolver.blockList = [
  /[\\/](web-app|website|supabase|docs)[\\/].*/,
];

// Defer module factory execution until the require call actually fires.
// Major win for cold start: instead of running every screen's top-level
// imports at app boot, screens are only initialized on first navigation.
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

// Redirect native-only modules to web stubs.
// - react-native-maps: imports native-only codegenNativeCommands.
// - react-native-keyboard-controller: registers worklet-backed event handlers
//   via react-native-worklets, which throws on web (the JS worklets runtime
//   can't serialize objects). The browser handles keyboard natively, so the
//   stub is a no-op pass-through.
const WEB_SHIMS = {
  'react-native-maps': 'shims/react-native-maps.ts',
  'react-native-keyboard-controller': 'shims/react-native-keyboard-controller.tsx',
};
const _resolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && WEB_SHIMS[moduleName]) {
    return {
      filePath: path.resolve(__dirname, WEB_SHIMS[moduleName]),
      type: 'sourceFile',
    };
  }
  // Override react-native-worklets PlatformChecker on web. The library's
  // index.ts reads `globalThis.__RUNTIME_KIND` at module-init time, but on web
  // that flag is unset when PlatformChecker first evaluates — so
  // `SHOULD_BE_USE_WEB` stays false and the native-mode `createSerializable`
  // crashes at boot. The shim hard-codes the web-mode flags via Platform.OS,
  // sidestepping the timing dependency. Match imports like `../PlatformChecker`
  // or `../PlatformChecker/index` coming from inside react-native-worklets.
  if (
    platform === 'web' &&
    /(^|[\\/])PlatformChecker(\/index(\.js)?)?$/.test(moduleName) &&
    /react-native-worklets[\\/]/.test(context.originModulePath || '')
  ) {
    return {
      filePath: path.resolve(__dirname, 'shims/worklets-platform-checker.web.ts'),
      type: 'sourceFile',
    };
  }
  return _resolveRequest
    ? _resolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
