import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

/**
 * Circular list-row avatar for record types that have no category illustration
 * (reports, orders/brdzaneba, briefings, incidents). Same diameter and circle
 * shape as the inspection avatar (`InspectionListAvatar`) so every list row
 * lines up. A soft-tinted circle with a centered lucide glyph — identity only,
 * never a draft/completed status.
 */
export function RecordAvatar({
  icon: Icon,
  tint,
  bg,
  size = 48,
}: {
  icon: LucideIcon;
  tint: string;
  bg: string;
  size?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon size={Math.round(size * 0.44)} color={tint} strokeWidth={1.5} />
    </View>
  );
}
