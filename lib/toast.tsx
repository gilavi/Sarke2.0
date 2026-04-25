import { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from './theme';

type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

type InfoOpts = {
  duration?: number;
  action?: { label: string; onPress: () => void };
  onHide?: () => void;
};

interface ToastCtx {
  show: (msg: string, kind?: ToastKind) => void;
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string, opts?: InfoOpts) => void;
  hide: () => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const idRef = useRef(0);

  const hideRef = useRef<(() => void) | null>(null);

  const hide = useCallback(() => {
    hideRef.current?.();
  }, []);

  const show = useCallback((message: string, kind: ToastKind = 'info', opts?: InfoOpts) => {
    const id = ++idRef.current;
    setToast({ id, kind, message });
    Animated.timing(opacity, { toValue: 1, duration: 180, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
    const holdMs = opts?.duration ?? 2600;
    const timer = setTimeout(() => {
      if (idRef.current !== id) return;
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
        setToast(cur => (cur?.id === id ? null : cur));
        opts?.onHide?.();
      });
    }, holdMs);
    hideRef.current = () => {
      clearTimeout(timer);
      idRef.current++;
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
        setToast(null);
      });
      hideRef.current = null;
    };
  }, [opacity]);

  const api = useMemo<ToastCtx>(
    () => ({
      show,
      success: m => show(m, 'success'),
      error: m => show(m, 'error'),
      info: (m, opts) => show(m, 'info', opts),
      hide,
    }),
    [show, hide],
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      {toast ? (
        <Animated.View pointerEvents="none" style={[styles.wrap, { opacity }]}>
          <View style={[styles.toast, stylesFor(toast.kind).container]}>
            <Ionicons name={iconFor(toast.kind)} size={18} color={stylesFor(toast.kind).iconColor} />
            <Text style={[styles.text, { color: stylesFor(toast.kind).text }]} numberOfLines={3}>
              {toast.message}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}

function iconFor(kind: ToastKind): any {
  return kind === 'success' ? 'checkmark-circle' : kind === 'error' ? 'alert-circle' : 'information-circle';
}

function stylesFor(kind: ToastKind) {
  switch (kind) {
    case 'success':
      return {
        container: { backgroundColor: theme.colors.accent },
        iconColor: theme.colors.white,
        text: theme.colors.white,
      };
    case 'error':
      return {
        container: { backgroundColor: theme.colors.danger },
        iconColor: theme.colors.white,
        text: theme.colors.white,
      };
    default:
      return {
        container: { backgroundColor: theme.colors.ink },
        iconColor: theme.colors.white,
        text: theme.colors.white,
      };
  }
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 30,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    maxWidth: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  text: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
});
