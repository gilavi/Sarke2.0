import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { flowPlugin, esbuildFlowPlugin } from '@bunchtogether/vite-plugin-flow';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '..');
const shims = path.resolve(__dirname, 'shims');

// React Native ecosystem packages ship untranspiled Flow-typed .js (e.g.
// react-native core's codegenNativeComponent / ReactFabric shims, pulled in by
// reanimated). esbuild/rollup can't parse Flow, so strip it — at BOTH the
// esbuild prebundle phase (esbuildFlowPlugin) and Vite's transform pipeline
// (flowPlugin, used by `vite build`). Scoped to RN packages so non-RN deps keep
// esbuild's fast path. flow-remove-types is pragma-gated (all:false), so files
// without an `@flow` comment pass through unchanged.
const RN_FLOW = /[\\/]node_modules[\\/](@react-native(-community)?[\\/][^\\/]+|react-native[^\\/]*)[\\/].*\.jsx?$/;

// ── react-native-web plumbing ───────────────────────────────────────────────
// web-app consumes the SAME component library as the Expo app
// (../components/primitives), rendered on the web via react-native-web. This is
// the production-Vite port of the recipe proven in design-system/.storybook/main.ts.
//
// reanimated v4's worklets runtime reads react-native-worklets' PlatformChecker
// at init; on web that flag is unset at that moment, so SHOULD_BE_USE_WEB stays
// false, it takes the native path and crashes ("Failed to create a worklet").
// We redirect PlatformChecker → a hardcoded web shim, and reanimated's dev-only
// JSON version checker → an empty no-op, in BOTH Vite's resolveId graph and
// esbuild's dependency prebundle (where resolveId plugins don't run).
const workletsShim = path.resolve(shims, 'worklets-platform-checker.ts');
const emptyShim = path.resolve(shims, 'empty.ts');

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

export default defineConfig({
  base: '/app/',
  plugins: [
    // enforce:'pre' — strip Flow from RN node_modules before other transforms.
    flowPlugin({ include: RN_FLOW, exclude: [], flow: { all: false } }),
    react({
      // plugin-react's Babel pass excludes node_modules, so this worklets
      // transform only touches our own source + the ../components primitives
      // (e.g. usePressBounce's useAnimatedStyle), never reanimated's prebuilt JS.
      babel: { plugins: ['react-native-worklets/plugin'] },
    }),
    workletsWebShimPlugin,
  ],
  define: {
    // reanimated runs in production mode on web. __DEV__=false skips
    // initializeRNRuntime's dev-only test-worklet check, which otherwise throws
    // because Vite (unlike Metro) doesn't run the worklets babel transform over
    // reanimated's own prebuilt node_modules.
    __DEV__: JSON.stringify(false),
    'process.env.EXPO_OS': JSON.stringify('web'),
  },
  resolve: {
    dedupe: ['react', 'react-dom', 'react-native-web'],
    // Prefer .web.* so platform-specific web variants win over native ones.
    extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js', '.json', '.mjs'],
    alias: [
      { find: '@', replacement: path.resolve(__dirname, 'src') },
      { find: '@root', replacement: repoRoot },
      // react-native → react-native-web (the whole point).
      { find: /^react-native$/, replacement: 'react-native-web' },
      // Icons: lucide-react-native → lucide-react (DOM SVG; same names/props).
      // Absolute path: the primitives live in ../components, so a bare specifier
      // would resolve relative to them (root node_modules) and break.
      { find: /^lucide-react-native$/, replacement: path.resolve(__dirname, 'node_modules/lucide-react') },
      // Native-only modules the primitives transitively import — stub for web.
      { find: /^expo-haptics$/, replacement: path.resolve(shims, 'expo-haptics.web.ts') },
      { find: /^expo-router$/, replacement: path.resolve(shims, 'expo-router.web.ts') },
      { find: /^react-native-gesture-handler$/, replacement: path.resolve(shims, 'react-native-gesture-handler.web.tsx') },
      { find: /^react-native-maps$/, replacement: path.resolve(shims, 'react-native-maps.ts') },
      { find: /^@react-native-community\/datetimepicker$/, replacement: path.resolve(shims, 'datetimepicker.web.tsx') },
      // safe-area-context's native build deep-imports react-native core; the web
      // has no device insets, so use a zero-inset passthrough (Screen consumes it).
      { find: /^react-native-safe-area-context$/, replacement: path.resolve(shims, 'react-native-safe-area-context.web.tsx') },
      // @root/components/primitives and @root/lib import packages that in CI are
      // only installed under web-app/node_modules (root node_modules not present).
      // These explicit aliases prevent Rollup from walking up past web-app/ and
      // failing to resolve them.
      { find: /^react-native-reanimated$/, replacement: path.resolve(__dirname, 'node_modules/react-native-reanimated') },
      { find: /^@react-native-async-storage\/async-storage/, replacement: path.resolve(__dirname, 'node_modules/@react-native-async-storage/async-storage') },
    ],
  },
  optimizeDeps: {
    include: ['react-native-web', 'react-native-reanimated', '@react-native-async-storage/async-storage'],
    esbuildOptions: {
      // The prebundle has its OWN resolution settings — Vite's resolve.extensions
      // does NOT reach it. reanimated ships .web.js variants for exactly the
      // native-bridge files that deep-import react-native core (which uses RN
      // 0.81 `component` syntax flow-remove-types can't parse); preferring
      // .web.* here makes the prebundle pick those web variants and never reach
      // RN core. This is the linchpin (mirrors design-system's reactNativeWeb()).
      resolveExtensions: ['.web.tsx', '.web.ts', '.web.js', '.web.jsx', '.tsx', '.ts', '.jsx', '.js', '.json', '.mjs'],
      // The prebundle has its own define table (the top-level `define` does NOT
      // reach prebundled deps). reanimated is prebundled, so set __DEV__ here too.
      define: { __DEV__: 'false', 'process.env.EXPO_OS': '"web"' },
      // PlatformChecker / validate-worklets redirects must ALSO apply during the
      // esbuild prebundle (where Vite resolveId plugins don't run).
      plugins: [
        {
          name: 'hubble-worklets-esbuild-shims',
          setup(build: { onResolve: (o: { filter: RegExp }, cb: () => { path: string }) => void }) {
            build.onResolve({ filter: /validate-worklets-version/ }, () => ({ path: emptyShim }));
            build.onResolve({ filter: /(^|[\\/])PlatformChecker(\.js|\/index(\.js)?)?$/ }, () => ({ path: workletsShim }));
          },
        },
        // Strip Flow from RN .js during prebundle and load them as JSX.
        esbuildFlowPlugin(RN_FLOW, () => 'jsx', { all: false }),
      ],
    },
  },
  server: {
    // ../components and ../lib live outside the web-app/ Vite root.
    fs: { allow: [repoRoot] },
  },
  build: {
    sourcemap: false,
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('three') || id.includes('@react-three')) return 'threejs';
          if (id.includes('leaflet') || id.includes('react-leaflet')) return 'leaflet';
          if (id.includes('@radix-ui')) return 'radix-ui';
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('react-native') || id.includes('reanimated') || id.includes('worklets')) return 'rnw';
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
});
