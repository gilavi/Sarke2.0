/**
 * Form kernel - react-hook-form + zod, finally wired up.
 *
 * Both libraries were already in package.json but imported in zero files;
 * every form was raw useState with hand-rolled `canAdvance`/`canFinish` gates
 * duplicated ~15 times. This module gives domains:
 *   - `useEntityForm(schema, defaults)` - typed RHF form with zod validation,
 *   - `<Form>` - a submit wrapper,
 *   - `<FormTextInput> / <FormTextarea> / <FormSelect>` - native inputs bound
 *     to RHF Controller, so validation lives in the zod schema (a single
 *     source that can mirror the data-layer types) instead of per-field code.
 */
/* eslint-disable react-refresh/only-export-components -- form kit intentionally exports a hook + field components together */
import type { ReactNode, FormHTMLAttributes } from 'react';
import {
  useForm,
  Controller,
  type Control,
  type DefaultValues,
  type FieldValues,
  type Path,
  type UseFormReturn,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ZodType } from 'zod';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export function useEntityForm<T extends FieldValues>(
  schema: ZodType<T>,
  defaultValues: DefaultValues<T>,
): UseFormReturn<T> {
  return useForm<T>({
    // resolver generics across rhf/zod majors don't line up cleanly; the schema
    // and form type are both T, so this cast is sound.
    resolver: zodResolver(schema) as never,
    defaultValues,
    mode: 'onBlur',
  });
}

export function Form({
  children,
  ...props
}: { children: ReactNode } & FormHTMLAttributes<HTMLFormElement>) {
  return (
    <form noValidate {...props}>
      {children}
    </form>
  );
}

interface FieldBase<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

export function FormTextInput<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  disabled,
  required,
}: FieldBase<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Input
          label={label}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          value={(field.value as string) ?? ''}
          onChange={(e) => field.onChange(e.currentTarget.value)}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
        />
      )}
    />
  );
}

export function FormTextarea<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  disabled,
  required,
  rows = 3,
}: FieldBase<T> & { rows?: number }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Textarea
          label={label}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          rows={rows}
          value={(field.value as string) ?? ''}
          onChange={(e) => field.onChange(e.currentTarget.value)}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
        />
      )}
    />
  );
}

export interface SelectData {
  value: string;
  label: string;
}

export function FormSelect<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  disabled,
  required,
  data,
}: FieldBase<T> & { data: SelectData[] }) {
  const selectId = label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
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
            value={(field.value as string) ?? ''}
            onChange={(e) => field.onChange(e.target.value)}
            onBlur={field.onBlur}
            disabled={disabled}
            required={required}
            aria-invalid={!!fieldState.error}
            className={cn(
              'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition',
              'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
              'dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100',
              'disabled:cursor-not-allowed disabled:opacity-50',
              fieldState.error && 'border-red-400 focus:border-red-400 focus:ring-red-400/20',
            )}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {data.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          {fieldState.error && (
            <p className="text-xs text-red-600 dark:text-red-400" role="alert">
              {fieldState.error.message}
            </p>
          )}
        </div>
      )}
    />
  );
}
