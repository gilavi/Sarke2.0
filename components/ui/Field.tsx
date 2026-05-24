import { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../../lib/theme';
import { Label } from './Label';

interface FieldProps {
  label?: string;
  children: ReactNode;
  required?: boolean;
  error?: string;
}

export function Field({ label, children, required, error }: FieldProps) {
  const { theme } = useTheme();
  return (
    <View style={{ marginBottom: 16 }}>
      {label && (
        <Label>
          {label}
          {required ? ' *' : ''}
        </Label>
      )}
      {children}
      {error && (
        <Text
          style={{
            fontSize: 13,
            color: theme.colors.semantic.danger,
            marginTop: 4,
          }}
        >
          {error}
        </Text>
      )}
    </View>
  );
}
