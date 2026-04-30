// Bottom action sheet — unified component for menus AND form sheets.
//
// Behaviors (all sheets):
// - Spring-up + scale entrance with haptic
// - Backdrop tap → cancel
// - Swipe-down on body → cancel
// - Scroll-down at top of BottomSheetScrollView → cancel

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  KeyboardEvent,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  NativeGesture,
} from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { haptic } from '../lib/haptics';
import { a11y } from '../lib/accessibility';
import { useTheme } from '../lib/ThemeContext';

export interface BottomSheetOptions {
  title?: string;
  /** Menu options. Ignored if `content` is provided. */
  options?: string[];
  cancelButtonIndex?: number;
  destructiveButtonIndex?: number;
  /** Index of the pre-selected option (shows selection circle + checkmark). */
  selectedOptionIndex?: number;
  /** Custom body content (form sheets). When set, replaces the options list. */
  content?: ReactNode | ((api: { dismiss: () => void }) => ReactNode);
  /** Disable backdrop / swipe / scroll dismiss. Default true. */
  dismissable?: boolean;
}

export type ShowBottomSheet = (
  options: BottomSheetOptions,
  callback?: (index: number | undefined) => void,
) => { dismiss: () => void };

const Ctx = createContext<ShowBottomSheet | null>(null);

export function useBottomSheet(): ShowBottomSheet {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useBottomSheet must be used inside BottomSheetProvider');
  return ctx;
}

// Internal context for BottomSheetScrollView to register itself with the
// active sheet (so scroll-down-at-top dismisses).
interface ScrollCtx {
  setScrollAtTop: (v: boolean) => void;
  registerNative: (g: NativeGesture | null) => void;
}
const ScrollSheetCtx = createContext<ScrollCtx | null>(null);

interface SheetState {
  options: BottomSheetOptions;
}

