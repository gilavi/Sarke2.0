import * as React from 'react';
import { cn } from '@/lib/utils';

export interface FloatingLabelInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  id?: string;
  error?: string;
  containerClassName?: string;
}

const FloatingLabelInput = React.forwardRef<HTMLInputElement, FloatingLabelInputProps>(
  function FloatingLabelInput(
    { label, id: idProp, error, containerClassName, value, onChange, onFocus, onBlur, className, ...props },
    ref,
  ) {
    const autoId = React.useId();
    const id = idProp ?? autoId;
    const [isFocused, setIsFocused] = React.useState(false);

    // Support both controlled and uncontrolled.
    const [localValue, setLocalValue] = React.useState(props.defaultValue ?? '');
    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : localValue;
    const isFilled = currentValue !== '' && currentValue !== undefined && currentValue !== null;

    // Label floats when focused OR when the field has a value.
    const isFloated = isFocused || isFilled;

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      if (!isControlled) setLocalValue(e.target.value);
      onChange?.(e);
    }

    const hasError = Boolean(error);

    return (
      <div className={containerClassName}>
        <div
          className={cn(
            'relative h-14 rounded-lg border bg-white transition-colors duration-150',
            hasError
              ? 'border-danger'
              : isFocused
                ? 'border-[1.5px] border-brand-500'
                : 'border-neutral-200',
          )}
        >
          {/* Label acts as the placeholder and floats on focus/fill */}
          <label
            htmlFor={id}
            className={cn(
              'pointer-events-none absolute left-3 select-none transition-all duration-150 ease-out',
              isFloated
                ? 'top-[7px] text-[11px] font-medium ' + (hasError ? 'text-danger' : isFocused ? 'text-brand-600' : 'text-neutral-500')
                : 'top-1/2 -translate-y-1/2 text-[15px] text-neutral-400',
            )}
          >
            {label}
          </label>

          <input
            ref={ref}
            id={id}
            value={isControlled ? value : localValue}
            onChange={handleChange}
            onFocus={(e) => { setIsFocused(true); onFocus?.(e); }}
            onBlur={(e) => { setIsFocused(false); onBlur?.(e); }}
            className={cn(
              'absolute inset-0 h-full w-full rounded-lg bg-transparent',
              'px-3 pb-2 pt-5 text-sm text-neutral-900',
              'placeholder:text-transparent',
              'focus-visible:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-50',
              className,
            )}
            {...props}
          />
        </div>
        {hasError && (
          <p className="mt-1 text-xs text-danger">{error}</p>
        )}
      </div>
    );
  },
);

FloatingLabelInput.displayName = 'FloatingLabelInput';

export { FloatingLabelInput };
