import { test } from 'node:test';
import assert from 'node:assert/strict';

// Mirror of toErrorMessage from lib/logError.ts. Keep in sync.

function toErrorMessage(e) {
  if (e == null) return 'უცნობი შეცდომა';
  if (typeof e === 'string') return e;
  if (e instanceof Error) return e.message || 'უცნობი შეცდომა';
  if (typeof e === 'object') {
    if (typeof e.message === 'string') return e.message;
    if (typeof e.error_description === 'string') return e.error_description;
    if (typeof e.details === 'string') return e.details;
  }
  try {
    return JSON.stringify(e);
  } catch {
    return 'უცნობი შეცდომა';
  }
}

test('null/undefined → fallback string', () => {
  assert.equal(toErrorMessage(null), 'უცნობი შეცდომა');
  assert.equal(toErrorMessage(undefined), 'უცნობი შეცდომა');
});

test('string passes through', () => {
  assert.equal(toErrorMessage('boom'), 'boom');
});

test('Error → message', () => {
  assert.equal(toErrorMessage(new Error('nope')), 'nope');
});

test('PostgrestError-shaped object → message', () => {
  assert.equal(
    toErrorMessage({ message: 'db is on fire', code: '42P01' }),
    'db is on fire',
  );
});

test('OAuth error_description → returned', () => {
  assert.equal(
    toErrorMessage({ error_description: 'invalid_grant' }),
    'invalid_grant',
  );
});

test('plain object falls back to JSON', () => {
  assert.equal(toErrorMessage({ kind: 'weird' }), '{"kind":"weird"}');
});
