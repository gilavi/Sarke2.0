// react-native-reanimated's worklets runtime reads `global` at module-init,
// which doesn't exist in the browser. This MUST run before any module that
// pulls reanimated in (the shared primitives — eagerly imported via the
// Projects route). Kept as a standalone side-effect module imported FIRST in
// main.tsx, because ES imports execute before any statement in main.tsx's body.
(globalThis as typeof globalThis & { global?: unknown }).global ??= globalThis;

export {};
