import React from 'react';
import { PressableProps } from 'react-native';
import { a11y } from '../../lib/accessibility';
import { haptic } from '../../lib/haptics';
import { Button } from './Button';

interface A11yButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  hint?: string;
  state?: { disabled?: boolean; selected?: boolean; checked?: boolean };
  onPress?: () => void;
}

export function A11yButton({ title, hint, state, onPress, ...rest }: A11yButtonProps) {
  return (
    <Button
      title={title}
      variant="primary"
      onPress={() => {
        haptic.light();
        onPress?.();
      }}
      {...(a11y(title, hint, 'button', state) as any)}
    />
  );
}
