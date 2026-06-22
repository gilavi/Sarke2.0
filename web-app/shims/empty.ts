// No-op stub for modules that are irrelevant on web — currently reanimated's
// build-time validate-worklets-version script, which require()s JSON files that
// the Vite babel transform can't parse. It's imported as a default function and
// called for its side effect (a dev version check), so the default is a no-op.
export default function validateWorkletsVersionNoop(): void {}
export {};
