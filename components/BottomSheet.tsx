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
import { Ionicons } from '@expo/vector-icons';
import { haptic } from '../lib/haptics';
import { theme } from '../lib/theme';

export interface BottomSheetOptions {
  title?: string;
  /** Menu options. Ignored if `content` is provided. */
  options?: string[];
  cancelButtonIndex?: number;
  destructiveButtonIndex?: number;
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

  const backdropProgress = useRef(new Animated.Value(0)).current;
  const sheetProgress = useRef(new Animated.Value(0)).current;
  // Drag offset in pixels (added on top of the spring-driven slide).
  const dragY = useRef(new Animated.Value(0)).current;

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

  const panGesture = useMemo(() => {
    const pan = Gesture.Pan()
      .enabled(dismissable)
      .activeOffsetY(10)
      .failOffsetY(-12)
      .onUpdate(e => {
        // Only allow downward drag from the top of any inner scroll view.
        if (!scrollAtTopRef.current) return;
        const ty = Math.max(0, e.translationY);
        dragY.setValue(ty);
      })
      .onEnd(e => {
        const shouldDismiss = e.translationY > 80 || e.velocityY > 600;
        if (shouldDismiss) {
          dismiss(cancelIndex);
        } else {
          Animated.spring(dragY, {
            toValue: 0,
            damping: 18,
            stiffness: 260,
            mass: 0.7,
            useNativeDriver: true,
          }).start();
        }
      });
    if (nativeGestureRef.current) {
      return Gesture.Simultaneous(pan, nativeGestureRef.current);
    }
    return pan;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dismissable, cancelIndex, dismiss, nativeGestureVersion]);

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
    const { content, options, title, cancelButtonIndex, destructiveButtonIndex } = sheet.options;
    if (content) {
      return (
        <View style={styles.contentBody}>
          {typeof content === 'function'
            ? content({ dismiss: () => dismiss(cancelButtonIndex) })
            : content}
        </View>
      );
    }
    return (
      <>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <View style={styles.optionsContainer}>
          {options?.map((opt, i) => {
            const isCancel = i === cancelButtonIndex;
            const isDestructive = i === destructiveButtonIndex;
            const isSelected = !isCancel && !isDestructive && i === 0;
            return (
              <Pressable
                key={i}
                onPress={() => {
                  haptic.light();
                  dismiss(i);
                }}
                style={({ pressed }) => [
                  styles.optionCard,
                  isSelected && styles.optionCardSelected,
                  pressed && styles.optionCardPressed,
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.optionText,
                      isCancel && styles.cancelText,
                      isDestructive && styles.destructiveText,
                    ]}
                  >
                    {opt}
                  </Text>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark" size={18} color="#059669" />
                )}
              </Pressable>
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

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheetWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetCard: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
    paddingTop: 10,
    paddingBottom: 44,
  },
  handleBar: {
    alignItems: 'center',
    paddingVertical: 0,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.hairline,
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.ink,
    textAlign: 'left',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  optionsContainer: {
    paddingHorizontal: 12,
    gap: 8,
    paddingBottom: 8,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionCardSelected: {
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
    paddingLeft: 12,
  },
  optionCardPressed: {
    backgroundColor: '#F9FAFB',
  },
  optionText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
  },
  cancelText: {
    fontWeight: '700',
    color: '#6B7280',
  },
  destructiveText: {
    color: '#DC2626',
    fontWeight: '700',
  },
  cancelBtn: {
    marginHorizontal: 12,
    marginTop: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#059669',
  },
  contentBody: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
  },
});
