import React from 'react';

// Web stub for react-native-gesture-handler.
//
// The real package ships untranspiled .ts in lib/module/, which the framework's
// babel pass can't parse during Vite prebundle. Components in the showcase only
// use gesture-handler for swipe-to-dismiss on BottomSheet — non-essential on web
// (the sheet still opens and dismisses via its backdrop). So we stub the surface
// they touch. Mirrors the metro.config.js WEB_SHIMS approach (which stubs
// react-native-keyboard-controller for the same reason).

/** Chainable no-op gesture builder: every method returns the builder itself. */
function makeGesture(): any {
  const g: any = new Proxy(
    {},
    {
      get: () => () => g,
    }
  );
  return g;
}

export const Gesture = {
  Pan: makeGesture,
  Tap: makeGesture,
  Native: makeGesture,
  LongPress: makeGesture,
  Fling: makeGesture,
  Pinch: makeGesture,
  Rotation: makeGesture,
  Simultaneous: () => makeGesture(),
  Race: () => makeGesture(),
  Exclusive: () => makeGesture(),
};

export function GestureDetector({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

export function GestureHandlerRootView({
  children,
  style,
}: {
  children?: React.ReactNode;
  style?: any;
}) {
  return <div style={{ display: 'flex', flexDirection: 'column', flex: 1, ...(style as object) }}>{children}</div>;
}

export type NativeGesture = unknown;

export const State = { UNDETERMINED: 0, FAILED: 1, BEGAN: 2, CANCELLED: 3, ACTIVE: 4, END: 5 };
export const Directions = { RIGHT: 1, LEFT: 2, UP: 4, DOWN: 8 };
export function gestureHandlerRootHOC<T>(Component: T): T {
  return Component;
}

export default { Gesture, GestureDetector, GestureHandlerRootView, State, Directions, gestureHandlerRootHOC };
