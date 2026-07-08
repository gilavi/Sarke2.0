import React from 'react';
import { FloatingLabelInput, type FloatingLabelInputProps } from '../../components/inputs/FloatingLabelInput';

/**
 * Memoized `FloatingLabelInput` for the incident steps. `FloatingLabelInput`
 * itself is a plain `forwardRef` (not memoized), so without this wrapper every
 * keystroke in one field reconciles *all* sibling inputs of the step (each of
 * which sets up its own `Animated.Value`s). Wrapping it in `React.memo` and
 * feeding it primitive `value` + a stable per-field `onChangeText` (see
 * `useIncidentForm`'s setter bag) means typing in one field only re-renders
 * that field — the perf-runtime finding for `app/incidents/new.tsx`.
 *
 * Do NOT pass inline object props (e.g. `style={{ ... }}`) unless the field is
 * expected to re-render anyway (like the live witness-name input) — a fresh
 * object reference defeats the shallow prop comparison.
 */
export const IncidentField = React.memo(function IncidentField(props: FloatingLabelInputProps) {
  return <FloatingLabelInput {...props} />;
});
