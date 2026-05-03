import React from 'react';
import {
  Keyboard,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

interface Props {
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  /**
   * Extra bottom padding so focused inputs scroll above the keyboard
   * instead of hugging the very bottom. Default 80.
   */
  bottomOffset?: number;
  /**
   * Kept for backward compatibility. Previously used for KeyboardAvoidingView
   * offset; now KeyboardAwareScrollView handles keyboard avoidance directly.
   */
  headerHeight?: number;
}

/**
 * Screen-level keyboard wrapper for forms.
 *
 * Pattern:
 * - `KeyboardAwareScrollView` (from react-native-keyboard-controller)
 *   auto-scrolls focused inputs into view above the soft keyboard.
 * - `flexGrow: 1` on content so a primary action button placed as the LAST
 *   child naturally pushes to the bottom on short forms.
 * - Tapping outside any input dismisses the keyboard.
 *
 * Place the primary action button as the last element inside `children` —
 * there is no separate footer slot.
 */
export function KeyboardSafeArea({
  children,
  contentStyle,
  bottomOffset = 80,
}: Props) {
  return (
    <KeyboardAwareScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      onScrollBeginDrag={Keyboard.dismiss}
      bounces={false}
      showsVerticalScrollIndicator={false}
      bottomOffset={bottomOffset}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
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
