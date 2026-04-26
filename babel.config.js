module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo', 'nativewind/babel'],
    // Reanimated 4 / worklets plugin must be the last plugin.
    plugins: [
      'react-native-worklets/plugin',
      'react-native-reanimated/plugin',
    ],
  };
};
