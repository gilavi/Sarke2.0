import { describe, it, expect, beforeEach, vi } from 'vitest';

// certDirty holds a module-level Set<string> singleton. Each test re-imports a
// fresh module copy so the Set state never leaks across cases — the public API
// (markCertsDirty / consumeCertsDirty) is the only surface, and consume is a
// one-shot read-and-clear, so isolation matters for the order-independence rule.
let markCertsDirty: (id: string) => void;
let consumeCertsDirty: (id: string) => boolean;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import('../../lib/certDirty');
  markCertsDirty = mod.markCertsDirty;
  consumeCertsDirty = mod.consumeCertsDirty;
});

describe('consumeCertsDirty (unmarked)', () => {
  it('returns false for an id that was never marked', () => {
    expect(consumeCertsDirty('insp-1')).toBe(false);
  });

  it('returns false for the empty-string id when nothing is marked', () => {
    expect(consumeCertsDirty('')).toBe(false);
  });

  it('returns false for a different id than the one marked', () => {
    markCertsDirty('insp-A');
    expect(consumeCertsDirty('insp-B')).toBe(false);
  });

  it('does not clear an unrelated marked id when consuming a missing one', () => {
    markCertsDirty('insp-A');
    expect(consumeCertsDirty('insp-B')).toBe(false);
    // insp-A is still pending and consumable.
    expect(consumeCertsDirty('insp-A')).toBe(true);
  });
});

describe('markCertsDirty then consume', () => {
  it('returns true after marking the same id', () => {
    markCertsDirty('insp-1');
    expect(consumeCertsDirty('insp-1')).toBe(true);
  });

  it('marks and consumes the empty-string id', () => {
    markCertsDirty('');
    expect(consumeCertsDirty('')).toBe(true);
  });

  it('handles ids with special characters', () => {
    const id = 'insp/with:weird-id_42.x';
    markCertsDirty(id);
    expect(consumeCertsDirty(id)).toBe(true);
  });
});

describe('consume is one-shot (read-and-clear)', () => {
  it('returns true the first time then false the second time', () => {
    markCertsDirty('insp-1');
    expect(consumeCertsDirty('insp-1')).toBe(true);
    expect(consumeCertsDirty('insp-1')).toBe(false);
  });

  it('clears the flag so a third consume is also false', () => {
    markCertsDirty('insp-1');
    consumeCertsDirty('insp-1');
    expect(consumeCertsDirty('insp-1')).toBe(false);
    expect(consumeCertsDirty('insp-1')).toBe(false);
  });

  it('requires a fresh mark to consume again after it was cleared', () => {
    markCertsDirty('insp-1');
    expect(consumeCertsDirty('insp-1')).toBe(true);
    expect(consumeCertsDirty('insp-1')).toBe(false);
    markCertsDirty('insp-1');
    expect(consumeCertsDirty('insp-1')).toBe(true);
  });
});

describe('marking the same id twice', () => {
  it('still consumes only once (Set dedupes)', () => {
    markCertsDirty('insp-1');
    markCertsDirty('insp-1');
    expect(consumeCertsDirty('insp-1')).toBe(true);
    expect(consumeCertsDirty('insp-1')).toBe(false);
  });

  it('consumes once even after marking three times', () => {
    markCertsDirty('insp-1');
    markCertsDirty('insp-1');
    markCertsDirty('insp-1');
    expect(consumeCertsDirty('insp-1')).toBe(true);
    expect(consumeCertsDirty('insp-1')).toBe(false);
  });
});

describe('independent ids tracked separately', () => {
  it('consuming one id does not affect another', () => {
    markCertsDirty('insp-A');
    markCertsDirty('insp-B');
    expect(consumeCertsDirty('insp-A')).toBe(true);
    // B untouched by A's consume.
    expect(consumeCertsDirty('insp-B')).toBe(true);
  });

  it('each id is independently one-shot', () => {
    markCertsDirty('insp-A');
    markCertsDirty('insp-B');
    expect(consumeCertsDirty('insp-A')).toBe(true);
    expect(consumeCertsDirty('insp-A')).toBe(false);
    expect(consumeCertsDirty('insp-B')).toBe(true);
    expect(consumeCertsDirty('insp-B')).toBe(false);
  });

  it('tracks many distinct ids at once', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    ids.forEach((id) => markCertsDirty(id));
    ids.forEach((id) => expect(consumeCertsDirty(id)).toBe(true));
    ids.forEach((id) => expect(consumeCertsDirty(id)).toBe(false));
  });

  it('re-marking one id does not re-arm a sibling that was consumed', () => {
    markCertsDirty('insp-A');
    markCertsDirty('insp-B');
    expect(consumeCertsDirty('insp-A')).toBe(true);
    markCertsDirty('insp-A'); // re-arm A only
    expect(consumeCertsDirty('insp-B')).toBe(true);
    expect(consumeCertsDirty('insp-A')).toBe(true);
  });
});

describe('return type', () => {
  it('returns a strict boolean (not the Set or undefined)', () => {
    markCertsDirty('insp-1');
    const first = consumeCertsDirty('insp-1');
    const second = consumeCertsDirty('insp-1');
    expect(typeof first).toBe('boolean');
    expect(typeof second).toBe('boolean');
    expect(first).toBe(true);
    expect(second).toBe(false);
  });

  it('markCertsDirty returns undefined', () => {
    expect(markCertsDirty('insp-1')).toBeUndefined();
  });
});

describe('module state isolation', () => {
  it('starts clean after resetModules (no leakage from prior tests)', () => {
    // Without a mark in THIS test, every id should read false — proving the
    // beforeEach resetModules wiped the singleton Set.
    expect(consumeCertsDirty('insp-1')).toBe(false);
    expect(consumeCertsDirty('insp-A')).toBe(false);
    expect(consumeCertsDirty('insp-B')).toBe(false);
  });
});
