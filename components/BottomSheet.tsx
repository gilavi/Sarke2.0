// Bottom action sheet with a smooth RN Animated spring slide-in.
//
// History: the first version used Reanimated 4 worklets and froze the app
// (when a worklet didn't fire, the Modal backdrop stayed full-screen and
// blocked every touch). The second version fell back to the Modal's
// built-in `animationType="slide"` — reliable but stiff. This version uses
// RN's core `Animated` API with `useNativeDriver: true` for a soft spring
// in and quick ease-out on dismiss. Stays on the UI thread without any
// worklet compilation step, so no chance of the old freeze.

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

  // Drives both the card's slide and the backdrop's fade. 0 = hidden,
  // 1 = fully shown. Using one value keeps the two animations in sync.
  const progress = useRef(new Animated.Value(0)).current;

  // Animate in whenever a sheet appears.
  useEffect(() => {
    if (sheet) {
      Animated.spring(progress, {
        toValue: 1,
        damping: 22,
        stiffness: 260,
        mass: 0.9,
        overshootClamping: false,
        useNativeDriver: true,
      }).start();
    }
  }, [sheet, progress]);

  const dismiss = useCallback(
    (idx: number | undefined) => {
      const cb = callbackRef.current;
      callbackRef.current = null;
      // Quick ease-out on the way out; feels less laggy than the in-spring
      // running in reverse.
      Animated.timing(progress, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setSheet(null);
      });
      cb?.(idx);
    },
    [progress],
  );

  const show: ShowBottomSheet = useCallback(
    (options, callback) => {
      const prev = callbackRef.current;
      callbackRef.current = callback;
      // Reset animation state so the re-open spring plays from the bottom.
      progress.setValue(0);
      setSheet({ options });
      prev?.(undefined);
    },
    [progress],
  );

  // Card slides up from ~340px below, backdrop fades 0→1.
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [340, 0],
  });
  const backdropOpacity = progress.interpolate({
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
        <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: backdropOpacity }]}>
          <Pressable
            style={styles.backdrop}
            onPress={() => dismiss(sheet?.options.cancelButtonIndex)}
          >
            <Animated.View
              style={[
                styles.sheet,
                { paddingBottom: insets.bottom + 8, transform: [{ translateY }] },
              ]}
            >
              {/* Inner Pressable stops backdrop tap from propagating through the sheet */}
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
          </Pressable>
        </Animated.View>
      </Modal>
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
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
