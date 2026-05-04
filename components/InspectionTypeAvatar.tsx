import { memo } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { StatusBadge, type InspectionStatus } from './StatusBadge';

export type InspectionCategory =
  | 'xaracho'
  | 'harness'
  | 'bobcat'
  | 'excavator'
  | 'general_equipment';

const CATEGORY_META: Record<
  InspectionCategory,
  { emoji: string; bg: string }
> = {
  xaracho:           { emoji: '🏗️', bg: '#F5EDD8' },
  harness:           { emoji: '🦺', bg: '#E8F0F8' },
  bobcat:            { emoji: '🚜', bg: '#FEF3C7' },
  excavator:         { emoji: '🚧', bg: '#FEE9D8' },
  general_equipment: { emoji: '⚙️', bg: '#E1F5EE' },
};

const DEFAULT_META = { emoji: '📋', bg: '#E1F5EE' };

interface Props {
  category: string | null | undefined;
  size?: number;
  /** Show a status icon badge in the bottom-right corner */
  status?: InspectionStatus | null;
  style?: ViewStyle;
}

export const InspectionTypeAvatar = memo(function InspectionTypeAvatar({
  category,
  size = 44,
  status,
  style,
}: Props) {
  const meta =
    category && category in CATEGORY_META
      ? CATEGORY_META[category as InspectionCategory]
      : DEFAULT_META;

  const fontSize = Math.round(size * 0.48);

  return (
    <View style={[{ width: size, height: size }, style]}>
      <View
        style={[
          styles.bubble,
          {
            width: size,
            height: size,
            borderRadius: 10,
            backgroundColor: meta.bg,
          },
        ]}
      >
        <Text
          style={{ fontSize, lineHeight: size, textAlign: 'center' }}
          allowFontScaling={false}
        >
          {meta.emoji}
        </Text>
      </View>

      {status != null && <StatusBadge status={status} />}
    </View>
  );
});

const styles = StyleSheet.create({
  bubble: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
