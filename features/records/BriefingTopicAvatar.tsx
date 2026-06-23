import { useMemo } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../lib/theme';
import { briefingTopicIcons } from './topics';

/**
 * Circular briefing avatar showing the topic icon(s). One topic → a single
 * centered glyph; multiple → a tight row of the distinct topic icons (stacked
 * inside the same circle), so the avatar reflects what the briefing covers.
 */
export function BriefingTopicAvatar({ topics, size = 48 }: { topics: string[]; size?: number }) {
  const { theme } = useTheme();
  const icons = useMemo(() => briefingTopicIcons(topics, 3), [topics]);
  const single = icons.length === 1;
  const glyph = single ? Math.round(size * 0.42) : Math.round(size * 0.3);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.colors.harnessSoft,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 1,
      }}
    >
      {icons.map((Icon, i) => (
        <Icon key={i} size={glyph} color={theme.colors.harnessTint} strokeWidth={1.8} />
      ))}
    </View>
  );
}
