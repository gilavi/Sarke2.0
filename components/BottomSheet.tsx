// Bottom action sheet with a smooth RN Animated spring slide-in.
//
// History: the first version used Reanimated 4 worklets and froze the app
// (when a worklet didn't fire, the Modal backdrop stayed full-screen and
// blocked every touch). The second version fell back to the Modal's
// built-in `animationType="slide"` — reliable but stiff. This version uses
// RN's core `Animated` API with `useNativeDriver: true` for a soft spring
// in and quick ease-out on dismiss. Stays on the UI thread without any
// worklet compilation step, so no chance of the old freeze.
//
// v3: backdrop and sheet are now fully independent — backdrop fades in-place
// while the sheet slides up. No more "whole thing pops from bottom" feel.

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
  // This prevents the "whole modal pops from bottom" visual bug.
  const backdropProgress = useRef(new Animated.Value(0)).current;
  const sheetProgress = useRef(new Animated.Value(0)).current;

  // Animate in whenever a sheet appears.
  useEffect(() => {
    if (sheet) {
      // Backdrop fades in with a gentle ease — static position
      Animated.timing(backdropProgress, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      // Sheet springs up from below — independent motion
      Animated.spring(sheetProgress, {
        toValue: 1,
        damping: 24,
        stiffness: 280,
        mass: 0.85,
        overshootClamping: false,
        useNativeDriver: true,
      }).start();
    }
  }, [sheet, backdropProgress, sheetProgress]);

  const dismiss = useCallback(
    (idx: number | undefined) => {
      const cb = callbackRef.current;
      callbackRef.current = null;
      // Quick coordinated exit — backdrop fades, sheet drops
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
      // Reset both animations so the open plays from hidden state.
      backdropProgress.setValue(0);
      sheetProgress.setValue(0);
      setSheet({ options });
      prev?.(undefined);
    },
    [backdropProgress, sheetProgress],
  );

  // Sheet slides up from 320px below its final position
  const translateY = sheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [320, 0],
  });
  // Backdrop simply fades — no movement
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
      >
        <View style={StyleSheet.absoluteFillObject}>
          {/* Backdrop: fades in place, catches taps outside the sheet */}
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              { opacity: backdropOpacity },
            ]}
            pointerEvents="box-none"
          >
            <Pressable
              style={styles.backdrop}
              onPress={() => dismiss(sheet?.options.cancelButtonIndex)}
            />
          </Animated.View>

          {/* Sheet: slides up independently */}
          <Animated.View
            style={[
              styles.sheetWrapper,
              { paddingBottom: insets.bottom + 8, transform: [{ translateY }] },
            ]}
          >
            <Pressable>
              {sheet?.options.title ? (
                <Text style={styles.title}>{sheet.options.title}</Text>
              ) : (
                <View style={styles.handle} />
              )}
              {sheet?.options.options.map((opt, i) => {
                const isCancel = i === sheet.options.cancelButtonIndex;
                const isDestructive = i === sheet.options.destructiveButtonIndex;
                return (
                  <Pressable
                    key={i}
                    onPress={() => dismiss(i)}
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
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 6,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.hairline,
    alignSelf: 'center',
    marginVertical: 10,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.inkFaint,
    textAlign: 'center',
    paddingVertical: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  option: {
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.hairline,
    alignItems: 'center',
  },
  cancelOption: {
    marginTop: 8,
    marginHorizontal: 0,
    backgroundColor: theme.colors.subtleSurface,
    borderRadius: 14,
    borderTopWidth: 0,
    paddingVertical: 16,
  },
  optionPressed: {
    opacity: 0.55,
  },
  optionText: {
    fontSize: 16,
    color: theme.colors.ink,
    fontWeight: '500',
  },
  cancelText: {
    fontWeight: '600',
    color: theme.colors.inkSoft,
  },
  destructiveText: {
    color: theme.colors.danger,
    fontWeight: '600',
  },
});
