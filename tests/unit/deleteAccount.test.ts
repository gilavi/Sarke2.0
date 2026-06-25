/**
 * Unit tests for `deleteAccount` error surfacing (lib/profileService.ts).
 *
 * supabase-js wraps any non-2xx Edge Function response in a FunctionsHttpError
 * whose `.message` is the opaque "Edge Function returned a non-2xx status code"
 * and whose `.context` is the Response carrying the real `{ error: "<reason>" }`
 * body. `deleteAccount` must dig the real reason out so the profile screen's
 * toast (and our logs) show what actually failed — this is what made the
 * breathalyzer-FK account-deletion bug invisible.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const invoke = vi.fn();
vi.mock('../../lib/supabase', () => ({
  supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } },
}));

const { deleteAccount } = await import('../../lib/profileService');

beforeEach(() => invoke.mockReset());

describe('deleteAccount', () => {
  it('resolves when the function returns no error', async () => {
    invoke.mockResolvedValue({ data: { ok: true }, error: null });
    await expect(deleteAccount()).resolves.toBeUndefined();
  });

  it('throws the real reason from the error response body', async () => {
    const httpError = {
      message: 'Edge Function returned a non-2xx status code',
      context: { json: () => Promise.resolve({ error: 'violates foreign key constraint' }) },
    };
    invoke.mockResolvedValue({ data: null, error: httpError });
    await expect(deleteAccount()).rejects.toThrow('violates foreign key constraint');
  });

  it('falls back to the original error when the body is not JSON', async () => {
    const httpError = {
      message: 'Edge Function returned a non-2xx status code',
      context: { json: () => Promise.reject(new Error('Unexpected token')) },
    };
    invoke.mockResolvedValue({ data: null, error: httpError });
    await expect(deleteAccount()).rejects.toThrow('Edge Function returned a non-2xx status code');
  });

  it('falls back to the original error when there is no readable context', async () => {
    const plainError = { message: 'network down' };
    invoke.mockResolvedValue({ data: null, error: plainError });
    await expect(deleteAccount()).rejects.toThrow('network down');
  });
});
