// Bottom action sheet - unified component for menus AND form sheets.
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
  Modal,
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
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import { haptic } from '../lib/haptics';
import { a11y } from '../lib/accessibility';
import { useTheme } from '../lib/ThemeContext';
import { useSheetKeyboardMargin } from '../lib/useSheetKeyboardMargin';

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

// Global guard: prevents stacking multiple modals simultaneously, which
// freezes iOS when two RN Modals are mounted at the same time.
let isSheetOpen = false;

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
  // Bottom margin animated to the keyboard frame with the iOS curve so the
  // sheet rides the keyboard 1:1 (no overshoot, no overlap). Layout prop -
  // separate Animated.View wraps the native-driven slide/drag transform.
  const keyboardMargin = useSheetKeyboardMargin();

  // Shared value (not a ref): read inside the pan worklet and written from the
  // scroll handler. A plain ref captured into a worklet then mutated triggers
  // Reanimated's "Tried to modify key `current` of an object already passed to
  // a worklet" warning on every scroll event.
  const scrollAtTop = useSharedValue(true);
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
        // Opening a sheet is a low-stakes "it's here" beat → Light.
        haptic.light();
        isSheetOpen = true;
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
        if (finished) {
          setSheet(null);
          isSheetOpen = false;
          // Fire callback after Modal is fully gone - prevents two Modals
          // being open simultaneously which freezes iOS.
          cb?.(idx);
        }
      });
    },
    [backdropProgress, sheetProgress],
  );

  const cancelIndex = sheet?.options.cancelButtonIndex;
  const dismissable = sheet?.options.dismissable !== false;

  const show: ShowBottomSheet = useCallback(
    (options, callback) => {
      if (isSheetOpen) {
        // iOS freezes when two Modals are open simultaneously - bail out.
        return { dismiss: () => {} };
      }
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
    baseTranslateY,
    dragY.interpolate({
      inputRange: [0, 1000],
      outputRange: [0, 1000],
      extrapolateLeft: 'clamp',
    }),
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
        if (!scrollAtTop.value) return;
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
        scrollAtTop.value = v;
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
      // Custom content (e.g. SheetLayout) manages its own layout - render
      // directly with no wrapper so we don't get competing maxHeight constraints,
      // double rounded corners, or unwanted horizontal padding.
      return typeof content === 'function'
        ? content({ dismiss: () => dismiss(cancelButtonIndex) })
        : content;
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
                    // Destructive rows (delete) get a Heavy tap; the rest Light.
                    haptic[isDestructive ? 'heavy' : 'light']();
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
                    <Check size={20} color={theme.colors.accent} strokeWidth={1.5} />
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
              style={[styles.sheetWrapper, { marginBottom: keyboardMargin }]}
            >
              <Animated.View
                style={{
                  transform: [{ translateY }, { scale: sheetScale }],
                }}
              >
                <GestureDetector gesture={panGesture}>
                  <View collapsable={false} style={styles.sheetCard}>
                    <View style={styles.handleBar}>
                      <View style={styles.handle} />
                    </View>
                    {renderBody()}
                  </View>
                </GestureDetector>
              </Animated.View>
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
    paddingBottom: 0,
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
    backgroundColor: colors.accentSoft,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  optionRowPressed: {
    backgroundColor: colors.surfaceSecondary,
  },
  selectionCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionCircleActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  selectionCircleInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  optionText: {
    fontSize: 16,
    color: colors.ink,
    fontWeight: '600',
    flex: 1,
  },
  cancelText: {
    fontWeight: '600',
    color: colors.inkFaint,
  },
  destructiveText: {
    color: colors.danger,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.hairline,
    marginLeft: 16,
  },
  cancelBtn: {
    marginHorizontal: 16,
    marginTop: 6,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.inkFaint,
  },
  contentBody: {
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
    maxHeight: '70%',
  },
});
