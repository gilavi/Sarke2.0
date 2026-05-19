import { Button as MantineButton, type ButtonProps as MantineButtonProps } from '@mantine/core';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';

type Variant = 'default' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'link' | 'destructive';
type Size = 'sm' | 'md' | 'default' | 'lg' | 'icon';

// Extend both MantineButtonProps (for Mantine-specific props) and native button attrs
// so that `onClick`, `type`, `disabled`, `form`, etc. all pass through correctly.
export interface ButtonProps
  extends Omit<MantineButtonProps, 'variant' | 'size'>,
    Omit<ComponentPropsWithoutRef<'button'>, keyof Omit<MantineButtonProps, 'variant' | 'size'>> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

const variantMap: Record<Variant, MantineButtonProps['variant']> = {
  default: 'filled',
  secondary: 'light',
  ghost: 'subtle',
  outline: 'outline',
  danger: 'filled',
  link: 'transparent',
  destructive: 'filled',
};

const sizeMap: Record<string, MantineButtonProps['size']> = {
  sm: 'sm',
  md: 'md',
  default: 'md',
  lg: 'lg',
  icon: 'md',
};

// Re-export buttonVariants stub for any importer that uses it
export const buttonVariants = (_opts?: { variant?: Variant; size?: Size }) => '';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'default', color, className, asChild: _asChild, ...props }, ref) => {
    const isDanger = variant === 'danger' || variant === 'destructive';
    return (
      <MantineButton
        ref={ref}
        variant={variantMap[variant]}
        size={sizeMap[size] ?? 'md'}
        color={isDanger ? 'red' : (color ?? 'brand')}
        className={className}
        {...(props as any)}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button as default };
