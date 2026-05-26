import { describe, it, expect } from 'vitest';
import {
  REQUIRED_TYPES,
  REQUIRED_TYPE_VALUES,
  labelForType,
} from '../../lib/qualificationTypes';

describe('qualificationTypes', () => {
  describe('REQUIRED_TYPES', () => {
    it('contains the expected 5 entries', () => {
      expect(REQUIRED_TYPES).toHaveLength(5);
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
      expect(REQUIRED_TYPE_VALUES.has('xaracho_inspector')).toBe(true);
      expect(REQUIRED_TYPE_VALUES.has('harness_inspector')).toBe(true);
      expect(REQUIRED_TYPE_VALUES.has('tbd_3')).toBe(true);
      expect(REQUIRED_TYPE_VALUES.has('tbd_4')).toBe(true);
      expect(REQUIRED_TYPE_VALUES.has('tbd_5')).toBe(true);
    });

    it('does not contain unknown values', () => {
      expect(REQUIRED_TYPE_VALUES.has('unknown_type')).toBe(false);
    });
  });

  describe('labelForType', () => {
    it('returns the Georgian label for known values', () => {
      expect(labelForType('xaracho_inspector')).toBe('ხარაჩოს ინსპექტორი');
      expect(labelForType('harness_inspector')).toBe('ქამრების ინსპექტორი');
      expect(labelForType('tbd_3')).toBe('TBD 3');
      expect(labelForType('tbd_4')).toBe('TBD 4');
      expect(labelForType('tbd_5')).toBe('TBD 5');
    });

    it('falls through to the raw value for unknown types', () => {
      expect(labelForType('unknown_type')).toBe('unknown_type');
      expect(labelForType('')).toBe('');
    });
  });
});
