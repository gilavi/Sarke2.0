import { TextInput, type TextInputProps } from '@mantine/core';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

// Keep onChange compatible with native ChangeEvent so callers using
// `onChange={(e) => setState(e.target.value)}` continue to work unchanged.
export interface FloatingLabelInputProps extends Omit<TextInputProps, 'label'> {
  label: string;
  error?: string;
  /** @deprecated use className */
  containerClassName?: string;
  hint?: string;
}

export const FloatingLabelInput = forwardRef<HTMLInputElement, FloatingLabelInputProps>(
  ({ label, error, hint, className, containerClassName, ...props }, ref) => (
    <TextInput
      ref={ref}
      label={label}
      error={error}
      description={hint}
      radius="md"
      size="md"
      className={cn(containerClassName, className)}
      {...props}
    />
  ),
);
FloatingLabelInput.displayName = 'FloatingLabelInput';

export { FloatingLabelInput as default };
