import { Card as MantineCard, type CardProps as MantineCardProps } from '@mantine/core';
import { forwardRef, type ElementType, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends MantineCardProps {
  disableHover?: boolean;
  as?: ElementType;
  // Explicitly include common HTML div attributes that MantineCardProps may not surface
  onClick?: HTMLAttributes<HTMLDivElement>['onClick'];
  onKeyDown?: HTMLAttributes<HTMLDivElement>['onKeyDown'];
  tabIndex?: number;
  role?: string;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ disableHover, as: _as, className, children, ...props }, ref) => (
    <MantineCard
      ref={ref}
      radius="md"
      withBorder
      className={cn(
        !disableHover && 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors',
        className,
      )}
      {...(props as any)}
    >
      {children}
    </MantineCard>
  ),
);
Card.displayName = 'Card';

export const CardHeader = ({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mb-3', className)} {...props}>{children}</div>
);

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4';
}
export const CardTitle = ({ className, as: Tag = 'h3', children, ...props }: CardTitleProps) => (
  <Tag className={cn('text-base font-semibold text-neutral-900 dark:text-neutral-100', className)} {...props}>{children}</Tag>
);

export const CardDescription = ({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-sm text-neutral-500', className)} {...props}>{children}</p>
);

export const CardContent = ({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('pt-0', className)} {...props}>{children}</div>
);

export const CardFooter = ({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mt-4 flex items-center', className)} {...props}>{children}</div>
);
