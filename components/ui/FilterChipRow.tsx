import { Pressable, ScrollView, type StyleProp, type ViewStyle } from 'react-native';
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
 * Horizontal single-select pill row. Exactly one chip is active at a time —
 * there is no "all" affordance unless the caller adds one to `items`.
 *
 * Canonical chip selector for the app. Promoted from the copy-pasted
 * `FilterChip` that used to live inline in the per-project list screens; the
 * History type-filter and any future single-select chip rows reuse this.
 */
export function FilterChipRow({
  items,
  activeKey,
  onChange,
  contentContainerStyle,
}: {
  items: FilterChipItem[];
  activeKey: string;
  onChange: (key: string) => void;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[{ flexDirection: 'row', gap: 8 }, contentContainerStyle]}
    >
      {items.map((it) => {
        const active = it.key === activeKey;
        const Icon = it.icon;
        return (
          <Pressable
            key={it.key}
            onPress={() => onChange(it.key)}
            style={({ pressed }) => [
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 999,
                backgroundColor: active ? theme.colors.accent : theme.colors.subtleSurface,
              },
              pressed && { opacity: 0.7 },
            ]}
            {...a11y(it.label, undefined, 'button', { selected: active })}
          >
            {Icon ? (
              <Icon
                size={15}
                color={active ? theme.colors.white : theme.colors.inkSoft}
                strokeWidth={1.8}
              />
            ) : null}
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: active ? theme.colors.white : theme.colors.inkSoft,
              }}
            >
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
