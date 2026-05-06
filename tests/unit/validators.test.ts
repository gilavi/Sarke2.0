import { describe, it, expect } from 'vitest';
import { isEmail, isGeorgianPhone, normalizePhone } from '../../lib/validators';

describe('validators', () => {
  describe('isEmail', () => {
    it('returns true for valid emails', () => {
      expect(isEmail('test@example.com')).toBe(true);
      expect(isEmail('user.name+tag@domain.co.uk')).toBe(true);
      expect(isEmail('a@b.c')).toBe(true);
    });

    it('returns false for invalid emails', () => {
      expect(isEmail('')).toBe(false);
      expect(isEmail('notanemail')).toBe(false);
      expect(isEmail('@nodomain.com')).toBe(false);
      expect(isEmail('spaces in@email.com')).toBe(false);
      expect(isEmail(null as any)).toBe(false);
      expect(isEmail(undefined as any)).toBe(false);
    });

    it('trims whitespace before validating', () => {
      expect(isEmail('  test@example.com  ')).toBe(true);
    });
  });

  describe('isGeorgianPhone', () => {
    it('returns true for valid mobile numbers', () => {
      expect(isGeorgianPhone('599123456')).toBe(true);
      expect(isGeorgianPhone('5 99 12 34 56')).toBe(true);
      expect(isGeorgianPhone('5-99-123-456')).toBe(true);
      expect(isGeorgianPhone('+995599123456')).toBe(true);
      expect(isGeorgianPhone('995599123456')).toBe(true);
    });

    it('returns true for valid landline numbers', () => {
      expect(isGeorgianPhone('322123456')).toBe(true);
      expect(isGeorgianPhone('3 22 12 34 56')).toBe(true);
      expect(isGeorgianPhone('+995322123456')).toBe(true);
    });

    it('returns false for invalid numbers', () => {
      expect(isGeorgianPhone('')).toBe(false);
      expect(isGeorgianPhone('123456789')).toBe(false);
      expect(isGeorgianPhone('59912345')).toBe(false); // too short
      expect(isGeorgianPhone('5991234567')).toBe(false); // too long
      expect(isGeorgianPhone('abc')).toBe(false);
    });
  });

  describe('normalizePhone', () => {
    it('returns E.164 format for valid numbers', () => {
      expect(normalizePhone('599123456')).toBe('+995599123456');
      expect(normalizePhone('5 99 12 34 56')).toBe('+995599123456');
      expect(normalizePhone('+995599123456')).toBe('+995599123456');
    });

    it('returns null for invalid numbers', () => {
      expect(normalizePhone('')).toBeNull();
      expect(normalizePhone('123')).toBeNull();
      expect(normalizePhone('abc')).toBeNull();
    });
  });
});
