/**
 * Interactive descriptor language for the unified structured-inspection wizard.
 *
 * This is the INTERACTIVE counterpart to the PDF `InspectionSchema`
 * (`lib/inspection/schema.ts`). The PDF schema says how to *render* a finished
 * act; this descriptor says how to *fill one in* through the shared harness-style
 * wizard (info/specs → checklist sections → verdict → sign → PDF).
 *
 * Like the PDF block list, steps are a discriminated union so the wizard has one
 * renderer per `kind`, and `custom` is the escape hatch for act-specific sections
 * (e.g. safety-net's load-test weight table) that don't fit the common shapes.
 *
 * Every structured act supplies one `WizardDescriptor<T, P, C>` keyed by its
 * `category` (= `templates.category` = `inspections.type`). The data-layer fns
 * live on the descriptor so the generic hook stays type-safe without per-type code.
 */
import type { ReactNode } from 'react';
import type { ResultTone } from '@/features/inspections/equipment/components/ResultPills';
import type { QueryKey } from '@/lib/query/useEntityMutation';

/** A 3-state (or n-state) result option, reusing the equipment tone vocabulary. */
export interface WizardResultOption {
  value: string;
  label: string;
  tone: ResultTone;
}

/**
 * Standard per-item checklist state. Bobcat items and safety-net visual items
 * use exactly this shape; post-test items use only `{id, result}` (the engine
 * tolerates missing comment/photo_paths via `withDetails: false`).
 */
export interface WizardItemState {
  id: number;
  result: string | null;
  comment?: string | null;
  photo_paths?: string[];
}

/** Catalog entry for a checklist item (the static definition, not the state). */
export interface WizardChecklistItem {
  id: number;
  label: string;
  description?: string;
  /** Optional category/group header rendered above the first item of each group. */
  group?: string;
  /** Per-item result options override (e.g. bobcat's neutral "not present"). */
  options?: WizardResultOption[];
}

/** A spec/info field bound to a single model column. */
export interface WizardSpecField<T, P> {
  key: string;
  label: string;
  value: (m: T) => string | null | undefined;
  /** Build the edit patch (existing rows). */
  patch: (v: string | null) => P;
  placeholder?: string;
}

/** info/specs step — a grid of labeled text fields + the project (create only). */
export interface WizardSpecStep<T, P> {
  kind: 'specs';
  key: string;
  title: string;
  fields: WizardSpecField<T, P>[];
}

/** A category-grouped checklist step with 3-state result pills. */
export interface WizardChecklistStep<T, P> {
  kind: 'checklist';
  key: string;
  title: string;
  items: WizardChecklistItem[];
  resultOptions: WizardResultOption[];
  /** Storage prefix for item photos (e.g. 'bobcat'); omit to hide comment/photos. */
  photoPrefix?: string;
  /** When false, render result pills only (no comment/photo) — e.g. post-test. */
  withDetails?: boolean;
  getStates: (m: T) => WizardItemState[];
  patch: (states: WizardItemState[]) => P;
}

/** verdict + notes step (the conclusion). */
export interface WizardVerdictStep<T, P> {
  kind: 'verdict';
  key: string;
  title: string;
  options: WizardResultOption[];
  getVerdict: (m: T) => string | null;
  setVerdict: (v: string | null) => P;
  getNotes: (m: T) => string | null;
  setNotes: (v: string | null) => P;
  notesLabel?: string;
}

/** Context handed to a custom step's render fn. */
export interface CustomStepCtx<T, P> {
  model: T;
  disabled: boolean;
  save: (patch: P) => void;
}

/** Escape hatch for act-specific sections (e.g. safety-net load-test table). */
export interface WizardCustomStep<T, P> {
  kind: 'custom';
  key: string;
  title: string;
  /** Optional validation gate for the Next button. */
  canAdvance?: (m: T) => boolean;
  render: (ctx: CustomStepCtx<T, P>) => ReactNode;
}

export type WizardStep<T, P> =
  | WizardSpecStep<T, P>
  | WizardChecklistStep<T, P>
  | WizardVerdictStep<T, P>
  | WizardCustomStep<T, P>;

/** Counts shown in the SuccessModal stat line. */
export interface WizardSummary {
  total: number;
  good: number;
  problem: number;
}

/**
 * Complete interactive descriptor for one structured act. `T` = domain model,
 * `P` = patch type, `C` = create args.
 */
export interface WizardDescriptor<T extends { id: string; status: string }, P, C> {
  category: string;
  /** Human title (header + success modal). */
  title: string;
  /** Success-modal noun, e.g. "პუნქტი". */
  itemLabel: string;

  // ── Data layer (mirrors lib/data/<type>.ts) ──
  get: (id: string) => Promise<T | null>;
  list: (projectId?: string) => Promise<T[]>;
  create: (args: C) => Promise<T>;
  update: (id: string, patch: P) => Promise<void>;
  remove: (id: string) => Promise<void>;
  detailKey: (id: string | null | undefined) => QueryKey;
  listKey: () => QueryKey;
  getProjectId: (m: T) => string | null | undefined;
  /** When set, used as the row's createdAt for the inspections list sort/date. */
  getCreatedAt?: (m: T) => string;

  /** Build create args from the chosen project + inspector + spec form values. */
  buildCreateArgs: (input: {
    projectId: string;
    inspectorName: string | null;
    specValues: Record<string, string>;
  }) => C;

  /** Ordered wizard steps (specs first, verdict last by convention). */
  steps: WizardStep<T, P>[];
  /** Patch marking the row completed. */
  completePatch: () => P;
  /** Whether the act is finished enough to complete (e.g. verdict chosen). */
  canComplete: (m: T) => boolean;
  /** Stat counts for the SuccessModal. */
  summary: (m: T) => WizardSummary;
  /** Inspector name printed under the captured signature (defaults to empty). */
  inspectorName?: (m: T) => string | null | undefined;
}

/**
 * A descriptor of unknown model/patch/create types, for heterogeneous collections
 * (the structured-act registry). Like `AnyInspectionSchema`, the selectors are
 * contravariant so a registry of differently typed descriptors needs an escape
 * hatch. Per-act code stays fully typed via `WizardDescriptor<T, P, C>`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyWizardDescriptor = WizardDescriptor<any, any, any>;
