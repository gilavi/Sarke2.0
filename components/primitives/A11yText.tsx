import React from 'react';
import { Text, TextProps } from 'react-native';
import { useTheme } from '../../lib/theme';


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
  const { theme } = useTheme();

  const weightMap = {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  };

  // Dynamic Type is applied exactly ONCE, natively: RN multiplies fontSize by
  // the OS fontScale, capped by maxFontSizeMultiplier below. Do NOT pre-scale
  // the size in JS (e.g. via useScaledSize) — that double-applies fontScale.
  return (
    <Text
      style={[
        {
          fontSize: sizeMap[size],
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
