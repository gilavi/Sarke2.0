import { memo } from 'react';
import { StyleSheet, View, type ImageSourcePropType, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
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

const CATEGORY_IMAGE: Record<InspectionCategory, ImageSourcePropType> = {
  xaracho:                        require('../assets/images/ilu/scaffolding.png'),
  mobile_scaffold:                 require('../assets/images/ilu/scaffolding.png'),
  mobile_scaffold_n3:              require('../assets/images/ilu/scaffolding.png'),
  harness:                        require('../assets/images/ilu/harness.png'),
  bobcat:                         require('../assets/images/ilu/bulldozer-sm.png'),
  excavator:                      require('../assets/images/ilu/excavator.png'),
  general_equipment:               require('../assets/images/ilu/clamp.png'),
  cargo_platform:                  require('../assets/images/ilu/cargo.png'),
  safety_net_inspection:           require('../assets/images/ilu/safety-net.png'),
  mobile_ladder_inspection:        require('../assets/images/ilu/mobile-staircase.png'),
  fall_protection_inspection:      require('../assets/images/ilu/harness.png'),
  lifting_accessories_inspection:  require('../assets/images/ilu/crane.png'),
  forklift_inspection:             require('../assets/images/ilu/forklift.png'),
};

const FALLBACK_IMAGE: ImageSourcePropType = require('../assets/images/ilu/clamp.png');

interface Props {
  category: string | null | undefined;
  size?: number;
  /** Show a status icon badge in the bottom-right corner */
  status?: InspectionStatus | null;
  style?: ViewStyle;
  circle?: boolean;
  muted?: boolean;
  /** Drop the tinted bubble and render the illustration alone on a near-full
   *  box (the card/panel supplies the surface). Used by the template grid. */
  transparent?: boolean;
}

export const InspectionTypeAvatar = memo(function InspectionTypeAvatar({
  category,
  size = 44,
  status,
  style,
  circle = false,
  muted = false,
  transparent = false,
}: Props) {
  const { theme } = useTheme();
  const source =
    category && category in CATEGORY_IMAGE
      ? CATEGORY_IMAGE[category as InspectionCategory]
      : FALLBACK_IMAGE;
  const bg = transparent ? 'transparent' : muted ? theme.colors.subtleSurface : theme.colors.accentSoft;
  const radius = circle ? size / 2 : 10;
  // The normalized art already carries a ~6% transparent margin, so the
  // bubble-less variant can fill the box; the bubbled variant insets to 78%.
  const imgSize = transparent ? size : Math.round(size * 0.78);

  return (
    <View style={[{ width: size, height: size }, style]}>
      <View
        style={[
          styles.bubble,
          {
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: bg,
          },
        ]}
      >
        <Image
          source={source}
          style={{ width: imgSize, height: imgSize }}
          contentFit="contain"
          // Keep the decoded bitmap in expo-image's in-memory + disk cache so the
          // illustration decodes once and is reused instantly across every screen
          // that shows it (list rows, pickers, calendar). Plain RN <Image> re-decoded
          // these ~1MB-in-memory PNGs on each screen, which was the slowness.
          cachePolicy="memory-disk"
          // Bundled static asset — no fade needed; show immediately once decoded.
          transition={0}
          recyclingKey={typeof source === 'number' ? String(source) : undefined}
        />
      </View>

      {status != null && <StatusBadge status={status} />}
    </View>
  );
});

const styles = StyleSheet.create({
  bubble: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
