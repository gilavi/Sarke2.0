// Metro bundler config.
//
// We extend Expo's default config to enable the `web` platform — without
// this, bundling for web fails to resolve `react-native-web/dist/index`
// and `react-dom/client` because Metro's default platforms list is
// `['ios', 'android']` only.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.platforms = Array.from(
  new Set([...(config.resolver.platforms ?? []), 'web']),
);

module.exports = config;
