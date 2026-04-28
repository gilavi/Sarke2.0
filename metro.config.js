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
