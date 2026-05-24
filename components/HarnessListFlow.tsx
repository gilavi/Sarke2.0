// Backwards-compatible barrel. The component now lives under
// components/harness-list/. Existing callers (features/inspection-wizard,
// app/inspections/harness/[id].tsx) keep working unchanged.

export { HarnessListFlow } from './harness-list';
export type { HarnessListFlowProps } from './harness-list';
