import { describe, it, expect } from 'vitest';
import {
  REQUIRED_TYPES,
  REQUIRED_TYPE_VALUES,
  labelForType,
} from '../../lib/qualificationTypes';

describe('qualificationTypes', () => {
  describe('REQUIRED_TYPES', () => {
    it('contains the expected 4 entries', () => {
      expect(REQUIRED_TYPES).toHaveLength(4);
    });

    it('each entry has a non-empty value and label', () => {
      for (const t of REQUIRED_TYPES) {
        expect(typeof t.value).toBe('string');
        expect(t.value.length).toBeGreaterThan(0);
        expect(typeof t.label).toBe('string');
        expect(t.label.length).toBeGreaterThan(0);
      }
    });
  });

  describe('REQUIRED_TYPE_VALUES', () => {
    it('is a Set with one entry per REQUIRED_TYPES item', () => {
      expect(REQUIRED_TYPE_VALUES).toBeInstanceOf(Set);
      expect(REQUIRED_TYPE_VALUES.size).toBe(REQUIRED_TYPES.length);
    });

    it('contains every known value', () => {
      expect(REQUIRED_TYPE_VALUES.has('xaracho_specialist')).toBe(true);
      expect(REQUIRED_TYPE_VALUES.has('labor_safety_specialist')).toBe(true);
      expect(REQUIRED_TYPE_VALUES.has('electrician')).toBe(true);
      expect(REQUIRED_TYPE_VALUES.has('rigger')).toBe(true);
    });

    it('does not contain unknown values', () => {
      expect(REQUIRED_TYPE_VALUES.has('unknown_type')).toBe(false);
    });
  });

  describe('labelForType', () => {
    it('returns the Georgian label for known values', () => {
      expect(labelForType('xaracho_specialist')).toBe('ხარაჩოს სპეციალისტის სერტიფიკატი');
      expect(labelForType('labor_safety_specialist')).toBe('შრომის უსაფრთხოების სპეციალისტის სერტიფიკატი');
      expect(labelForType('electrician')).toBe('ელექტრიკის სერტიფიკატი');
      expect(labelForType('rigger')).toBe('მეჯამბარის სერტიფიკატი');
    });

    it('falls through to the raw value for unknown types', () => {
      expect(labelForType('unknown_type')).toBe('unknown_type');
      expect(labelForType('')).toBe('');
    });
  });
});
