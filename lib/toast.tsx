import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from './theme';

type ToastKind = 'success' | 'error' | 'info';

interface ToastAction {
  label: string;
  onPress: () => void;
}

interface ShowOptions {
  duration?: number;
  action?: ToastAction;
  onHide?: () => void;
}

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  duration: number;
  action?: ToastAction;
  onHide?: () => void;
}

interface ToastCtx {
  show: (msg: string, kind?: ToastKind, opts?: ShowOptions) => void;
  success: (msg: string, opts?: ShowOptions) => void;
  error: (msg: string, opts?: ShowOptions) => void;
  info: (msg: string, opts?: ShowOptions) => void;
  hide: () => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const idRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onHideRef = useRef<(() => void) | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const fireOnHide = () => {
    const cb = onHideRef.current;
    onHideRef.current = null;
    if (cb) cb();
  };

  const hide = useCallback(() => {
    clearTimer();
    const currentId = idRef.current;
    Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setToast(cur => (cur?.id === currentId ? null : cur));
    });
    fireOnHide();
  }, [opacity]);

  const show = useCallback(
    (message: string, kind: ToastKind = 'info', opts: ShowOptions = {}) => {
      // Replacing a live toast: fire its onHide so any pending deferred action executes.
      clearTimer();
      fireOnHide();

      const id = ++idRef.current;
      const duration = opts.duration ?? 2600;
      onHideRef.current = opts.onHide ?? null;
      setToast({ id, kind, message, duration, action: opts.action, onHide: opts.onHide });
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();

      timerRef.current = setTimeout(() => {
        if (idRef.current !== id) return;
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
          setToast(cur => (cur?.id === id ? null : cur));
        });
        fireOnHide();
        timerRef.current = null;
      }, duration);
    },
    [opacity],
  );

  useEffect(() => () => {
    clearTimer();
    fireOnHide();
  }, []);

  const api = useMemo<ToastCtx>(
    () => ({
      show,
      success: (m, o) => show(m, 'success', o),
      error: (m, o) => show(m, 'error', o),
      info: (m, o) => show(m, 'info', o),
      hide,
    }),
    [show, hide],
  );

  const onActionPress = () => {
    if (!toast?.action) return;
    const cb = toast.action.onPress;
    // Prevent onHide from firing when user explicitly handles via action.
    onHideRef.current = null;
    clearTimer();
    Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => {
      setToast(cur => (cur?.id === toast.id ? null : cur));
    });
    cb();
  };

  const visible = !!toast;
  const hasAction = !!toast?.action;

  return (
    <Ctx.Provider value={api}>
      {children}
      {toast ? (
        <Animated.View pointerEvents={hasAction ? 'box-none' : 'none'} style={[styles.wrap, { opacity }]}>
          <View style={[styles.toast, stylesFor(toast.kind).container]}>
            <Ionicons name={iconFor(toast.kind)} size={18} color={stylesFor(toast.kind).iconColor} />
            <Text style={[styles.text, { color: stylesFor(toast.kind).text }]} numberOfLines={3}>
              {toast.message}
            </Text>
            {toast.action ? (
              <Pressable
                onPress={onActionPress}
                accessibilityRole="button"
                accessibilityLabel={toast.action.label}
                hitSlop={8}
                style={({ pressed }) => [styles.action, pressed && { opacity: 0.7 }]}
              >
                <Text style={[styles.actionText, { color: stylesFor(toast.kind).text }]}>
                  {toast.action.label}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      ) : null}
      {visible && !hasAction ? null : null}
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
  action: {
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
