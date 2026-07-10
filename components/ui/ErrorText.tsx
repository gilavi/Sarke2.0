import { ReactNode } from 'react';
import { A11yText as Text } from '../primitives/A11yText';
import { useTheme } from '../../lib/theme';

export function ErrorText({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  if (!children) return null;
  return (
    <Text style={{ fontSize: 13, color: theme.colors.semantic.danger }}>{children}</Text>
  );
}