export function BottomSheetProvider({ children }: { children: ReactNode }) {
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const callbackRef = useRef<((idx: number | undefined) => void) | null>(null);
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);

  const backdropProgress = useRef(new Animated.Value(0)).current;
  const sheetProgress = useRef(new Animated.Value(0)).current;
  // Drag offset in pixels (added on top of the spring-driven slide).
  const dragY = useRef(new Animated.Value(0)).current;
  // Keyboard height — animates the sheet upward when the keyboard shows so
  // text fields inside `content` aren't covered. RN's <Modal> does not
  // auto-resize for the keyboard on iOS, so we lift the sheet manually.
  const keyboardOffset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (e: KeyboardEvent) => {
      Animated.timing(keyboardOffset, {
        toValue: e.endCoordinates.height,
        duration: e.duration ?? 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    };
    const onHide = (e: KeyboardEvent) => {
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: e.duration ?? 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    };
    const subShow = Keyboard.addListener(showEvt, onShow);
    const subHide = Keyboard.addListener(hideEvt, onHide);
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [keyboardOffset]);

  const scrollAtTopRef = useRef(true);
  const nativeGestureRef = useRef<NativeGesture | null>(null);
  const [nativeGestureVersion, setNativeGestureVersion] = useState(0);

  useEffect(() => {
    if (sheet) {
      dragY.setValue(0);
      Animated.timing(backdropProgress, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
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
  }, [sheet, backdropProgress, sheetProgress, dragY]);

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

  const cancelIndex = sheet?.options.cancelButtonIndex;
  const dismissable = sheet?.options.dismissable !== false;

  const show: ShowBottomSheet = useCallback(
    (options, callback) => {
      const prev = callbackRef.current;
      callbackRef.current = callback ?? null;
      backdropProgress.setValue(0);
      sheetProgress.setValue(0);
      dragY.setValue(0);
      setSheet({ options });
      prev?.(undefined);
      return {
        dismiss: () => dismiss(options.cancelButtonIndex),
      };
    },
    [backdropProgress, sheetProgress, dragY, dismiss],
  );

  const baseTranslateY = sheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [360, 0],
  });
  const translateY = Animated.add(
    Animated.add(
      baseTranslateY,
      dragY.interpolate({
        inputRange: [0, 1000],
        outputRange: [0, 1000],
        extrapolateLeft: 'clamp',
      }),
    ),
    // Negative shift lifts the sheet above the keyboard. The wrapper already
    // pads by `insets.bottom`, so only lift by the amount the keyboard
    // exceeds that inset.
    Animated.multiply(
      keyboardOffset.interpolate({
        inputRange: [0, insets.bottom, 10000],
        outputRange: [0, 0, 10000 - insets.bottom],
        extrapolate: 'clamp',
      }),
      -1,
    ),
  );
  const sheetScale = sheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1],
  });
  const backdropOpacity = backdropProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const setDragY = useCallback((value: number) => dragY.setValue(value), [dragY]);
  const springDragYBack = useCallback(() => {
    Animated.spring(dragY, {
      toValue: 0,
      damping: 18,
      stiffness: 260,
      mass: 0.7,
      useNativeDriver: true,
    }).start();
  }, [dragY]);

  const panGesture = useMemo(() => {
    const pan = Gesture.Pan()
      .enabled(dismissable)
      .activeOffsetY(10)
      .failOffsetY(-12)
      .onUpdate(e => {
        'worklet';
        // Only allow downward drag from the top of any inner scroll view.
        if (!scrollAtTopRef.current) return;
        const ty = Math.max(0, e.translationY);
        runOnJS(setDragY)(ty);
      })
      .onEnd(e => {
        'worklet';
        const shouldDismiss = e.translationY > 80 || e.velocityY > 600;
        if (shouldDismiss) {
          runOnJS(dismiss)(cancelIndex);
        } else {
          runOnJS(springDragYBack)();
        }
      });
    if (nativeGestureRef.current) {
      return Gesture.Simultaneous(pan, nativeGestureRef.current);
    }
    return pan;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dismissable, cancelIndex, dismiss, nativeGestureVersion, setDragY, springDragYBack]);

  const scrollCtx = useMemo<ScrollCtx>(
    () => ({
      setScrollAtTop: v => {
        scrollAtTopRef.current = v;
      },
      registerNative: g => {
        nativeGestureRef.current = g;
        setNativeGestureVersion(v => v + 1);
      },
    }),
    [],
  );

  const renderBody = () => {
    if (!sheet) return null;
    const { content, options, title, cancelButtonIndex, destructiveButtonIndex, selectedOptionIndex } = sheet.options;
    if (content) {
      return (
        <View style={styles.contentBody}>
          {typeof content === 'function'
            ? content({ dismiss: () => dismiss(cancelButtonIndex) })
            : content}
        </View>
      );
    }

    const hasSelection = selectedOptionIndex != null;
    const visibleOptions =
      options
        ?.map((label, i) => ({ label, originalIndex: i }))
        .filter(item => item.originalIndex !== cancelButtonIndex) ?? [];

    return (
      <>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <View style={styles.optionsContainer}>
          {visibleOptions.map((item, idx) => {
            const isDestructive = item.originalIndex === destructiveButtonIndex;
            const isSelected = hasSelection && item.originalIndex === selectedOptionIndex;
            const isLast = idx === visibleOptions.length - 1;

            return (
              <View key={item.originalIndex}>
                <Pressable
                  onPress={() => {
                    haptic.light();
                    dismiss(item.originalIndex);
                  }}
                  style={({ pressed }) => [
                    styles.optionRow,
                    isSelected && styles.optionRowSelected,
                    pressed && styles.optionRowPressed,
                  ]}
                  {...a11y(
                    item.label,
                    isDestructive ? 'ყურადღება, ეს ქმედება წაშლით დასრულდება' : undefined,
                    'button',
                  )}
                >
                  {/* Selection indicator */}
                  {hasSelection && (
                    <View style={[styles.selectionCircle, isSelected && styles.selectionCircleActive]}>
                      {isSelected && <View style={styles.selectionCircleInner} />}
                    </View>
                  )}

                  {/* Label */}
                  <Text
                    style={[
                      styles.optionText,
                      isDestructive && styles.destructiveText,
                    ]}
                  >
                    {item.label}
                  </Text>

                  {/* Checkmark */}
                  {isSelected && (
                    <Ionicons name="checkmark" size={20} color="#059669" />
                  )}
                </Pressable>
                {!isLast && <View style={styles.divider} />}
              </View>
            );
          })}
        </View>
        {cancelButtonIndex != null && options && (
          <Pressable
            onPress={() => {
              haptic.light();
              dismiss(cancelButtonIndex);
            }}
            style={({ pressed }) => [
              styles.cancelBtn,
              pressed && { opacity: 0.7 },
            ]}
            {...a11y('გაუქმება', 'მოქმედების გაუქმება', 'button')}
          >
            <Text style={styles.cancelBtnText}>გაუქმება</Text>
          </Pressable>
        )}
      </>
    );
  };

  return (
    <Ctx.Provider value={show}>
      <ScrollSheetCtx.Provider value={scrollCtx}>
        {children}
        <Modal
          visible={!!sheet}
          transparent
          animationType="none"
          onRequestClose={() => dismissable && dismiss(cancelIndex)}
          statusBarTranslucent
        >
          <View style={StyleSheet.absoluteFillObject}>
            <Animated.View
              style={[
                StyleSheet.absoluteFillObject,
                styles.backdrop,
                { opacity: backdropOpacity },
              ]}
            >
              <Pressable
                style={StyleSheet.absoluteFillObject}
                onPress={() => dismissable && dismiss(cancelIndex)}
                {...a11y('დახურვა', 'ფონის დაჭერით დახურვა', 'button')}
              />
            </Animated.View>

            <Animated.View
              style={[
                styles.sheetWrapper,
                {
                  transform: [{ translateY }, { scale: sheetScale }],
                },
              ]}
            >
              <GestureDetector gesture={panGesture}>
                <View collapsable={false} style={styles.sheetCard}>
                  <View style={styles.handleBar}>
                    <View style={styles.handle} />
                  </View>
                  {renderBody()}
                  <View style={[staticStyles.sheetSpacer, { height: insets.bottom + 8 }]} />
                </View>
              </GestureDetector>
            </Animated.View>
          </View>
        </Modal>
      </ScrollSheetCtx.Provider>
    </Ctx.Provider>
  );
}

