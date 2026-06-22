// No-op stub for react-native-worklets in Vitest's jsdom environment.
// The real package initialises a native TurboModule (NativeWorklets) which
// doesn't exist in jsdom — importing it crashes the test suite. We replace
// the entire package with a minimal stub that satisfies the surface area
// consumed by react-native-reanimated/mock.
export const WorkletsModule = {};
export const useSharedValue = (value: unknown) => ({ value });
export const runOnJS = (fn: (...args: unknown[]) => unknown) => fn;
export const runOnUI = (fn: (...args: unknown[]) => unknown) => fn;
export default {};
