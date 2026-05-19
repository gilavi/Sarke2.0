import { Menu, type MenuProps } from '@mantine/core';
import { type ReactNode, type MouseEventHandler } from 'react';

// DropdownMenu = Menu root
export const DropdownMenu = ({ children, ...props }: MenuProps) => (
  <Menu shadow="md" radius="md" {...props}>{children}</Menu>
);

// DropdownMenuTrigger — supports `asChild` (ignored; Menu.Target wraps children as trigger)
export const DropdownMenuTrigger = ({
  children,
  asChild: _asChild,
  ...props
}: {
  children: ReactNode;
  asChild?: boolean;
  [key: string]: any;
}) => <Menu.Target {...props}>{children}</Menu.Target>;

// DropdownMenuContent — maps Radix `align` prop (ignored by Mantine; positioning handled by Menu)
export const DropdownMenuContent = ({
  children,
  align: _align,
  className,
  sideOffset: _sideOffset,
  ...props
}: {
  children: ReactNode;
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  className?: string;
  [key: string]: any;
}) => (
  <Menu.Dropdown className={className} {...props}>
    {children}
  </Menu.Dropdown>
);

// DropdownMenuItem — maps Radix `onSelect` to Mantine `onClick`
export const DropdownMenuItem = ({
  children,
  onSelect,
  onClick,
  className,
  disabled,
  ...props
}: {
  children?: ReactNode;
  onSelect?: (event: Event) => void;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  className?: string;
  disabled?: boolean;
  [key: string]: any;
}) => (
  <Menu.Item
    onClick={onSelect ? () => onSelect(new Event('select')) : onClick}
    disabled={disabled}
    className={className}
    {...props}
  >
    {children}
  </Menu.Item>
);

export const DropdownMenuSeparator = Menu.Divider;
export const DropdownMenuLabel = Menu.Label;

// Stub exports for Radix-specific parts that some files may import
export const DropdownMenuGroup = ({ children }: { children: ReactNode }) => <>{children}</>;
export const DropdownMenuPortal = ({ children }: { children: ReactNode }) => <>{children}</>;
export const DropdownMenuSub = ({ children }: { children: ReactNode }) => <>{children}</>;
export const DropdownMenuSubContent = ({ children }: { children: ReactNode }) => <>{children}</>;
export const DropdownMenuSubTrigger = ({ children }: { children: ReactNode }) => <>{children}</>;
export const DropdownMenuRadioGroup = ({ children }: { children: ReactNode }) => <>{children}</>;
export const DropdownMenuCheckboxItem = Menu.Item;
export const DropdownMenuRadioItem = Menu.Item;
export const DropdownMenuShortcut = ({ children }: { children: ReactNode }) => (
  <span className="ml-auto text-xs opacity-60">{children}</span>
);
