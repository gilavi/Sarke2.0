import { ReactNode } from 'react';
import { Text, View } from 'react-native';

interface ChipProps {
  children: ReactNode;
  tint: string;
  bg: string;
}

export function Chip({ children, tint, bg }: ChipProps) {
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: bg,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '600', color: tint }}>{children}</Text>
    </View>
  );
}
