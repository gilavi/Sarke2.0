import {
  ReactNode,
  RefObject,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type TourStep = {
  targetRef: RefObject<any>;
  title: string;
  body: string;
  position: 'top' | 'bottom';
};

type Props = {
  tourId: string;
  steps: TourStep[];
  children: ReactNode;
};

type Rect = { x: number; y: number; width: number; height: number };

const BRAND = '#1D9E75';
const PADDING = 8;
const TOOLTIP_GAP = 12;
const TOOLTIP_WIDTH = 280;
const SCREEN = Dimensions.get('window');

const storageKey = (tourId: string) => `tour_${tourId}`;

export function TourGuide({ tourId, steps, children }: Props) {
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [tooltipH, setTooltipH] = useState(0);
  const fade = useRef(new Animated.Value(0)).current;

  // Decide whether to show on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(storageKey(tourId));
        if (!cancelled && !seen && steps.length > 0) {
          // small delay so refs have layout
          setTimeout(() => {
            if (!cancelled) setVisible(true);
          }, 350);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tourId, steps.length]);

  // Measure target whenever step changes
  useEffect(() => {
    if (!visible) return;
    const step = steps[index];
    if (!step) return;
    fade.setValue(0);
    setRect(null);
    const ref = step.targetRef.current;
    const tryMeasure = (attempt = 0) => {
      if (!ref || typeof ref.measureInWindow !== 'function') {
        if (attempt < 5) setTimeout(() => tryMeasure(attempt + 1), 80);
        return;
      }
      ref.measureInWindow((x: number, y: number, width: number, height: number) => {
        if (typeof x !== 'number' || width === 0) {
          if (attempt < 5) setTimeout(() => tryMeasure(attempt + 1), 80);
          return;
        }
        setRect({ x, y, width, height });
        Animated.timing(fade, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }).start();
      });
    };
    tryMeasure();
  }, [index, visible, steps, fade]);

  const finish = async () => {
    try {
      await AsyncStorage.setItem(storageKey(tourId), 'done');
    } catch {
      // ignore
    }
    setVisible(false);
    setIndex(0);
  };

  const next = () => {
    if (index >= steps.length - 1) {
      finish();
      return;
    }
    Animated.timing(fade, {
      toValue: 0,
      duration: 140,
      useNativeDriver: true,
    }).start(() => {
      setIndex(i => i + 1);
    });
  };

  const onTooltipLayout = (e: LayoutChangeEvent) => {
    setTooltipH(e.nativeEvent.layout.height);
  };

  const step = steps[index];
  const isLast = index === steps.length - 1;

  // Build cutout via 4 surrounding rectangles so the target shows through
  const renderCutout = () => {
    if (!rect) return null;
    const top = Math.max(rect.y - PADDING, 0);
    const left = Math.max(rect.x - PADDING, 0);
    const w = rect.width + PADDING * 2;
    const h = rect.height + PADDING * 2;
    return (
      <>
        <View style={[styles.dim, { top: 0, left: 0, right: 0, height: top }]} />
        <View
          style={[
            styles.dim,
            { top, left: 0, width: left, height: h },
          ]}
        />
        <View
          style={[
            styles.dim,
            { top, left: left + w, right: 0, height: h },
          ]}
        />
        <View
          style={[
            styles.dim,
            { top: top + h, left: 0, right: 0, bottom: 0 },
          ]}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top,
            left,
            width: w,
            height: h,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: 'rgba(255,255,255,0.85)',
          }}
        />
      </>
    );
  };

  const tooltipPos = (() => {
    if (!rect) return { top: SCREEN.height / 2, left: 20 };
    const wantTop = step?.position === 'top';
    const above = rect.y - TOOLTIP_GAP - tooltipH;
    const below = rect.y + rect.height + TOOLTIP_GAP;
    let top: number;
    if (wantTop && above >= 16) top = above;
    else if (!wantTop && below + tooltipH <= SCREEN.height - 16) top = below;
    else top = above >= 16 ? above : below;
    let left = rect.x + rect.width / 2 - TOOLTIP_WIDTH / 2;
    left = Math.max(16, Math.min(left, SCREEN.width - TOOLTIP_WIDTH - 16));
    return { top, left };
  })();

  return (
    <>
      {children}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={finish}
      >
        <View style={StyleSheet.absoluteFill}>
          {!rect ? (
            <View style={[StyleSheet.absoluteFill, styles.dim]} />
          ) : (
            renderCutout()
          )}

          {step && rect && (
            <Animated.View
              onLayout={onTooltipLayout}
              style={[
                styles.tooltip,
                { top: tooltipPos.top, left: tooltipPos.left, opacity: fade },
              ]}
            >
              <Text style={styles.title}>{step.title}</Text>
              <Text style={styles.body}>{step.body}</Text>
              <View style={styles.row}>
                <Pressable
                  onPress={finish}
                  hitSlop={8}
                  style={({ pressed }) => [styles.ghost, pressed && { opacity: 0.6 }]}
                >
                  <Text style={styles.ghostText}>გამოტოვება</Text>
                </Pressable>
                <Pressable
                  onPress={next}
                  style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
                >
                  <Text style={styles.ctaText}>
                    {isLast ? 'დასრულება ✓' : 'შემდეგი →'}
                  </Text>
                </Pressable>
              </View>
            </Animated.View>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  dim: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  tooltip: {
    position: 'absolute',
    width: TOOLTIP_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: 6,
  },
  body: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ghost: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  ghostText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  cta: {
    backgroundColor: BRAND,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
