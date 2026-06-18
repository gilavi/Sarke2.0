import type { StorybookConfig } from '@storybook/react-native-web-vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, '../..');

// Bundler-proof, import-free web override for react-native-worklets'
// PlatformChecker (hardcodes SHOULD_BE_USE_WEB=true). See the shim file for why.
const workletsShim = path.resolve(dirname, '../shims/worklets-platform-checker.ts');
const emptyShim = path.resolve(dirname, '../shims/empty.ts');

// Redirect react-native-worklets' PlatformChecker → web shim, and reanimated's
// dev-only JSON version checker → empty. Reanimated v4's worklets runtime reads
// PlatformChecker at init; without this redirect SHOULD_BE_USE_WEB stays false,
// it takes the native path and crashes ("Failed to create a worklet"). The Expo
// app does the same in metro.config.js — Storybook's Vite graph needs its own.
const isPlatformChecker = (id: string) =>
  /(^|[\\/])PlatformChecker(\.js|\/index(\.js)?)?$/.test(id);

const workletsWebShimPlugin = {
  name: 'hubble-worklets-web-shim',
  enforce: 'pre' as const,
  resolveId(source: string) {
    if (isPlatformChecker(source)) return workletsShim;
    if (/validate-worklets-version(\.js)?$/.test(source)) return emptyShim;
    return null;
  },
};

const config: StorybookConfig = {
  // The @storybook/react-native-web-vite framework wires react-native →
  // react-native-web and Flow stripping for RN node_modules. It does NOT
  // transform our own worklets, so we add react-native-worklets/plugin to the
  // plugin-react (JSX) Babel pass. plugin-react excludes node_modules, so this
  // only touches our component source (e.g. Button.tsx's useAnimatedStyle).
  framework: {
    name: '@storybook/react-native-web-vite',
    options: {
      pluginReactOptions: {
        babel: { plugins: ['react-native-worklets/plugin'] },
      },
    },
  },
  stories: ['../stories/**/*.stories.@(tsx|ts|mdx)'],
  addons: ['@storybook/addon-essentials'],
  core: { disableTelemetry: true },
  async viteFinal(cfg) {
    const { mergeConfig } = await import('vite');
    return mergeConfig(cfg, {
      plugins: [workletsWebShimPlugin],
      define: {
        // Reanimated runs in production mode in the showcase. __DEV__=false skips
        // initializeRNRuntime's dev-only test-worklet check, which otherwise
        // throws because Vite (unlike Metro) doesn't run the worklets babel
        // transform over reanimated's own prebuilt node_modules.
        __DEV__: JSON.stringify(false),
        'process.env.EXPO_OS': JSON.stringify('web'),
      },
      resolve: {
        dedupe: ['react', 'react-dom', 'react-native-web'],
        alias: [
          { find: 'expo-haptics', replacement: path.resolve(dirname, '../shims/expo-haptics.web.ts') },
          // react-native-gesture-handler ships untranspiled .ts that the babel
          // pass can't parse; we only need swipe-to-dismiss (non-essential on
          // web), so stub it. Mirrors metro.config.js WEB_SHIMS.
          { find: /^react-native-gesture-handler$/, replacement: path.resolve(dirname, '../shims/react-native-gesture-handler.web.tsx') },
          // Icons: map lucide-react-native → lucide-react (DOM SVG; same names/
          // props, avoids lucide-react-native's broken ESM barrel + react-native-svg).
          // Must be an ABSOLUTE path: components in ../components/ import lucide at
          // runtime, and a bare 'lucide-react' would resolve relative to that file
          // (→ root node_modules, where it doesn't exist) and break the prod build.
          { find: /^lucide-react-native$/, replacement: path.resolve(dirname, '../node_modules/lucide-react') },
          { find: '@root', replacement: repoRoot },
          { find: '@ds', replacement: path.resolve(repoRoot, 'components/primitives') },
          { find: '@tokens', replacement: path.resolve(repoRoot, 'lib/design-tokens') },
        ],
      },
      optimizeDeps: {
        // 'buffer' must be prebundled for correct CJS→ESM named exports.
        include: ['buffer'],
        esbuildOptions: {
          // The prebundle has its own define table (the top-level `define` above
          // does NOT reach prebundled deps). reanimated is prebundled, so set
          // __DEV__=false here too, or its initializeRNRuntime test-worklet check
          // still runs and crashes.
          define: { __DEV__: 'false', 'process.env.EXPO_OS': '"web"' },
          // The PlatformChecker / validate-worklets redirects must ALSO apply
          // during esbuild's dependency prebundle (where Vite resolveId plugins
          // don't run) — reanimated/worklets are prebundled, so this is where the
          // PlatformChecker that ships in those deps gets swapped for the web shim.
          plugins: [
            {
              name: 'hubble-worklets-esbuild-shims',
              setup(build: any) {
                build.onResolve({ filter: /validate-worklets-version/ }, () => ({ path: emptyShim }));
                build.onResolve({ filter: /(^|[\\/])PlatformChecker(\.js|\/index(\.js)?)?$/ }, () => ({
                  path: workletsShim,
                }));
              },
            },
          ],
        },
      },
      server: {
        // components/ and lib/ live outside the design-system/ Vite root.
        fs: { allow: [repoRoot] },
      },
    });
  },
};

export default config;
