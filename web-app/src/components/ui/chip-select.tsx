import type { SelectOption } from '@/components/ui/select';

interface ChipSelectProps {
  label?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
}

export function ChipSelect({ label, required, value, onChange, options }: ChipSelectProps) {
  return (
    <div className="space-y-2">
      {label && (
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {label}
          {required && ' *'}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {options.length === 0 && (
          <span className="text-sm text-neutral-400">პროექტი არ არის</span>
        )}
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              value === opt.value
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-neutral-300 bg-white text-neutral-700 hover:border-brand-400'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
