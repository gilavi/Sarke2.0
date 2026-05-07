import { useId, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        disabled={disabled}
        defaultValue={value ?? ''}
        className={cn(
          'transition-shadow duration-300',
          saved && 'ring-2 ring-green-400 ring-offset-1',
        )}
        onBlur={(e) => {
          const v = e.target.value.trim() || null;
          if (v !== (value ?? null)) {
            onSave(v);
            setSaved(true);
            setTimeout(() => setSaved(false), 1500);
          }
        }}
      />
    </div>
  );
}
