import { memo } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { StatusBadge, type InspectionStatus } from './StatusBadge';
import { useTheme } from '../lib/theme';

export type InspectionCategory =
  | 'xaracho'
  | 'mobile_scaffold'
  | 'mobile_scaffold_n3'
  | 'harness'
  | 'bobcat'
  | 'excavator'
  | 'general_equipment'
  | 'cargo_platform'
  | 'safety_net_inspection'
  | 'mobile_ladder_inspection'
  | 'fall_protection_inspection'
  | 'lifting_accessories_inspection'
  | 'forklift_inspection';

// Monochrome: every category shares the primary brand wash as its tile
// background (the emoji carries the recognition). The old per-type pastel
// palette mixed greens/blues/ambers that read as off-brand after the rebrand.
const CATEGORY_EMOJI: Record<InspectionCategory, string> = {
  xaracho:                '🏗️',
  mobile_scaffold:         '🏗️',
  mobile_scaffold_n3:      '🏗️',
  harness:                '🦺',
  bobcat:                 '🚜',
  excavator:              '🚧',
  general_equipment:      '⚙️',
  cargo_platform:         '📦',
  safety_net_inspection:  '🕸️',
  mobile_ladder_inspection:       '🪜',
  fall_protection_inspection:     '🛡️',
  lifting_accessories_inspection: '🔗',
  forklift_inspection:            '🏭',
};

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
  const { theme } = useTheme();
  const emoji =
    category && category in CATEGORY_EMOJI
      ? CATEGORY_EMOJI[category as InspectionCategory]
      : '📋';
  const bg = theme.colors.accentSoft;

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
            backgroundColor: bg,
          },
        ]}
      >
        <Text
          style={{ fontSize, lineHeight: size, textAlign: 'center' }}
          allowFontScaling={false}
        >
          {emoji}
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
