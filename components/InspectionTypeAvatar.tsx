import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type InspectionCategory =
  | 'xaracho'
  | 'harness'
  | 'bobcat'
  | 'excavator'
  | 'general_equipment';

const CATEGORY_META: Record<
  InspectionCategory,
  { emoji: string; bg: string; shadow: string }
> = {
  xaracho:           { emoji: '🏗️', bg: '#DBEAFE', shadow: '#93C5FD' },
  harness:           { emoji: '🦺', bg: '#FEF3C7', shadow: '#FCD34D' },
  bobcat:            { emoji: '🚜', bg: '#D1FAE5', shadow: '#6EE7B7' },
  excavator:         { emoji: '🚧', bg: '#FEE2E2', shadow: '#FCA5A5' },
  general_equipment: { emoji: '⚙️', bg: '#EDE9FE', shadow: '#C4B5FD' },
};

const DEFAULT_META = { emoji: '📋', bg: '#F3F4F6', shadow: '#D1D5DB' };

interface Props {
  category: string | null | undefined;
  size?: number;
  /** Show a status dot in the bottom-right corner */
  status?: 'draft' | 'completed' | null;
}

export const InspectionTypeAvatar = memo(function InspectionTypeAvatar({
  category,
  size = 44,
  status,
}: Props) {
  const meta =
    category && category in CATEGORY_META
      ? CATEGORY_META[category as InspectionCategory]
      : DEFAULT_META;

  const fontSize = Math.round(size * 0.48);
  const dotSize = Math.round(size * 0.34);

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.bubble,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: meta.bg,
            shadowColor: meta.shadow,
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

      {status != null && (
        <View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              bottom: -1,
              right: -1,
              backgroundColor: status === 'completed' ? '#10B981' : '#F59E0B',
              borderWidth: Math.max(1, Math.round(size * 0.04)),
            },
          ]}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  bubble: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  dot: {
    position: 'absolute',
    borderColor: '#FFFFFF',
  },
});
