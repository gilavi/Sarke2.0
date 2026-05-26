import { describe, it, expect } from 'vitest';
import {
  inspectionDisplayName,
  reportDisplayName,
  certificateDisplayName,
  orderDisplayName,
} from '../../lib/shared/documentName';

describe('documentName', () => {
  describe('inspectionDisplayName', () => {
    it('maps known long template names to their short form', () => {
      expect(inspectionDisplayName('ფასადის ხარაჩოს შემოწმების აქტი')).toBe('ფასადის ხარაჩო');
      expect(inspectionDisplayName('მობილური ხარაჩოს შემოწმების აქტი')).toBe('მობილური ხარაჩო');
      expect(inspectionDisplayName('მობილური ხარაჩოს შემოწმების აქტი N3')).toBe('მობილური ხარაჩო N3');
      expect(inspectionDisplayName('დამცავი ქამრების შემოწმების აქტი')).toBe('დამცავი ქამრები');
      expect(inspectionDisplayName('ციცხვიანი დამტვირთველის შემოწმების აქტი')).toBe('ციცხვიანი დამტვირთველი');
      expect(inspectionDisplayName('დიდი ციცხვიანი დამტვირთველის შემოწმება')).toBe('დიდი ციცხვიანი დამტვირთველი');
      expect(inspectionDisplayName('ექსკავატორის ტექნიკური შემოწმების აქტი')).toBe('ექსკავატორი');
      expect(inspectionDisplayName('ტექნიკური აღჭურვილობის შემოწმების აქტი')).toBe('ტექნიკური აღჭურვილობა');
      expect(inspectionDisplayName('ტვირთის მიმღები პლატფორმის შემოწმების აქტი')).toBe('ტვირთის მიმღები პლატფორმა');
    });

    it('passes through unknown templates unchanged', () => {
      expect(inspectionDisplayName('Custom template')).toBe('Custom template');
      expect(inspectionDisplayName('ახალი შაბლონი')).toBe('ახალი შაბლონი');
    });

    it('trims whitespace before lookup', () => {
      expect(inspectionDisplayName('  ექსკავატორის ტექნიკური შემოწმების აქტი  ')).toBe('ექსკავატორი');
    });

    it('falls back to default Georgian label for null/undefined/empty', () => {
      expect(inspectionDisplayName(null)).toBe('შემოწმების აქტი');
      expect(inspectionDisplayName(undefined)).toBe('შემოწმების აქტი');
      expect(inspectionDisplayName('')).toBe('შემოწმების აქტი');
      expect(inspectionDisplayName('   ')).toBe('შემოწმების აქტი');
    });
  });

  describe('reportDisplayName', () => {
    it('returns trimmed title when provided', () => {
      expect(reportDisplayName('Daily report')).toBe('Daily report');
      expect(reportDisplayName('  ანგარიში  ')).toBe('ანგარიში');
    });

    it('falls back to Georgian label for null/undefined/empty', () => {
      expect(reportDisplayName(null)).toBe('რეპორტი');
      expect(reportDisplayName(undefined)).toBe('რეპორტი');
      expect(reportDisplayName('')).toBe('რეპორტი');
      expect(reportDisplayName('   ')).toBe('რეპორტი');
    });
  });

  describe('certificateDisplayName', () => {
    it('returns trimmed conclusion text when provided', () => {
      expect(certificateDisplayName('Conclusion A')).toBe('Conclusion A');
      expect(certificateDisplayName('  დასკვნა  ')).toBe('დასკვნა');
    });

    it('falls back to Georgian label for null/undefined/empty', () => {
      expect(certificateDisplayName(null)).toBe('სერტიფიკატი');
      expect(certificateDisplayName(undefined)).toBe('სერტიფიკატი');
      expect(certificateDisplayName('')).toBe('სერტიფიკატი');
      expect(certificateDisplayName('   ')).toBe('სერტიფიკატი');
    });
  });

  describe('orderDisplayName', () => {
    it('returns trimmed type label when provided', () => {
      expect(orderDisplayName('Order type X')).toBe('Order type X');
      expect(orderDisplayName('  ბრძანების ტიპი  ')).toBe('ბრძანების ტიპი');
    });

    it('falls back to Georgian label for null/undefined/empty', () => {
      expect(orderDisplayName(null)).toBe('ბრძანება');
      expect(orderDisplayName(undefined)).toBe('ბრძანება');
      expect(orderDisplayName('')).toBe('ბრძანება');
      expect(orderDisplayName('   ')).toBe('ბრძანება');
    });
  });
});
