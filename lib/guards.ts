import type {
  Answer,
  Inspection,
  Project,
  Question,
  Template,
} from '../types/models';

// Lightweight runtime guards for the Supabase boundary. We deliberately keep
// these structural and forgiving — the goal is to detect schema drift (missing
// required column, wrong type for a key field) before it corrupts UI state,
// not to reproduce the full DB schema in TS. Add fields as bugs surface.

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

export function isProject(x: unknown): x is Project {
  if (!isObj(x)) return false;
  return typeof x.id === 'string' && typeof x.user_id === 'string' && typeof x.name === 'string';
}

export function isTemplate(x: unknown): x is Template {
  if (!isObj(x)) return false;
  return typeof x.id === 'string' && typeof x.name === 'string';
}

export function isQuestion(x: unknown): x is Question {
  if (!isObj(x)) return false;
  return (
    typeof x.id === 'string' &&
    typeof x.template_id === 'string' &&
    typeof x.type === 'string' &&
    typeof x.title === 'string'
  );
}

export function isInspection(x: unknown): x is Inspection {
  if (!isObj(x)) return false;
  return (
    typeof x.id === 'string' &&
    typeof x.template_id === 'string' &&
    typeof x.user_id === 'string' &&
    (x.status === 'draft' || x.status === 'completed')
  );
}

export function isAnswer(x: unknown): x is Answer {
  if (!isObj(x)) return false;
  return (
    typeof x.id === 'string' &&
    typeof x.inspection_id === 'string' &&
    typeof x.question_id === 'string'
  );
}

/**
 * Assert a value matches a guard, throwing with a descriptive context label.
 * Use at the Supabase boundary so a bad row blows up loudly instead of
 * silently propagating undefined fields into the UI.
 */
export function assertShape<T>(
  value: unknown,
  guard: (v: unknown) => v is T,
  context: string,
): T {
  if (!guard(value)) {
    throw new Error(`shape mismatch at ${context}: ${JSON.stringify(value).slice(0, 200)}`);
  }
  return value;
}
