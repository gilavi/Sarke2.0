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

const CATEGORY_META_LIGHT: Record<
  InspectionCategory,
  { emoji: string; bg: string }
> = {
  xaracho:                { emoji: '🏗️', bg: '#F5EDD8' },
  mobile_scaffold:         { emoji: '🏗️', bg: '#EFF5DD' },
  mobile_scaffold_n3:      { emoji: '🏗️', bg: '#EFF5DD' },
  harness:                { emoji: '🦺', bg: '#E8F0F8' },
  bobcat:                 { emoji: '🚜', bg: '#FEF3C7' },
  excavator:              { emoji: '🚧', bg: '#FEE9D8' },
  general_equipment:      { emoji: '⚙️', bg: '#E1F5EE' },
  cargo_platform:         { emoji: '📦', bg: '#E8F0F8' },
  safety_net_inspection:  { emoji: '🕸️', bg: '#EEF0F8' },
  mobile_ladder_inspection:       { emoji: '🪜', bg: '#F0F5FF' },
  fall_protection_inspection:     { emoji: '🛡️', bg: '#F0F8F0' },
  lifting_accessories_inspection: { emoji: '🔗', bg: '#FFF3E0' },
  forklift_inspection:            { emoji: '🏭', bg: '#FEF3C7' },
};

const CATEGORY_META_DARK: Record<
  InspectionCategory,
  { emoji: string; bg: string }
> = {
  xaracho:                { emoji: '🏗️', bg: '#2E2418' },
  mobile_scaffold:         { emoji: '🏗️', bg: '#1E2818' },
  mobile_scaffold_n3:      { emoji: '🏗️', bg: '#1E2818' },
  harness:                { emoji: '🦺', bg: '#18202E' },
  bobcat:                 { emoji: '🚜', bg: '#2E2410' },
  excavator:              { emoji: '🚧', bg: '#2E1E10' },
  general_equipment:      { emoji: '⚙️', bg: '#102418' },
  cargo_platform:         { emoji: '📦', bg: '#18202E' },
  safety_net_inspection:  { emoji: '🕸️', bg: '#18182E' },
  mobile_ladder_inspection:       { emoji: '🪜', bg: '#182038' },
  fall_protection_inspection:     { emoji: '🛡️', bg: '#102018' },
  lifting_accessories_inspection: { emoji: '🔗', bg: '#2E1A00' },
  forklift_inspection:            { emoji: '🏭', bg: '#2E2410' },
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
  const { isDark } = useTheme();
  const CATEGORY_META = isDark ? CATEGORY_META_DARK : CATEGORY_META_LIGHT;
  const DEFAULT_META = { emoji: '📋', bg: isDark ? '#102418' : '#E1F5EE' };
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
