import { describe, it, expect } from 'vitest';
import {
  inspectionDisplayName,
  reportDisplayName,
  certificateDisplayName,
  orderDisplayName,
} from '@root/lib/shared/documentName';

describe('documentName (shared mobile + web)', () => {
  it('passes through a non-empty name', () => {
    expect(inspectionDisplayName('დამცავი ქამრები')).toBe('დამცავი ქამრები');
    expect(reportDisplayName('კვირის რეპორტი')).toBe('კვირის რეპორტი');
    expect(certificateDisplayName('სერტ. 2024')).toBe('სერტ. 2024');
    expect(orderDisplayName('შრომის ბრძანება')).toBe('შრომის ბრძანება');
  });

  it('trims surrounding whitespace', () => {
    expect(inspectionDisplayName('  ხარაჩო  ')).toBe('ხარაჩო');
  });

  it('falls back on null / undefined / empty / whitespace', () => {
    for (const empty of [null, undefined, '', '   ']) {
      expect(inspectionDisplayName(empty)).toBe('შემოწმების აქტი');
      expect(reportDisplayName(empty)).toBe('რეპორტი');
      expect(certificateDisplayName(empty)).toBe('სერტიფიკატი');
      expect(orderDisplayName(empty)).toBe('ბრძანება');
    }
  });
});
