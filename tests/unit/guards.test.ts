import { describe, it, expect } from 'vitest';
import { isProject, isTemplate, isQuestion, isInspection, isAnswer, assertShape } from '../../lib/guards';

describe('guards', () => {
  describe('isProject', () => {
    it('returns true for valid project shape', () => {
      expect(isProject({ id: '1', user_id: 'u1', name: 'Test' })).toBe(true);
    });

    it('returns false for invalid shapes', () => {
      expect(isProject(null)).toBe(false);
      expect(isProject(undefined)).toBe(false);
      expect(isProject('string')).toBe(false);
      expect(isProject([])).toBe(false);
      expect(isProject({ id: '1' })).toBe(false); // missing user_id and name
      expect(isProject({ id: 1, user_id: 'u1', name: 'Test' })).toBe(false); // wrong id type
    });
  });

  describe('isTemplate', () => {
    it('returns true for valid template shape', () => {
      expect(isTemplate({ id: '1', name: 'Template' })).toBe(true);
    });

    it('returns false for invalid shapes', () => {
      expect(isTemplate(null)).toBe(false);
      expect(isTemplate({ name: 'Template' })).toBe(false);
    });
  });

  describe('isQuestion', () => {
    it('returns true for valid question shape', () => {
      expect(isQuestion({ id: '1', template_id: 't1', type: 'text', title: 'Q1' })).toBe(true);
    });

    it('returns false for missing fields', () => {
      expect(isQuestion({ id: '1', template_id: 't1' })).toBe(false);
    });
  });

  describe('isInspection', () => {
    it('returns true for valid inspection with draft status', () => {
      expect(isInspection({ id: '1', template_id: 't1', user_id: 'u1', status: 'draft' })).toBe(true);
    });

    it('returns true for valid inspection with completed status', () => {
      expect(isInspection({ id: '1', template_id: 't1', user_id: 'u1', status: 'completed' })).toBe(true);
    });

    it('returns false for invalid status', () => {
      expect(isInspection({ id: '1', template_id: 't1', user_id: 'u1', status: 'invalid' })).toBe(false);
    });
  });

  describe('isAnswer', () => {
    it('returns true for valid answer shape', () => {
      expect(isAnswer({ id: '1', inspection_id: 'i1', question_id: 'q1' })).toBe(true);
    });

    it('returns false for missing fields', () => {
      expect(isAnswer({ id: '1' })).toBe(false);
    });
  });

  describe('assertShape', () => {
    it('returns value when guard passes', () => {
      const value = { id: '1', user_id: 'u1', name: 'Test' };
      expect(assertShape(value, isProject, 'test')).toEqual(value);
    });

    it('throws when guard fails', () => {
      expect(() => assertShape(null, isProject, 'boundary')).toThrow('shape mismatch at boundary');
    });
  });
});
