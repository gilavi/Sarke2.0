import React from 'react';
import { View } from 'react-native';

// Web shim for react-native-safe-area-context.
//
// The native package deep-imports react-native core (codegenNativeComponent),
// which doesn't exist under react-native-web. On the web there are no device
// safe-area insets, so the provider is a passthrough and insets are all zero.
// The Screen primitive consumes useSafeAreaInsets()/edges — both degrade to
// plain padding-free layout here.

const ZERO = { top: 0, right: 0, bottom: 0, left: 0 };
const FRAME = { x: 0, y: 0, width: 0, height: 0 };

export function SafeAreaProvider({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

export function SafeAreaView({ children, style }: { children?: React.ReactNode; style?: unknown }) {
  return <View style={style as never}>{children}</View>;
}

export const SafeAreaInsetsContext = React.createContext(ZERO);
export const SafeAreaFrameContext = React.createContext(FRAME);

export function useSafeAreaInsets() {
  return ZERO;
}
export function useSafeAreaFrame() {
  return FRAME;
}
export function withSafeAreaInsets<T>(Component: T): T {
  return Component;
}
export const initialWindowMetrics = { insets: ZERO, frame: FRAME };
