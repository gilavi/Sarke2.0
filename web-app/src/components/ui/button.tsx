import { Button as MantineButton, type ButtonProps as MantineButtonProps } from '@mantine/core';
import { forwardRef, type ComponentPropsWithoutRef, type CSSProperties, type ElementType } from 'react';

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
  /** Render as another element (e.g. a react-router `Link`) while keeping button styling. */
  component?: ElementType;
  /** Pass-through for `component={Link}` usage. */
  to?: string;
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
  icon: 'sm',
};

// An icon-only button must be SQUARE — `size="icon"` previously fell through to the
// 'md' height with default horizontal padding, so it rendered as a wide pill. Force
// equal width/height and remove the padding so the glyph sits centered.
const ICON_SQUARE: CSSProperties = { width: 36, height: 36, padding: 0 };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'default', color, className, style, asChild: _asChild, ...props }, ref) => {
    const isDanger = variant === 'danger' || variant === 'destructive';
    const isIcon = size === 'icon';
    return (
      <MantineButton
        ref={ref}
        variant={variantMap[variant]}
        size={sizeMap[size] ?? 'md'}
        color={isDanger ? 'red' : (color ?? 'brand')}
        className={className}
        style={isIcon ? { ...ICON_SQUARE, ...(style as CSSProperties) } : style}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mantine polymorphic props
        {...(props as any)}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button as default };
