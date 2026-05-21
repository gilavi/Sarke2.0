/**
 * Form kernel — react-hook-form + zod, finally wired up.
 *
 * Both libraries were already in package.json but imported in zero files;
 * every form was raw useState with hand-rolled `canAdvance`/`canFinish` gates
 * duplicated ~15 times. This module gives domains:
 *   - `useEntityForm(schema, defaults)` — typed RHF form with zod validation,
 *   - `<Form>` — a submit wrapper,
 *   - `<FormTextInput> / <FormTextarea> / <FormSelect>` — Mantine inputs bound
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
import { TextInput, Textarea, Select, type SelectProps } from '@mantine/core';

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
        <TextInput
          label={label}
          placeholder={placeholder}
          disabled={disabled}
          withAsterisk={required}
          radius="md"
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
          withAsterisk={required}
          rows={rows}
          autosize={false}
          radius="md"
          value={(field.value as string) ?? ''}
          onChange={(e) => field.onChange(e.currentTarget.value)}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
        />
      )}
    />
  );
}

export function FormSelect<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  disabled,
  required,
  data,
}: FieldBase<T> & { data: SelectProps['data'] }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Select
          label={label}
          placeholder={placeholder}
          disabled={disabled}
          withAsterisk={required}
          radius="md"
          data={data}
          value={(field.value as string) ?? null}
          onChange={(value) => field.onChange(value)}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
        />
      )}
    />
  );
}
