// Web stub for react-native-keyboard-controller.
// The real package registers worklet-backed event handlers via
// react-native-worklets, which throws `createSerializableObject should
// never be called in JSWorklets` on web because the JS worklets runtime
// can't clone/serialize objects. On web, the browser handles keyboard
// natively, so we don't need any of this — replace with no-op pass-throughs.
import { ReactNode } from 'react';
import { ScrollView, ScrollViewProps, View, ViewProps } from 'react-native';

export function KeyboardProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export const KeyboardAwareScrollView = ScrollView;
export const KeyboardAvoidingView = (props: ViewProps) => <View {...props} />;
export const KeyboardStickyView = (props: ViewProps) => <View {...props} />;
export const KeyboardToolbar = () => null;

export function useKeyboardHandler() {
  return undefined;
}

export const KeyboardController = {
  dismiss: () => undefined,
  setInputMode: () => undefined,
  setDefaultMode: () => undefined,
  setFocusTo: () => undefined,
  isVisible: () => false,
};

// The library's `KeyboardAwareScrollViewProps` is an extension of
// ScrollViewProps; on web we just alias it back to the bare prop type.
export type KeyboardAwareScrollViewProps = ScrollViewProps;
