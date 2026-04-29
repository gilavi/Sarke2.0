module.exports = function (api) {
  api.cache(true);
  const isProd = process.env.NODE_ENV === 'production' || process.env.BABEL_ENV === 'production';
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Strip console.* (except error/warn) in production builds.
      ...(isProd ? [['transform-remove-console', { exclude: ['error', 'warn'] }]] : []),
      // Reanimated 4 / worklets plugin must be the last plugin.
      'react-native-worklets/plugin',
    ],
  };
};
