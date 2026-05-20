
export interface ProjectOption {
  value: string;
  label: string;
  logo?: string | null;
  company?: string | null;
}

interface ProjectPickerProps {
  label?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: ProjectOption[];
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export function ProjectPicker({ label, required, value, onChange, options }: ProjectPickerProps) {
  return (
    <div className="space-y-2">
      {label && (
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {label}
          {required && ' *'}
        </p>
      )}

      {options.length === 0 && (
        <p className="text-sm text-neutral-400">პროექტი არ არის</p>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={[
                'flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all',
                selected
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20'
                  : 'border-neutral-200 bg-white hover:border-brand-300 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-brand-600',
              ].join(' ')}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-700">
                {opt.logo ? (
                  <img src={opt.logo} alt={opt.label} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-brand-600 dark:text-brand-400">
                    {initials(opt.label)}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  {opt.label}
                </p>
                {opt.company && (
                  <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                    {opt.company}
                  </p>
                )}
              </div>

              <div
                className={[
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                  selected
                    ? 'border-brand-500 bg-brand-500'
                    : 'border-neutral-300 dark:border-neutral-600',
                ].join(' ')}
              >
                {selected && <div className="h-2 w-2 rounded-full bg-white" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
