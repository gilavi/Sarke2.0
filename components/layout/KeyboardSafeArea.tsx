import React from 'react';
import {
  Keyboard,
  ScrollView,
  StyleProp,
  StyleSheet,
  TouchableWithoutFeedback,
  ViewStyle,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  children: React.ReactNode;
  /**
   * Height in points of any custom header rendered ABOVE this wrapper —
   * not the safe-area top inset, which is added automatically. Defaults to 0
   * (no header above). Pass the measured height of your custom header (or
   * the result of `useHeaderHeight()` if you use a stock stack header).
   */
  headerHeight?: number;
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * Screen-level keyboard wrapper for forms.
 *
 * Pattern:
 * - Reanimated `KeyboardAvoidingView` (from react-native-keyboard-controller)
 *   tracks the iOS keyboard frame natively for perfect-sync animation.
 * - Inner `ScrollView` with `flexGrow: 1` so a primary action button placed
 *   as the LAST child of `children` naturally pushes to the bottom on short
 *   forms and stays reachable on long ones.
 * - Tapping outside any input dismisses the keyboard.
 *
 * Place the primary action button as the last element inside `children` —
 * there is no separate footer slot.
 */
export function KeyboardSafeArea({
  children,
  headerHeight = 0,
  contentStyle,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior="padding"
        keyboardVerticalOffset={insets.top + headerHeight}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
});
