import React from 'react';
import { Pressable, PressableProps, Text, View } from 'react-native';
import { a11y } from '../../lib/accessibility';
import { haptic } from '../../lib/haptics';
import { theme } from '../../lib/theme';

interface A11yButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  hint?: string;
  state?: { disabled?: boolean; selected?: boolean; checked?: boolean };
  onPress?: () => void;
}

export function A11yButton({ title, hint, state, onPress, ...rest }: A11yButtonProps) {
  return (
    <Pressable
      {...a11y(title, hint, 'button', state)}
      onPress={() => {
        haptic.light();
        onPress?.();
      }}
      {...rest}
    >
      <View style={{ padding: 12, backgroundColor: theme.colors.accent, borderRadius: 12 }}>
        <Text style={{ color: '#fff', fontWeight: '600' }}>{title}</Text>
      </View>
    </Pressable>
  );
}
