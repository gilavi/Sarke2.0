import { Select as MantineSelect } from '@mantine/core';

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
  return (
    <MantineSelect
      label={label}
      required={required}
      value={value || null}
      onChange={(v) => onChange(v ?? '')}
      data={options}
      placeholder={placeholder}
      size={size === 'sm' ? 'sm' : 'md'}
      disabled={disabled}
      className={className}
      radius="md"
      allowDeselect={false}
      searchable
    />
  );
}
