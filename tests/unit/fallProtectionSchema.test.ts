import { describe, it, expect } from 'vitest';
import { buildInspectionPdf } from '../../lib/inspection/pdf';
import { fallProtectionSchema } from '../../lib/inspection/schemas/fallProtection';
import {
  buildDefaultFallProtectionInspection,
  FALL_PROTECTION_TEMPLATE_ID,
} from '../../types/fallProtection';

function mockInsp() {
  const insp = buildDefaultFallProtectionInspection(
    'fp000011-2222-3333-4444-555566667777',
    'p1',
    'u1',
    FALL_PROTECTION_TEMPLATE_ID,
    '2026-05-20T10:00:00Z',
  );
  insp.company = 'შპს Acme';
  insp.address = 'ბათუმი';
  insp.inspectionDate = '2026-05-20';
  insp.safetyLeaderName = 'გიორგი ხ.';
  insp.safetyLeaderPhone = '+995555111222';
  insp.inspectionType = 'primary';
  insp.nextInspectionDate = '2027-05-20';
  // Mark first device's first item as critical with comment
  if (insp.deviceData[0]) {
    insp.deviceData[0].items[0] = {
      ...insp.deviceData[0].items[0],
      result: 'critical',
      comment: 'გადასაცვლელია',
      photo_paths: ['fp/x/d1/1.jpg'],
    };
    insp.deviceData[0].items[1] = {
      ...insp.deviceData[0].items[1],
      result: 'safe',
      comment: null,
      photo_paths: [],
    };
    insp.deviceData[0].verdict = 'safe';
    insp.deviceData[0].verdictComment = 'შენიშვნა';
    insp.deviceData[0].photoPaths = ['fp/x/d1/sum.jpg'];
  }
  insp.signature = {
    name: 'შემოწმდა მ.',
    position: 'ინჟინერი',
    signature: 'AAAAAAAA',
    date: '2026-05-20',
  };
  insp.status = 'completed';
  insp.completedAt = '2026-05-20T11:00:00Z';
  return insp;
}

const PHOTOS = {
  'fp/x/d1/1.jpg': 'data:image/jpeg;base64,ITEM',
  'fp/x/d1/sum.jpg': 'data:image/jpeg;base64,SUM',
};

describe('buildInspectionPdf - fallProtection', () => {
  const html = buildInspectionPdf(
    fallProtectionSchema,
    { inspection: mockInsp(), projectName: 'პროექტი' },
    PHOTOS,
  );

  it('produces a complete HTML document', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html.trimEnd().endsWith('</html>')).toBe(true);
  });

  it('includes the per-item comment and photo', () => {
    expect(html).toContain('გადასაცვლელია');
    expect(html).toContain('data:image/jpeg;base64,ITEM');
    expect(html).toContain('data:image/jpeg;base64,SUM');
  });

  it('renders the signature name and signature image', () => {
    expect(html).toContain('შემოწმდა მ.');
    expect(html).toContain('AAAAAAAA');
  });
});

describe('buildInspectionPdf - fallProtection default state', () => {
  const insp = buildDefaultFallProtectionInspection(
    'fp-id',
    'p1',
    'u1',
    FALL_PROTECTION_TEMPLATE_ID,
    '2026-05-20T10:00:00Z',
  );
  const html = buildInspectionPdf(fallProtectionSchema, { inspection: insp, projectName: 'P' }, {});

  it('renders with all-default state', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html.trimEnd().endsWith('</html>')).toBe(true);
  });
});
