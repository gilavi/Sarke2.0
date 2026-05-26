import { forwardRef } from 'react';
import { Input, type InputProps } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// FloatingLabelInput now wraps the native Input.
// The "floating" name is historical — the label sits above the input.
export interface FloatingLabelInputProps extends InputProps {
  /** @deprecated use className */
  containerClassName?: string;
}

export const FloatingLabelInput = forwardRef<HTMLInputElement, FloatingLabelInputProps>(
  ({ containerClassName, className, ...props }, ref) => (
    <Input ref={ref} className={cn(containerClassName, className)} {...props} />
  ),
);
FloatingLabelInput.displayName = 'FloatingLabelInput';

export { FloatingLabelInput as default };
