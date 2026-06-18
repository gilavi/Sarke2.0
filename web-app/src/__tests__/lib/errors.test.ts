import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { toast } from 'sonner';
import { humanizeError, isTransientError, rawErrorMessage, toastError } from '@/lib/errors';

describe('rawErrorMessage', () => {
  it('extracts Error.message and stringifies non-errors', () => {
    expect(rawErrorMessage(new Error('boom'))).toBe('boom');
    expect(rawErrorMessage('plain')).toBe('plain');
    expect(rawErrorMessage(null)).toBe('');
    expect(rawErrorMessage(undefined)).toBe('');
  });
});

describe('humanizeError', () => {
  const cases: Array<[string, string]> = [
    ['new row violates row-level security policy', 'ამ მოქმედების ნებართვა არ გაქვთ.'],
    ['permission denied for table reports', 'ამ მოქმედების ნებართვა არ გაქვთ.'],
    ['არაავტორიზებული', 'სესია ამოიწურა - გთხოვთ, თავიდან შეხვიდეთ.'],
    ['JWT expired', 'სესია ამოიწურა - გთხოვთ, თავიდან შეხვიდეთ.'],
    ['Payload too large', 'ფაილი ძალიან დიდია - სცადეთ უფრო პატარა ფაილი.'],
    ['Failed to fetch', 'ქსელთან დაკავშირება ვერ მოხერხდა. შეამოწმეთ ინტერნეტი და სცადეთ თავიდან.'],
    ['duplicate key value violates unique constraint', 'ასეთი ჩანაწერი უკვე არსებობს.'],
    ['Email rate limit exceeded', 'ძალიან ბევრი მცდელობა - ცადეთ ცოტა ხანში.'],
  ];

  it.each(cases)('maps %s to localized copy', (raw, expected) => {
    expect(humanizeError(new Error(raw))).toBe(expected);
  });

  it('falls back to the generic message for unknown and empty errors', () => {
    expect(humanizeError(new Error('something weird'))).toBe('დაფიქსირდა შეცდომა. სცადეთ თავიდან.');
    expect(humanizeError(new Error(''))).toBe('დაფიქსირდა შეცდომა. სცადეთ თავიდან.');
    expect(humanizeError(null)).toBe('დაფიქსირდა შეცდომა. სცადეთ თავიდან.');
  });
});

describe('isTransientError', () => {
  it('is true for network/timeout/5xx failures', () => {
    expect(isTransientError(new Error('Failed to fetch'))).toBe(true);
    expect(isTransientError(new Error('request timed out'))).toBe(true);
    expect(isTransientError(new Error('503 Service Unavailable'))).toBe(true);
  });
  it('is false for RLS / duplicate / validation errors (must not retry)', () => {
    expect(isTransientError(new Error('new row violates row-level security policy'))).toBe(false);
    expect(isTransientError(new Error('duplicate key value violates unique constraint'))).toBe(false);
    expect(isTransientError(new Error('არაავტორიზებული'))).toBe(false);
  });
});

describe('toastError', () => {
  beforeEach(() => vi.clearAllMocks());

  it('logs the raw error and toasts the humanized message', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('new row violates row-level security policy');
    toastError(err);
    expect(spy).toHaveBeenCalledWith(err);
    expect(toast.error).toHaveBeenCalledWith('ამ მოქმედების ნებართვა არ გაქვთ.');
    spy.mockRestore();
  });
});
