// Bottom action sheet v5 — reliable dark overlay + spring + haptics.
//
// History:
// v1: Reanimated 4 worklets — froze the app.
// v2: Modal's built-in `animationType="slide"` — reliable but stiff.
// v3: RN core Animated with independent values — no freeze, flat gray.
// v4: expo-blur backdrop — looked great but native module often fails.
// v5: Semi-transparent dark overlay (reliable on all devices) + spring.

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptic } from '../lib/haptics';
import { theme } from '../lib/theme';

export interface BottomSheetOptions {
  title?: string;
  options: string[];
  cancelButtonIndex?: number;
  destructiveButtonIndex?: number;
}

export type ShowBottomSheet = (
  options: BottomSheetOptions,
  callback: (index: number | undefined) => void,
) => void;

const Ctx = createContext<ShowBottomSheet | null>(null);

export function useBottomSheet(): ShowBottomSheet {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useBottomSheet must be used inside BottomSheetProvider');
  return ctx;
}

interface SheetState {
  options: BottomSheetOptions;
}

export function BottomSheetProvider({ children }: { children: ReactNode }) {
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const callbackRef = useRef<((idx: number | undefined) => void) | null>(null);
  const insets = useSafeAreaInsets();

  // Separate animated values for backdrop (fade) and sheet (slide).
  const backdropProgress = useRef(new Animated.Value(0)).current;
  const sheetProgress = useRef(new Animated.Value(0)).current;

  // Animate in whenever a sheet appears.
  useEffect(() => {
    if (sheet) {
      // Backdrop fades in with cubic ease — static position
      Animated.timing(backdropProgress, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      // Sheet springs up with bounce — independent motion
      Animated.spring(sheetProgress, {
        toValue: 1,
        damping: 20,
        stiffness: 300,
        mass: 0.8,
        overshootClamping: false,
        useNativeDriver: true,
      }).start(() => {
        haptic.medium();
      });
    }
  }, [sheet, backdropProgress, sheetProgress]);

  const dismiss = useCallback(
    (idx: number | undefined) => {
      const cb = callbackRef.current;
      callbackRef.current = null;
      Animated.parallel([
        Animated.timing(backdropProgress, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sheetProgress, {
          toValue: 0,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setSheet(null);
      });
      cb?.(idx);
    },
    [backdropProgress, sheetProgress],
  );

  const show: ShowBottomSheet = useCallback(
    (options, callback) => {
      const prev = callbackRef.current;
      callbackRef.current = callback;
      backdropProgress.setValue(0);
      sheetProgress.setValue(0);
      setSheet({ options });
      prev?.(undefined);
    },
    [backdropProgress, sheetProgress],
  );

  const translateY = sheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [360, 0],
  });
  const sheetScale = sheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1],
  });
  const backdropOpacity = backdropProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Ctx.Provider value={show}>
      {children}
      <Modal
        visible={!!sheet}
        transparent
        animationType="none"
        onRequestClose={() => dismiss(sheet?.options.cancelButtonIndex)}
        statusBarTranslucent
      >
        <View style={StyleSheet.absoluteFillObject}>
          {/* Dark overlay backdrop — reliable on all devices */}
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              styles.backdrop,
              { opacity: backdropOpacity },
            ]}
          >
            <Pressable
              style={StyleSheet.absoluteFillObject}
              onPress={() => dismiss(sheet?.options.cancelButtonIndex)}
            />
          </Animated.View>

          {/* Sheet slides up + scales independently */}
          <Animated.View
            style={[
              styles.sheetWrapper,
              {
                paddingBottom: insets.bottom + 12,
                transform: [
                  { translateY },
                  { scale: sheetScale },
                ],
              },
            ]}
          >
            <Pressable>
              {/* Drag handle */}
              <View style={styles.handleBar}>
                <View style={styles.handle} />
              </View>

              {sheet?.options.title ? (
                <Text style={styles.title}>{sheet.options.title}</Text>
              ) : null}

              <View style={styles.optionsContainer}>
                {sheet?.options.options.map((opt, i) => {
                  const isCancel = i === sheet.options.cancelButtonIndex;
                  const isDestructive = i === sheet.options.destructiveButtonIndex;
                  return (
                    <Pressable
                      key={i}
                      onPress={() => {
                        haptic.light();
                        dismiss(i);
                      }}
                      style={({ pressed }) => [
                        styles.option,
                        i === 0 && !sheet.options.title && { borderTopWidth: 0 },
                        isCancel && styles.cancelOption,
                        pressed && styles.optionPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          isCancel && styles.cancelText,
                          isDestructive && styles.destructiveText,
                        ]}
                      >
                        {opt}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheetWrapper: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 0,
  },
  handleBar: {
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.inkFaint,
    opacity: 0.35,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.inkSoft,
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.card,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  optionsContainer: {
    backgroundColor: theme.colors.card,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    paddingBottom: 8,
  },
  option: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.hairline,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelOption: {
    marginTop: 6,
    marginHorizontal: 8,
    backgroundColor: theme.colors.subtleSurface,
    borderRadius: 14,
    borderTopWidth: 0,
    paddingVertical: 16,
  },
  optionPressed: {
    opacity: 0.5,
    backgroundColor: theme.colors.subtleSurface,
    borderRadius: 12,
  },
  optionText: {
    fontSize: 16,
    color: theme.colors.ink,
    fontWeight: '500',
  },
  cancelText: {
    fontWeight: '700',
    color: theme.colors.inkSoft,
  },
  destructiveText: {
    color: theme.colors.danger,
    fontWeight: '700',
  },
});
