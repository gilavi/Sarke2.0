import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, type ButtonVariant, type ButtonSize } from './primitives/Button';
import { useTheme } from '../lib/theme';


export interface ButtonGroupItem {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

type ButtonGroupLayout = 'horizontal' | 'vertical';

interface ButtonGroupProps {
  buttons: ButtonGroupItem[];
  layout?: ButtonGroupLayout;
  spacing?: number;
}

export function ButtonGroup({
  buttons,
  layout = 'vertical',
  spacing: spacingProp,
}: ButtonGroupProps) {
  const { theme } = useTheme();
  const spacing = spacingProp ?? theme.space(3);
  if (layout === 'horizontal') {
    return (
      <View style={[styles.container, styles.horizontal, { gap: spacing }]}>
        {buttons.map((btn, idx) => (
          <View key={idx} style={{ flex: 1 }}>
            <Button
              title={btn.label}
              variant={btn.variant || 'secondary'}
              size={btn.size || 'md'}
              onPress={btn.onPress}
              loading={btn.loading}
              disabled={btn.disabled}
            />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.vertical, { gap: spacing }]}>
      {buttons.map((btn, idx) => (
        <Button
          key={idx}
          title={btn.label}
          variant={btn.variant || (idx === buttons.length - 1 ? 'primary' : 'secondary')}
          size={btn.size || 'lg'}
          onPress={btn.onPress}
          loading={btn.loading}
          disabled={btn.disabled}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'stretch',
  },
  horizontal: {
    flexDirection: 'row',
  },
  vertical: {
    flexDirection: 'column',
  },
});
