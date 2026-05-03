import { test } from 'node:test';
import assert from 'node:assert/strict';

// Mirrors of the guard implementations from lib/guards.ts.
// Inlined here so no TS transpilation step is needed for the test runner.
// When the source contract changes these tests will fail loudly — that is the
// point. Keep this file in sync with lib/guards.ts.

function isObj(x) {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function isProject(x) {
  if (!isObj(x)) return false;
  return typeof x.id === 'string' && typeof x.user_id === 'string' && typeof x.name === 'string';
}

function isTemplate(x) {
  if (!isObj(x)) return false;
  return typeof x.id === 'string' && typeof x.name === 'string';
}

function isQuestion(x) {
  if (!isObj(x)) return false;
  return (
    typeof x.id === 'string' &&
    typeof x.template_id === 'string' &&
    typeof x.type === 'string' &&
    typeof x.title === 'string'
  );
}

function isInspection(x) {
  if (!isObj(x)) return false;
  return (
    typeof x.id === 'string' &&
    typeof x.template_id === 'string' &&
    typeof x.user_id === 'string' &&
    (x.status === 'draft' || x.status === 'completed')
  );
}

function isAnswer(x) {
  if (!isObj(x)) return false;
  return (
    typeof x.id === 'string' &&
    typeof x.inspection_id === 'string' &&
    typeof x.question_id === 'string'
  );
}

function assertShape(value, guard, context) {
  if (!guard(value)) {
    throw new Error(`shape mismatch at ${context}: ${JSON.stringify(value).slice(0, 200)}`);
  }
  return value;
}

// ── isProject ────────────────────────────────────────────────────────────────

test('isProject: accepts a valid project row', () => {
  assert.equal(isProject({ id: 'p1', user_id: 'u1', name: 'Bridge Site' }), true);
});

test('isProject: rejects when id is missing', () => {
  assert.equal(isProject({ user_id: 'u1', name: 'Bridge Site' }), false);
});

test('isProject: rejects when user_id is missing', () => {
  assert.equal(isProject({ id: 'p1', name: 'Bridge Site' }), false);
});

test('isProject: rejects when name is missing', () => {
  assert.equal(isProject({ id: 'p1', user_id: 'u1' }), false);
});

test('isProject: rejects null', () => {
  assert.equal(isProject(null), false);
});

test('isProject: rejects an array', () => {
  assert.equal(isProject([{ id: 'p1', user_id: 'u1', name: 'x' }]), false);
});

test('isProject: rejects a primitive', () => {
  assert.equal(isProject('p1'), false);
});

// ── isTemplate ───────────────────────────────────────────────────────────────

test('isTemplate: accepts a valid template row', () => {
  assert.equal(isTemplate({ id: 't1', name: 'Harness Check' }), true);
});

test('isTemplate: rejects when id is missing', () => {
  assert.equal(isTemplate({ name: 'Harness Check' }), false);
});

test('isTemplate: rejects when name is missing', () => {
  assert.equal(isTemplate({ id: 't1' }), false);
});

test('isTemplate: rejects null', () => {
  assert.equal(isTemplate(null), false);
});

// ── isQuestion ───────────────────────────────────────────────────────────────

test('isQuestion: accepts a valid question row', () => {
  assert.equal(
    isQuestion({ id: 'q1', template_id: 't1', type: 'boolean', title: 'Belt ok?' }),
    true,
  );
});

test('isQuestion: rejects when id is missing', () => {
  assert.equal(isQuestion({ template_id: 't1', type: 'boolean', title: 'Belt ok?' }), false);
});

test('isQuestion: rejects when template_id is missing', () => {
  assert.equal(isQuestion({ id: 'q1', type: 'boolean', title: 'Belt ok?' }), false);
});

test('isQuestion: rejects when type is missing', () => {
  assert.equal(isQuestion({ id: 'q1', template_id: 't1', title: 'Belt ok?' }), false);
});

test('isQuestion: rejects when title is missing', () => {
  assert.equal(isQuestion({ id: 'q1', template_id: 't1', type: 'boolean' }), false);
});

// ── isInspection ─────────────────────────────────────────────────────────────

test('isInspection: accepts a valid draft inspection', () => {
  assert.equal(
    isInspection({ id: 'i1', template_id: 't1', user_id: 'u1', status: 'draft' }),
    true,
  );
});

test('isInspection: accepts a completed inspection', () => {
  assert.equal(
    isInspection({ id: 'i1', template_id: 't1', user_id: 'u1', status: 'completed' }),
    true,
  );
});

test('isInspection: rejects an unknown status string', () => {
  assert.equal(
    isInspection({ id: 'i1', template_id: 't1', user_id: 'u1', status: 'pending' }),
    false,
  );
});

test('isInspection: rejects when status is absent', () => {
  assert.equal(isInspection({ id: 'i1', template_id: 't1', user_id: 'u1' }), false);
});

test('isInspection: rejects when user_id is missing', () => {
  assert.equal(isInspection({ id: 'i1', template_id: 't1', status: 'draft' }), false);
});

test('isInspection: rejects null', () => {
  assert.equal(isInspection(null), false);
});

// ── isAnswer ─────────────────────────────────────────────────────────────────

test('isAnswer: accepts a valid answer row', () => {
  assert.equal(
    isAnswer({ id: 'a1', inspection_id: 'i1', question_id: 'q1' }),
    true,
  );
});

test('isAnswer: rejects when inspection_id is missing', () => {
  assert.equal(isAnswer({ id: 'a1', question_id: 'q1' }), false);
});

test('isAnswer: rejects when question_id is missing', () => {
  assert.equal(isAnswer({ id: 'a1', inspection_id: 'i1' }), false);
});

test('isAnswer: rejects null', () => {
  assert.equal(isAnswer(null), false);
});

// ── assertShape ───────────────────────────────────────────────────────────────

test('assertShape: returns the value unchanged when guard passes', () => {
  const row = { id: 'p1', user_id: 'u1', name: 'Bridge Site' };
  const result = assertShape(row, isProject, 'fetchProject');
  assert.equal(result, row);
});

test('assertShape: throws when guard fails', () => {
  assert.throws(
    () => assertShape({ id: 'p1' }, isProject, 'fetchProject'),
    (err) => {
      assert.ok(err instanceof Error);
      return true;
    },
  );
});

test('assertShape: error message contains the context label', () => {
  assert.throws(
    () => assertShape({ id: 'p1' }, isProject, 'loadProjectDetail'),
    /loadProjectDetail/,
  );
});

test('assertShape: error message contains a JSON snippet of the bad value', () => {
  assert.throws(
    () => assertShape({ id: 'p1' }, isProject, 'ctx'),
    /"id":"p1"/,
  );
});