/**
 * ScrollView for use inside a BottomSheet `content`. When scrolled to the
 * top, dragging further down dismisses the sheet (rather than scroll-bounce).
 */
export function BottomSheetScrollView({
  onScroll,
  scrollEventThrottle = 16,
  ...rest
}: ScrollViewProps) {
  const ctx = useContext(ScrollSheetCtx);
  const nativeGesture = useMemo(() => Gesture.Native(), []);

  useEffect(() => {
    ctx?.registerNative(nativeGesture);
    return () => ctx?.registerNative(null);
  }, [ctx, nativeGesture]);

  return (
    <GestureDetector gesture={nativeGesture}>
      <ScrollView
        {...rest}
        bounces={false}
        scrollEventThrottle={scrollEventThrottle}
        onScroll={e => {
          ctx?.setScrollAtTop(e.nativeEvent.contentOffset.y <= 0);
          onScroll?.(e);
        }}
      />
    </GestureDetector>
  );
}

const staticStyles = StyleSheet.create({
  sheetSpacer: { backgroundColor: '#FFFFFF' },
});

const createStyles = (colors: any) => StyleSheet.create({
  backdrop: {
    backgroundColor: colors.overlay,
  },
  sheetWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
    paddingBottom: 8,
  },
  handleBar: {
    alignItems: 'center',
    paddingTop: 12,
    marginBottom: 14,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.inkSoft,
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  optionsContainer: {
    paddingHorizontal: 0,
    paddingBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    gap: 12,
  },
  optionRowSelected: {
    backgroundColor: '#ECFDF5',
    borderLeftWidth: 3,
    borderLeftColor: '#059669',
  },
  optionRowPressed: {
    backgroundColor: '#F9FAFB',
  },
  selectionCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionCircleActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  selectionCircleInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#059669',
  },
  optionText: {
    fontSize: 16,
    color: colors.ink,
    fontWeight: '600',
    flex: 1,
  },
  cancelText: {
    fontWeight: '600',
    color: '#6B7280',
  },
  destructiveText: {
    color: '#DC2626',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 16,
  },
  cancelBtn: {
    marginHorizontal: 16,
    marginTop: 6,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  contentBody: {
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
  },
});
