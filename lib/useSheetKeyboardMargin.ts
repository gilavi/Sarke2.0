import { useEffect, useRef } from 'react';
import { Animated, Easing, Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Animated.Value for the bottom margin of a custom-sheet card so it sits
 * exactly on top of the keyboard. Uses iOS keyboard `e.duration` and the
 * iOS keyboard easing curve so the sheet rides the keyboard 1:1 with no
 * overshoot. `useNativeDriver: false` — `marginBottom` is a layout prop.
 *
 * Subtracts `insets.bottom` so a sheet that already pads for the home
 * indicator doesn't double-lift past it.
 */
export function useSheetKeyboardMargin(): Animated.Value {
  const insets = useSafeAreaInsets();
  const margin = useRef(new Animated.Value(0)).current;
  const insetsBottomRef = useRef(insets.bottom);

  useEffect(() => {
    insetsBottomRef.current = insets.bottom;
  }, [insets.bottom]);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = Keyboard.addListener(showEvt, (e) => {
      const lift = Math.max(0, e.endCoordinates.height - insetsBottomRef.current);
      Animated.timing(margin, {
        toValue: lift,
        duration: e.duration ?? 250,
        easing: Easing.bezier(0.17, 0.59, 0.4, 0.77),
        useNativeDriver: false,
      }).start();
    });

    const onHide = Keyboard.addListener(hideEvt, (e) => {
      Animated.timing(margin, {
        toValue: 0,
        duration: e.duration ?? 250,
        easing: Easing.bezier(0.17, 0.59, 0.4, 0.77),
        useNativeDriver: false,
      }).start();
    });

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  return margin;
}
