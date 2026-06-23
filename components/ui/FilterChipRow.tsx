import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { useTheme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';

export interface FilterChipItem {
  key: string;
  label: string;
  icon?: LucideIcon;
}

/**
 * Horizontal single-select selector. Exactly one chip is active at a time —
 * there is no "all" affordance unless the caller adds it.
 *
 * - `variant="pill"` (default): accent-filled rounded pills.
 * - `variant="square"`: monochrome rounded-square tabs (ink fill when active) —
 *   used by the History screen, where it's synced to a swipeable pager and
 *   auto-scrolls to keep the active tab in view.
 *
 * Canonical chip selector for the app (promoted from the per-project list
 * screens' inline `FilterChip`).
 */
export function FilterChipRow({
  items,
  activeKey,
  onChange,
  variant = 'pill',
  contentContainerStyle,
}: {
  items: FilterChipItem[];
  activeKey: string;
  onChange: (key: string) => void;
  variant?: 'pill' | 'square';
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  const square = variant === 'square';
  const scrollRef = useRef<ScrollView>(null);
  const layouts = useRef<Record<string, { x: number; width: number }>>({});
  const viewportW = useRef(0);

  // Keep the active chip in view as it changes (e.g. a synced pager swipe).
  useEffect(() => {
    const l = layouts.current[activeKey];
    if (!l || !scrollRef.current) return;
    const target = Math.max(0, l.x - (viewportW.current - l.width) / 2);
    scrollRef.current.scrollTo({ x: target, animated: true });
  }, [activeKey]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      onLayout={(e) => { viewportW.current = e.nativeEvent.layout.width; }}
      contentContainerStyle={[{ flexDirection: 'row', gap: 8 }, contentContainerStyle]}
    >
      {items.map((it) => {
        const active = it.key === activeKey;
        const Icon = it.icon;
        const bg = active
          ? square ? theme.colors.ink : theme.colors.accent
          : theme.colors.subtleSurface;
        const fg = active
          ? square ? theme.colors.background : theme.colors.white
          : theme.colors.inkSoft;
        return (
          <Pressable
            key={it.key}
            onPress={() => onChange(it.key)}
            onLayout={(e: LayoutChangeEvent) => {
              const { x, width } = e.nativeEvent.layout;
              layouts.current[it.key] = { x, width };
            }}
            style={({ pressed }) => [
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 14,
                paddingVertical: square ? 10 : 9,
                borderRadius: square ? 12 : 999,
                backgroundColor: bg,
              },
              pressed && { opacity: 0.7 },
            ]}
            {...a11y(it.label, undefined, 'button', { selected: active })}
          >
            {Icon ? <Icon size={15} color={fg} strokeWidth={1.8} /> : null}
            <Text style={{ fontSize: 13, fontWeight: '600', color: fg }}>{it.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
