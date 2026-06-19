# design-system/ — Hubble Design System (Storybook)

## What this module does

Hosts the Hubble **design system showcase**: a Storybook that renders the REAL
mobile components (`components/primitives/*`) on the web via **react-native-web**,
plus token galleries sourced from the canonical `lib/design-tokens.ts`. This is
the "universal component" tier — the exact same `.tsx` files ship to the Expo app
and render here, so web and mobile cannot drift. Planned host: `ds.hubble.ge`.

It is **not** a workspace package. It's a sibling Vite/Storybook project that
imports the app's components via path aliases; the Expo/Metro build never crawls
it (`metro.config.js` blockList + root `tsconfig.json` exclude both list it).

## Public API / scripts

- `npm run storybook` (in this folder) — dev server on port 6007.
- `npm run build` — static export to `design-system/dist/` (what gets deployed).
- Preview via `.claude/launch.json` → `design-system-storybook`.

## Internal files

- `.storybook/main.ts` — framework `@storybook/react-native-web-vite` + the
  reanimated-on-web wiring (see Gotchas). The hard part of this project.
- `.storybook/preview.tsx` — controlled `ThemeContext` provider + a light/dark
  toolbar global (`theme`). Drives `lightTheme`/`darkTheme` directly (no AsyncStorage).
- `.storybook/preview-head.html` — `@font-face` for icon/brand fonts.
- `shims/worklets-platform-checker.ts` — import-free web override forcing
  `SHOULD_BE_USE_WEB = true` (redirected for both Vite + esbuild prebundle).
- `shims/expo-haptics.web.ts`, `shims/empty.ts` — web no-ops.
- `stories/` — `Tokens.stories.tsx` (galleries) + one file per universal primitive.
  `Motion.stories.tsx` has an `Interactions` playground showcasing the shared press
  squish + selection spring across every tappable control (tap to feel it; reanimated
  renders on web via the shims below).
- **Sidebar taxonomy.** Every story `title` is `Category/Component` (NOT a flat
  `Components/*`). Categories: `Foundations`, `Actions`, `Forms`, `Selection`,
  `Data Display`, `Feedback`, `Navigation`, `Overlays`, `Inspection`, `Patterns`.
  The order is pinned by `options.storySort.order` in `.storybook/preview.tsx` — add new
  categories there too. The `Selection/*` group gathers every option-picker (`Selector`
  with a Controls-driven Playground, `Verdict`, `Answer Chips`) so they're found together.
  When adding a story, pick the matching category prefix rather than inventing a new one.

## Gotchas (reanimated v4 + react-native-web in Vite)

The reason `.storybook/main.ts` is non-trivial. All four are required together:
1. **PlatformChecker shim** → `SHOULD_BE_USE_WEB=true` (redirect in BOTH a Vite
   `resolveId` plugin AND `optimizeDeps.esbuildOptions` — prebundle ignores Vite plugins).
2. **`__DEV__: false`** in BOTH top-level `define` AND `optimizeDeps.esbuildOptions.define`
   — else reanimated's `initializeRNRuntime` test-worklet check throws (Vite, unlike
   Metro, doesn't run the worklets transform over reanimated's prebuilt node_modules).
3. Stub reanimated's `validate-worklets-version` (it require()s JSON the babel pass chokes on).
4. Keep reanimated **prebundled** (excluding it breaks its default-export interop).
- Icons aliased `lucide-react-native` → `lucide-react` (DOM SVG); primitives take
  the icon as a prop, so this is correct on web.
- The preview manager has a short startup timeout — warm the Vite cache once with
  `npm run storybook` before relying on it; cold prebundle exceeds the timeout.

## Canonical helpers it consumes

- `@root/lib/design-tokens` (alias `@tokens`) — the single token source.
- `@root/components/primitives/*` (alias `@ds`) — the universal components.
- `@root/lib/theme` + `@root/lib/ThemeContext` — theme object + context.
