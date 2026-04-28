import React, {ReactNode, useMemo} from 'react';
import { StyleSheet, View } from 'react-native';
import { A11yText } from './primitives/A11yText';
import { useTheme } from '../lib/theme';


interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  helper?: string;
  children: ReactNode;
}

export function FormField({
  label,
  required = false,
  error,
  helper,
  children,
}: FormFieldProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <A11yText
          size="sm"
          weight="semibold"
          color={theme.colors.ink}
        >
          {label}
        </A11yText>
        {required && (
          <A11yText
            size="sm"
            weight="semibold"
            color={theme.colors.danger}
            style={styles.requiredIndicator}
          >
            *
          </A11yText>
        )}
      </View>

      {children}

      {error ? (
        <A11yText
          size="xs"
          weight="normal"
          color={theme.colors.danger}
          style={styles.errorText}
        >
          {error}
        </A11yText>
      ) : helper ? (
        <A11yText
          size="xs"
          weight="normal"
          color={theme.colors.inkSoft}
          style={styles.helperText}
        >
          {helper}
        </A11yText>
      ) : null}
    </View>
  );
}

function getstyles(theme: any) {
  return StyleSheet.create({
  container: {
    gap: theme.space(2),
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requiredIndicator: {
    marginLeft: 2,
  },
  errorText: {
    marginTop: theme.space(1),
  },
  helperText: {
    marginTop: theme.space(1),
  },
});
}
