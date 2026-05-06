import { describe, it, expect } from 'vitest';
import { friendlyError, isEmailTakenError, isCancelledError } from '../../lib/errorMap';

describe('errorMap', () => {
  describe('friendlyError', () => {
    it('maps invalid credentials to Georgian message', () => {
      expect(friendlyError(new Error('Invalid login credentials'))).toBe('არასწორი ელ-ფოსტა ან პაროლი');
      expect(friendlyError('invalid credentials')).toBe('არასწორი ელ-ფოსტა ან პაროლი');
    });

    it('maps email not confirmed', () => {
      expect(friendlyError(new Error('Email not confirmed'))).toBe('გთხოვთ, დაადასტუროთ ელ-ფოსტა, შემდეგ სცადეთ შესვლა');
    });

    it('maps password too short', () => {
      expect(friendlyError(new Error('Password should be at least 6 characters'))).toBe('პაროლი უნდა შეიცავდეს მინიმუმ 6 სიმბოლოს');
    });

    it('maps rate limit errors', () => {
      expect(friendlyError(new Error('Rate limit exceeded'))).toBe('ძალიან ბევრი მცდელობა. მოიცადეთ და კვლავ სცადეთ');
      expect(friendlyError(new Error('Too many requests'))).toBe('ძალიან ბევრი მცდელობა. მოიცადეთ და კვლავ სცადეთ');
    });

    it('maps network errors', () => {
      expect(friendlyError(new Error('Network error'))).toBe('ქსელის შეცდომა. შეამოწმეთ ინტერნეტ კავშირი');
      expect(friendlyError(new Error('fetch failed'))).toBe('ქსელის შეცდომა. შეამოწმეთ ინტერნეტ კავშირი');
      expect(friendlyError(new Error('timeout'))).toBe('ქსელის შეცდომა. შეამოწმეთ ინტერნეტ კავშირი');
    });

    it('maps not found errors', () => {
      expect(friendlyError(new Error('Not found'))).toBe('მონაცემი ვერ მოიძებნა');
      expect(friendlyError(new Error('404'))).toBe('მონაცემი ვერ მოიძებნა');
    });

    it('maps permission errors', () => {
      expect(friendlyError(new Error('Permission denied'))).toBe('წვდომა აკრძალულია');
      expect(friendlyError(new Error('Forbidden'))).toBe('წვდომა აკრძალულია');
      expect(friendlyError(new Error('403'))).toBe('წვდომა აკრძალულია');
    });

    it('maps duplicate errors', () => {
      expect(friendlyError(new Error('duplicate key'))).toBe('უკვე არსებობს');
      expect(friendlyError(new Error('unique constraint'))).toBe('უკვე არსებობს');
    });

    it('returns fallback for unknown errors', () => {
      expect(friendlyError(new Error('Something weird'))).toBe('Something weird');
      expect(friendlyError(null)).toBe('უცნობი შეცდომა');
    });

    it('returns default fallback for truly unknown errors', () => {
      expect(friendlyError(new Error('Something weird'))).toBe('Something weird');
    });
  });

  describe('isEmailTakenError', () => {
    it('detects already registered errors', () => {
      expect(isEmailTakenError(new Error('User already registered'))).toBe(true);
      expect(isEmailTakenError(new Error('user already exists'))).toBe(true);
      expect(isEmailTakenError(new Error('Something else'))).toBe(false);
    });
  });

  describe('isCancelledError', () => {
    it('detects cancelled errors', () => {
      expect(isCancelledError(new Error('Operation was cancelled'))).toBe(true);
      expect(isCancelledError(new Error('Operation was canceled'))).toBe(true);
      expect(isCancelledError(new Error('Something else'))).toBe(false);
    });
  });
});
