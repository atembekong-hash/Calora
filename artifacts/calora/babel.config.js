const { expoRouterBabelPlugin } = require('babel-preset-expo/build/expo-router-plugin');

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]],
    // Explicit registration keeps clean pnpm installs and workspace layouts
    // deterministic when the preset cannot discover expo-router from its own
    // module path.
    plugins: [expoRouterBabelPlugin],
  };
};
