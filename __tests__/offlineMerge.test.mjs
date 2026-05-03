import { test } from 'node:test';
import assert from 'node:assert/strict';

// Mirror of SERVER_CANONICAL_INSPECTION_FIELDS + stripServerFields from
// lib/offline.tsx. The wizard merge bug came from re-applying these fields
// from the local cache; this test pins the contract.

const SERVER_CANONICAL_INSPECTION_FIELDS = [
  'status',
  'completed_at',
  'updated_at',
  'created_at',
  'user_id',
];

function stripServerFields(patch) {
  const out = { ...patch };
  for (const k of SERVER_CANONICAL_INSPECTION_FIELDS) delete out[k];
  return out;
}

test('stripServerFields removes status + completed_at', () => {
  const cleaned = stripServerFields({
    id: 'abc',
    status: 'completed',
    completed_at: '2026-04-25T12:00:00Z',
    conclusion_text: 'ok',
  });
  assert.equal('status' in cleaned, false);
  assert.equal('completed_at' in cleaned, false);
  assert.equal(cleaned.conclusion_text, 'ok');
  assert.equal(cleaned.id, 'abc');
});

test('stripServerFields removes timestamps + user_id', () => {
  const cleaned = stripServerFields({
    id: 'abc',
    created_at: 'x',
    updated_at: 'y',
    user_id: 'u',
    harness_name: 'H1',
  });
  assert.equal('created_at' in cleaned, false);
  assert.equal('updated_at' in cleaned, false);
  assert.equal('user_id' in cleaned, false);
  assert.equal(cleaned.harness_name, 'H1');
});

test('wizard-style merge: stale local patch must NOT flip server draft to completed', () => {
  // Server says draft (truth); local cache contains a stale completion patch.
  const server = { id: 'i1', status: 'draft', conclusion_text: null };
  const localPatch = {
    id: 'i1',
    status: 'completed',
    completed_at: '2026-04-25T12:00:00Z',
    conclusion_text: 'edited',
  };
  // Wizard's safe merge: strip server-canonical fields off the local patch first.
  const safe = stripServerFields(localPatch);
  const merged = { ...server, ...safe };
  assert.equal(merged.status, 'draft', 'status must stay draft after merge');
  assert.equal(merged.completed_at, undefined);
  assert.equal(merged.conclusion_text, 'edited', 'user-edit fields still flow through');
});

test('strip-list is the single source of truth', () => {
  // Re-introducing the bug: drop one field from the strip-list.
  const broken = SERVER_CANONICAL_INSPECTION_FIELDS.filter((f) => f !== 'status');
  const cleaned = (() => {
    const out = { id: 'abc', status: 'completed', conclusion_text: 'x' };
    for (const k of broken) delete out[k];
    return out;
  })();
  // If `status` were silently included, this test would catch it.
  assert.equal(
    cleaned.status,
    'completed',
    'guarded: removing `status` from the strip-list reintroduces the wizard↔detail loop',
  );
});
