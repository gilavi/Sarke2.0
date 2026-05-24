import { ReactNode } from 'react';
import { Text } from 'react-native';
import { useTheme } from '../../lib/theme';

export function Label({ children, style }: { children: ReactNode; style?: any }) {
  const { theme } = useTheme();
  return (
    <Text
      style={[
        {
          fontSize: 11,
          fontWeight: '600',
          color: theme.colors.inkSoft,
          letterSpacing: 0.5,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
