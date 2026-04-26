import React from 'react';
import { Text, TextProps } from 'react-native';
import { useScaledSize } from '../../lib/accessibility';
import { theme } from '../../lib/theme';

interface A11yTextProps extends TextProps {
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  color?: string;
}

const sizeMap = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
};

export function A11yText({ size = 'base', weight = 'normal', color, style, children, ...rest }: A11yTextProps) {
  const scaledSize = useScaledSize(sizeMap[size]);

  const weightMap = {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  };

  return (
    <Text
      style={[
        {
          fontSize: scaledSize,
          fontWeight: weightMap[weight] as any,
          color: color || theme.colors.ink,
          fontFamily: theme.typography.fontFamily.body,
        },
        style,
      ]}
      maxFontSizeMultiplier={1.5}
      {...rest}
    >
      {children}
    </Text>
  );
}
