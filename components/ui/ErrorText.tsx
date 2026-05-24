import { ReactNode } from 'react';
import { Text } from 'react-native';
import { useTheme } from '../../lib/theme';

export function ErrorText({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  if (!children) return null;
  return (
    <Text style={{ fontSize: 13, color: theme.colors.semantic.danger }}>{children}</Text>
  );
}
