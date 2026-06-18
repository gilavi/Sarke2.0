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
  placeholder = 'აირჩიეთ',
  size = 'default',
  disabled,
  className,
}: SelectProps) {
  const selectId = label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
        >
          {label}
          {required && <span className="ml-1 text-red-500" aria-hidden="true">*</span>}
        </label>
      )}
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        className={cn(
          'w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none transition',
          'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
          'dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100',
          'disabled:cursor-not-allowed disabled:opacity-50',
          size === 'sm' ? 'py-1' : 'py-2',
          className,
        )}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
