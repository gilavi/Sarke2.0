import { useId, useState } from 'react';
import { TextInput } from '@mantine/core';
import { cn } from '@/lib/utils';

interface Props {
  label: string;
  value: string | null;
  disabled: boolean;
  onSave: (v: string | null) => void;
}

export default function FieldInput({ label, value, disabled, onSave }: Props) {
  const id = useId();
  const [saved, setSaved] = useState(false);

  return (
    <TextInput
      id={id}
      label={label}
      disabled={disabled}
      defaultValue={value ?? ''}
      radius="md"
      classNames={{
        input: cn('transition-shadow duration-300', saved && 'ring-2 ring-green-400 ring-offset-1'),
      }}
      onBlur={(e) => {
        const v = e.target.value.trim() || null;
        if (v !== (value ?? null)) {
          onSave(v);
          setSaved(true);
          setTimeout(() => setSaved(false), 1500);
        }
      }}
    />
  );
}
