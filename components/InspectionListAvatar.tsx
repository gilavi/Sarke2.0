import { memo } from 'react';
import type { ViewStyle } from 'react-native';
import { InspectionTypeAvatar } from './InspectionTypeAvatar';
import type { InspectionStatus } from './StatusBadge';

interface Props {
  category: string | null | undefined;
  size?: number;
  status?: InspectionStatus | null;
  style?: ViewStyle;
}

/** Gray circle avatar for use in list rows across the app. */
export const InspectionListAvatar = memo(function InspectionListAvatar({
  category,
  size = 44,
  status,
  style,
}: Props) {
  return (
    <InspectionTypeAvatar
      category={category}
      size={size}
      status={status}
      circle
      muted
      style={style}
    />
  );
});
