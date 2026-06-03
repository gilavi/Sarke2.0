import { describe, it, expect } from 'vitest';
import { TERMS_VERSION, TERMS_PUBLIC_URL, termsKa, termsEn } from '../../lib/terms';

describe('terms', () => {
  describe('constants', () => {
    it('TERMS_VERSION is an ISO date (YYYY-MM-DD)', () => {
      expect(TERMS_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('TERMS_PUBLIC_URL is the canonical hubble.ge URL', () => {
      expect(TERMS_PUBLIC_URL).toBe('https://hubble.ge/terms');
    });
  });

  describe('termsKa', () => {
    it('has Georgian heading and action labels', () => {
      expect(termsKa.heading).toBe('წესები და პირობები');
      expect(termsKa.agreeLabel).toBe('ვეთანხმები');
      expect(termsKa.declineLabel).toBe('უარი');
      expect(termsKa.linkLabel).toBe('სრული ტექსტი');
    });

    it('includes the current TERMS_VERSION in the updated string', () => {
      expect(termsKa.updated).toContain(TERMS_VERSION);
    });

    it('every section has a non-empty title and body', () => {
      expect(termsKa.sections.length).toBeGreaterThan(0);
      for (const section of termsKa.sections) {
        expect(section.title.length).toBeGreaterThan(0);
        expect(section.body.length).toBeGreaterThan(0);
      }
    });
  });

  describe('termsEn', () => {
    it('has English heading and action labels', () => {
      expect(termsEn.heading).toBe('Terms & Conditions');
      expect(termsEn.agreeLabel).toBe('I agree');
      expect(termsEn.declineLabel).toBe('Decline');
      expect(termsEn.linkLabel).toBe('Full text');
    });

    it('includes the current TERMS_VERSION in the updated string', () => {
      expect(termsEn.updated).toContain(TERMS_VERSION);
    });

    it('every section has a non-empty title and body', () => {
      expect(termsEn.sections.length).toBeGreaterThan(0);
      for (const section of termsEn.sections) {
        expect(section.title.length).toBeGreaterThan(0);
        expect(section.body.length).toBeGreaterThan(0);
      }
    });
  });

  describe('parity between languages', () => {
    it('Georgian and English have the same number of sections (regression guard)', () => {
      expect(termsKa.sections.length).toBe(termsEn.sections.length);
    });
  });
});
