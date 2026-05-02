import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function BottomSheetKeyboard({ children, footer }: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(translateY, {
        toValue: -(e.endCoordinates.height - insets.bottom),
        duration: Platform.OS === 'ios' ? e.duration : 250,
        useNativeDriver: true,
      }).start();
    });

    const hide = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(translateY, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? e.duration : 250,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, [insets.bottom, translateY]);

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </TouchableWithoutFeedback>

      {footer ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {footer}
        </View>
      ) : null}
    </Animated.View>
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
    paddingTop: 8,
    paddingBottom: 8,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});
