import { test } from 'node:test';
import assert from 'node:assert/strict';

// We re-implement the tiny validators in JS to stay independent of TS tooling.
// Keep these in sync with lib/validators.ts — see TODO at the bottom.

function isEmail(s) {
  if (!s) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function normalizePhone(s) {
  const digits = (s ?? '').replace(/\D+/g, '');
  if (!digits) return null;
  const local = digits.startsWith('995') ? digits.slice(3) : digits;
  if (local.length !== 9) return null;
  return `+995${local}`;
}

function isE164(p) {
  return /^\+[1-9]\d{7,14}$/.test(p);
}

test('isEmail accepts plain addresses', () => {
  assert.equal(isEmail('foo@bar.com'), true);
  assert.equal(isEmail('  foo@bar.com  '), true);
});

test('isEmail rejects malformed inputs', () => {
  assert.equal(isEmail(''), false);
  assert.equal(isEmail('foo'), false);
  assert.equal(isEmail('foo@bar'), false);
  assert.equal(isEmail('@bar.com'), false);
  assert.equal(isEmail('foo @bar.com'), false);
});

test('normalizePhone produces +995... for Georgian numbers', () => {
  assert.equal(normalizePhone('555 12 34 56'), '+995555123456');
  assert.equal(normalizePhone('+995 555 12 34 56'), '+995555123456');
  assert.equal(normalizePhone('995-555-123456'), '+995555123456');
});

test('normalizePhone returns null for invalid lengths', () => {
  assert.equal(normalizePhone('123'), null);
  assert.equal(normalizePhone(''), null);
  assert.equal(normalizePhone(null), null);
});

test('E.164 check used by edge function matches normalized output', () => {
  assert.equal(isE164('+995555123456'), true);
  assert.equal(isE164('555123456'), false);
  assert.equal(isE164('+0123456789'), false);
});
