import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  size?: 'default' | 'sm';
  disabled?: boolean;
  className?: string;
}

export function Select({
  label,
  required,
  value,
  onChange,
  options,
  placeholder = '— აირჩიეთ —',
  size = 'default',
  disabled,
  className,
}: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label;
  const isFilled = value !== '';
  const isFloated = open || isFilled;

  // ── Labeled / full-height mode (matches FloatingLabelInput) ──
  if (label) {
    return (
      <DropdownMenuPrimitive.Root open={open} onOpenChange={disabled ? undefined : setOpen} modal={false}>
        <DropdownMenuPrimitive.Trigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              'relative h-14 w-full rounded-lg border bg-white text-left transition-colors duration-150',
              'dark:bg-neutral-900',
              open
                ? 'border-[1.5px] border-brand-500'
                : 'border-neutral-200 dark:border-neutral-700',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30',
              'disabled:cursor-not-allowed disabled:opacity-50',
              className,
            )}
          >
            {/* Floating label */}
            <span
              className={cn(
                'pointer-events-none absolute left-3 select-none transition-all duration-150 ease-out',
                isFloated
                  ? cn('top-[7px] text-[11px] font-medium', open ? 'text-brand-600' : 'text-neutral-500')
                  : 'top-1/2 -translate-y-1/2 text-[15px] text-neutral-400',
              )}
            >
              {label}{required && <span className="ml-0.5 text-danger">*</span>}
            </span>

            {/* Selected value */}
            <span
              className={cn(
                'absolute inset-0 flex items-end pb-2 pl-3 pr-9 text-sm',
                isFilled ? 'text-neutral-900 dark:text-neutral-100' : 'text-transparent',
              )}
            >
              {selectedLabel ?? placeholder}
            </span>

            {/* Placeholder when empty */}
            {!isFilled && !open && (
              <span className="absolute inset-0 flex items-end pb-2 pl-3 pr-9 text-sm text-neutral-400">
                {placeholder}
              </span>
            )}

            {/* Chevron */}
            <ChevronDown
              size={16}
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 transition-transform duration-150',
                open && 'rotate-180 text-brand-500',
              )}
            />
          </button>
        </DropdownMenuPrimitive.Trigger>

        <DropdownMenuPrimitive.Portal>
          <DropdownMenuPrimitive.Content
            align="start"
            sideOffset={4}
            style={{ width: 'var(--radix-dropdown-menu-trigger-width)' }}
            className={cn(
              'z-[200] max-h-60 overflow-y-auto rounded-md border border-neutral-200 bg-white p-1 shadow-md',
              'dark:border-neutral-700 dark:bg-neutral-900',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
              'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
            )}
          >
            {options.map((opt) => (
              <DropdownMenuPrimitive.Item
                key={opt.value}
                onSelect={() => onChange(opt.value)}
                className={cn(
                  'relative flex cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-3 text-sm outline-none',
                  'text-neutral-700 dark:text-neutral-200',
                  'hover:bg-neutral-100 focus:bg-neutral-100 dark:hover:bg-neutral-800 dark:focus:bg-neutral-800',
                  opt.value === value && 'font-medium text-brand-600 dark:text-brand-400',
                )}
              >
                {opt.value === value && (
                  <Check size={14} className="absolute left-2.5 text-brand-500" />
                )}
                {opt.label}
              </DropdownMenuPrimitive.Item>
            ))}
          </DropdownMenuPrimitive.Content>
        </DropdownMenuPrimitive.Portal>
      </DropdownMenuPrimitive.Root>
    );
  }

  // ── Compact / unlabeled mode ──
  return (
    <DropdownMenuPrimitive.Root open={open} onOpenChange={disabled ? undefined : setOpen}>
      <DropdownMenuPrimitive.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'relative flex items-center justify-between gap-2 rounded-md border text-left text-sm',
            'bg-white dark:bg-neutral-900',
            open
              ? 'border-brand-500'
              : 'border-neutral-300 dark:border-neutral-600',
            size === 'sm' ? 'h-8 px-2.5 py-1 text-xs' : 'h-9 px-3 py-2',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
        >
          <span className={cn(isFilled ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400')}>
            {selectedLabel ?? placeholder}
          </span>
          <ChevronDown
            size={size === 'sm' ? 13 : 15}
            className={cn(
              'shrink-0 text-neutral-400 transition-transform duration-150',
              open && 'rotate-180 text-brand-500',
            )}
          />
        </button>
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="start"
          sideOffset={4}
          style={{ minWidth: 'var(--radix-dropdown-menu-trigger-width)' }}
          className={cn(
            'z-[200] max-h-60 overflow-y-auto rounded-md border border-neutral-200 bg-white p-1 shadow-md',
            'dark:border-neutral-700 dark:bg-neutral-900',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
          )}
        >
          {options.map((opt) => (
            <DropdownMenuPrimitive.Item
              key={opt.value}
              onSelect={() => onChange(opt.value)}
              className={cn(
                'relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-3 text-sm outline-none',
                'text-neutral-700 dark:text-neutral-200',
                'hover:bg-neutral-100 focus:bg-neutral-100 dark:hover:bg-neutral-800 dark:focus:bg-neutral-800',
                opt.value === value && 'font-medium text-brand-600 dark:text-brand-400',
                size === 'sm' && 'text-xs',
              )}
            >
              {opt.value === value && (
                <Check size={12} className="absolute left-2 text-brand-500" />
              )}
              {opt.label}
            </DropdownMenuPrimitive.Item>
          ))}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}
