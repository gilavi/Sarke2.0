/**
 * Reusable checklist step for equipment inspection flows. Renders a monochrome
 * legend + a scrollable list of items, each handled by ChecklistRow (which now
 * delegates to the shared ChecklistItemRow). Section headers + scroll only.
 *
 * Exposes an imperative {@link ChecklistStepHandle} so the host route's
 * `onBlockedNext` can call `revealFirstUnanswered()` — the step then scrolls to
 * the first unanswered row, flashes a brief accent highlight on it, shows an
 * error toast and announces the row to screen readers. The highlight overlay
 * lives OUTSIDE the memoized ChecklistRow (on the non-memoized wrapper), so
 * revealing never re-renders the ~24 answer rows.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { A11yText as Text } from '../primitives/A11yText';
import { useTheme } from '../../lib/theme';
import { announce, useAccessibilitySettings } from '../../lib/accessibility';
import { useToast } from '../../lib/toast';
import { useScrollToError } from '../../hooks/useScrollToError';
import { ChecklistLegend } from '../inspection-parts/ChecklistLegend';
import { ChecklistRow, CHECKLIST_LEGEND, type ChecklistItemState } from './ChecklistRow';

// Re-export item types so existing equipment routes don't need to change imports.
export type { ChecklistResult, ChecklistItem, ChecklistItemState } from './ChecklistRow';

export interface ChecklistStepProps {
  items: import('./ChecklistRow').ChecklistItem[];
  states: import('./ChecklistRow').ChecklistItemState[];
  onStateChange: (id: string, patch: Partial<import('./ChecklistRow').ChecklistItemState>) => void;
  showSectionHeaders?: boolean;
  /** Slot for additional content rendered below the list */
  footer?: ReactNode;
  // ── Legacy props (per-row notes/photos removed app-wide). Accepted but ignored. ──
  onPhotoPress?: (id: string) => void;
  showCommentButton?: boolean;
}

/** Imperative API exposed via `ref` — wire to `InspectionShell`'s `onBlockedNext`. */
export interface ChecklistStepHandle {
  /**
   * Guides the user to the first row with no result: scrolls it into view,
   * flashes a brief accent border/tint on it (static when reduce-motion is on),
   * shows the "answer the highlighted item" error toast and announces the row's
   * label for screen readers. Returns `false` (and does nothing) when every
   * row is already answered.
   */
  revealFirstUnanswered: () => boolean;
}

/** How long the accent highlight stays on the revealed row (ms). */
const HIGHLIGHT_HOLD_MS = 1500;

export const ChecklistStep = forwardRef<ChecklistStepHandle, ChecklistStepProps>(function ChecklistStep({
  items,
  states,
  onStateChange,
  showSectionHeaders = false,
  footer,
}, ref) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const toast = useToast();
  const { reduceMotion } = useAccessibilitySettings();
  const { scrollRef, registerField, scrollToFirstError } = useScrollToError();

  // Latest-ref + per-id callback cache: each row gets a referentially stable
  // onStateChange, so the memoized ChecklistRow skips re-rendering untouched
  // rows even when the host passes an inline handler.
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;
  const rowCallbacks = useRef(new Map<string, (patch: Partial<ChecklistItemState>) => void>());
  const callbackFor = useCallback((id: string) => {
    let cb = rowCallbacks.current.get(id);
    if (!cb) {
      cb = patch => onStateChangeRef.current(id, patch);
      rowCallbacks.current.set(id, cb);
    }
    return cb;
  }, []);

  function getState(id: string) {
    return states.find(s => s.id === id) ?? { id, result: null, comment: null, photo_paths: [] };
  }

  // ── Blocked-Next reveal: scroll + brief highlight + toast + a11y announce ──
  // Latest refs so the imperative handle doesn't need items/states in its deps.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const statesRef = useRef(states);
  statesRef.current = states;

  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightOpacity = useRef(new Animated.Value(0)).current;
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (highlightTimer.current) clearTimeout(highlightTimer.current); }, []);

  const revealFirstUnanswered = useCallback((): boolean => {
    const firstUnanswered = itemsRef.current.find(item => {
      const st = statesRef.current.find(s => s.id === item.id);
      return (st?.result ?? null) === null;
    });
    if (!firstUnanswered) return false;

    scrollToFirstError([firstUnanswered.id]);

    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    setHighlightId(firstUnanswered.id);
    if (reduceMotion) {
      highlightOpacity.setValue(1);
    } else {
      highlightOpacity.setValue(0);
      Animated.timing(highlightOpacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    }
    highlightTimer.current = setTimeout(() => {
      highlightTimer.current = null;
      if (reduceMotion) {
        setHighlightId(null);
      } else {
        Animated.timing(highlightOpacity, { toValue: 0, duration: 260, useNativeDriver: true })
          .start(() => setHighlightId(null));
      }
    }, HIGHLIGHT_HOLD_MS);

    const hint = t('inspections.answerHighlightedItem');
    toast.error(hint);
    announce(`${hint}: ${firstUnanswered.description}`);
    return true;
  }, [scrollToFirstError, reduceMotion, highlightOpacity, toast, t]);

  useImperativeHandle(ref, () => ({ revealFirstUnanswered }), [revealFirstUnanswered]);

  let lastSection: string | undefined;

  return (
    <KeyboardAwareScrollView
      ref={scrollRef as never}
      style={{ flex: 1 }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
      bottomOffset={120}
    >
      <View style={styles.legendWrap}>
        <ChecklistLegend items={CHECKLIST_LEGEND} />
      </View>
      {items.map(item => {
        const showHeader = showSectionHeaders && item.section && item.section !== lastSection;
        if (showHeader) lastSection = item.section;
        return (
          <View key={item.id} onLayout={registerField(item.id)}>
            {showHeader ? (
              <Text style={[styles.sectionHeader, { color: theme.colors.inkFaint, borderBottomColor: theme.colors.hairline }]}>
                {item.section}
              </Text>
            ) : null}
            <View>
              <ChecklistRow
                item={item}
                state={getState(item.id)}
                onStateChange={callbackFor(item.id)}
              />
              {highlightId === item.id ? (
                <Animated.View
                  pointerEvents="none"
                  testID="checklist-highlight"
                  style={[
                    styles.highlight,
                    {
                      opacity: highlightOpacity,
                      borderColor: theme.colors.accent,
                      backgroundColor: theme.colors.accent + '14',
                      borderRadius: theme.radius.lg,
                    },
                  ]}
                />
              ) : null}
            </View>
          </View>
        );
      })}
      {footer ?? null}
    </KeyboardAwareScrollView>
  );
});

const styles = StyleSheet.create({
  container:     { flexGrow: 1, paddingTop: 8, paddingBottom: 24, paddingHorizontal: 16, gap: 8 },
  legendWrap:    { paddingBottom: 2 },
  sectionHeader: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, paddingTop: 14, paddingBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  highlight:     { ...StyleSheet.absoluteFillObject, borderWidth: 2 },
});
