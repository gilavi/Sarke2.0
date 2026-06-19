import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ReportSlideCard, SLIDE_CARD_HEIGHT } from './ReportSlideCard';
import type { ReportSlide } from '../../types/models';

/**
 * Drag-to-reorder list for report slides. Replaces the old up/down chevrons:
 * long-press a card to pick it up, drag vertically to resequence, release to
 * commit. Built directly on react-native-gesture-handler + reanimated (v4) —
 * no draggable-list dependency — so it ships over-the-air with no native build.
 *
 * Relies on a fixed row height (`SLIDE_CARD_HEIGHT`) for the position math; the
 * card enforces that height. Each card keeps its own tap (open) + swipe (delete)
 * gestures; the drag only activates after a long press so casual taps/swipes are
 * unaffected.
 */

const GAP = 12;
const SLOT = SLIDE_CARD_HEIGHT + GAP;
const SPRING = { damping: 22, stiffness: 220, mass: 0.6 };

function clampWorklet(v: number, min: number, max: number) {
  'worklet';
  return Math.max(min, Math.min(v, max));
}

/**
 * Move the entry at position `from` to position `to`, shifting everything in
 * between by one (proper reinsertion, not a direct swap — so a fast multi-slot
 * drag doesn't leave intermediate cards stranded).
 */
function moveSlot(obj: Record<string, number>, from: number, to: number) {
  'worklet';
  const next: Record<string, number> = {};
  for (const sid in obj) {
    const p = obj[sid];
    if (p === from) next[sid] = to;
    else if (from < to && p > from && p <= to) next[sid] = p - 1;
    else if (from > to && p >= to && p < from) next[sid] = p + 1;
    else next[sid] = p;
  }
  return next;
}

interface Props {
  slides: ReportSlide[];
  onPress: (slide: ReportSlide) => void;
  onDelete: (slide: ReportSlide) => void;
  /** Called with the new slide-id order once a drag settles. */
  onReorder: (orderedIds: string[]) => void;
}

export function SlideReorderList({ slides, onPress, onDelete, onReorder }: Props) {
  const positions = useSharedValue<Record<string, number>>(
    Object.fromEntries(slides.map((s, i) => [s.id, i])),
  );
  const activeKey = useSharedValue<string | null>(null);

  // Re-sync positions whenever the SET of ids changes (add / delete / external
  // reorder). Keyed on the id signature so a drag that reorders the SAME ids
  // doesn't clobber the in-flight shared value mid-gesture.
  const signature = slides.map((s) => s.id).join('|');
  useEffect(() => {
    positions.value = Object.fromEntries(slides.map((s, i) => [s.id, i]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const commit = () => {
    const pos = positions.value;
    const ordered = Object.keys(pos).sort((a, b) => pos[a] - pos[b]);
    onReorder(ordered);
  };

  return (
    <View style={{ height: Math.max(0, slides.length * SLOT - GAP) }}>
      {slides.map((slide, i) => (
        <DraggableRow
          key={slide.id}
          id={slide.id}
          index={i}
          count={slides.length}
          positions={positions}
          activeKey={activeKey}
          onCommit={commit}
        >
          {(dragging) => (
            <ReportSlideCard
              slide={slide}
              index={i}
              dragging={dragging}
              onPress={() => onPress(slide)}
              onDelete={() => onDelete(slide)}
            />
          )}
        </DraggableRow>
      ))}
    </View>
  );
}

function DraggableRow({
  id,
  index,
  count,
  positions,
  activeKey,
  onCommit,
  children,
}: {
  id: string;
  index: number;
  count: number;
  positions: SharedValue<Record<string, number>>;
  activeKey: SharedValue<string | null>;
  onCommit: () => void;
  children: (dragging: boolean) => React.ReactNode;
}) {
  const [dragging, setDragging] = useState(false);
  // Initialise from the render index, NOT positions.value — on add, this row
  // mounts during render before the positions re-sync effect runs, so
  // positions.value[id] would be undefined and the card would fly in from top:0.
  const top = useSharedValue(index * SLOT);
  const startTop = useSharedValue(0);

  // Non-active rows follow their slot in `positions`; the active row is driven
  // directly by the finger (below), so it ignores this reaction.
  useAnimatedReaction(
    () => positions.value[id],
    (pos) => {
      if (pos == null) return;
      if (activeKey.value !== id) {
        top.value = withSpring(pos * SLOT, SPRING);
      }
    },
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(220)
        .onStart(() => {
          activeKey.value = id;
          startTop.value = (positions.value[id] ?? 0) * SLOT;
          runOnJS(setDragging)(true);
        })
        .onUpdate((e) => {
          // Follow the finger from the pick-up point — independent of slot swaps.
          top.value = startTop.value + e.translationY;
          const newIndex = clampWorklet(Math.round(top.value / SLOT), 0, count - 1);
          const curIndex = positions.value[id];
          if (curIndex != null && newIndex !== curIndex) {
            positions.value = moveSlot(positions.value, curIndex, newIndex);
          }
        })
        // Settle in onFinalize (not onEnd) so the card always returns to its slot
        // even when the gesture is cancelled/fails mid-drag (ScrollView/Swipeable
        // steal, app backgrounding) — onEnd only fires on a clean END.
        .onFinalize(() => {
          if (activeKey.value === id) {
            activeKey.value = null;
            top.value = withSpring((positions.value[id] ?? 0) * SLOT, SPRING);
            runOnJS(setDragging)(false);
            runOnJS(onCommit)();
          }
        }),
    // onCommit is stale-safe: it reads live positions.value and maps by id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, count],
  );

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    right: 0,
    top: top.value,
    zIndex: activeKey.value === id ? 10 : 0,
    transform: [{ scale: withSpring(activeKey.value === id ? 1.03 : 1, SPRING) }],
  }));

  return (
    <Animated.View style={style}>
      <GestureDetector gesture={pan}>
        <Animated.View>{children(dragging)}</Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}
