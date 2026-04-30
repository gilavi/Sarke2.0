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

// Redirect react-native-maps to a no-op stub on web — the real package
// imports native-only codegenNativeCommands which Metro can't bundle for web.
const _resolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return {
      filePath: path.resolve(__dirname, 'shims/react-native-maps.ts'),
      type: 'sourceFile',
    };
  }
  return _resolveRequest
    ? _resolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
