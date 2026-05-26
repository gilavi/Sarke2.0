import { describe, it, expect } from 'vitest';
import { buildInspectionPdf } from '../../lib/inspection/pdf';
import { forkliftSchema } from '../../lib/inspection/schemas/forklift';
import {
  buildDefaultForkliftItems,
  FORKLIFT_TEMPLATE_ID,
  FORKLIFT_VERDICT_LABEL,
  type ForkliftInspection,
} from '../../types/forklift';

function buildInspection(over: Partial<ForkliftInspection> = {}): ForkliftInspection {
  return {
    id: 'fl000011-2222-3333-4444-555566667777',
    projectId: 'p1',
    templateId: FORKLIFT_TEMPLATE_ID,
    userId: 'u1',
    status: 'completed',
    company: 'შპს ფორკლიფტი',
    address: 'რუსთავი',
    inventoryNumber: 'INV-001',
    brandModel: 'Toyota 8FG25',
    engineType: 'diesel',
    inspectionDate: '2026-05-20',
    inspectorName: 'გიორგი ხ.',
    items: buildDefaultForkliftItems().map((it, i) => {
      if (i === 0) return { ...it, result: 'good', photo_paths: ['forklift/x/1.jpg'] };
      if (i === 1) return { ...it, result: 'deficient', comment: 'ცვეთა' };
      if (i === 2) return { ...it, result: 'unusable', comment: 'გაუმართავია' };
      return it;
    }),
    verdict: 'approved',
    notes: 'წესრიგშია',
    summaryPhotos: ['forklift/x/sum.jpg'],
    qualDocPath: 'forklift/x/qual.pdf',
    signerName: 'შემოწმდა მ.',
    signerPosition: 'ინჟინერი',
    signerPhone: '+995555123456',
    signerSignature: 'BBBBBBBB',
    completedAt: '2026-05-20T11:00:00Z',
    createdAt: '2026-05-20T09:00:00Z',
    updatedAt: '2026-05-20T11:00:00Z',
    ...over,
  };
}

const PHOTOS = {
  'forklift/x/1.jpg': 'data:image/jpeg;base64,ITEM',
  'forklift/x/sum.jpg': 'data:image/jpeg;base64,SUM',
};

describe('buildInspectionPdf — forklift', () => {
  const html = buildInspectionPdf(
    forkliftSchema,
    { inspection: buildInspection(), projectName: 'პროექტი' },
    PHOTOS,
  );

  it('produces a complete HTML document', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html.trimEnd().endsWith('</html>')).toBe(true);
  });

  it('renders verdict and notes', () => {
    expect(html).toContain(FORKLIFT_VERDICT_LABEL.approved);
    expect(html).toContain('წესრიგშია');
  });

  it('renders item comments and photos', () => {
    expect(html).toContain('ცვეთა');
    expect(html).toContain('გაუმართავია');
    expect(html).toContain('data:image/jpeg;base64,ITEM');
    expect(html).toContain('data:image/jpeg;base64,SUM');
  });

  it('embeds extended signature block (name + position + phone)', () => {
    expect(html).toContain('შემოწმდა მ.');
    expect(html).toContain('ინჟინერი');
    expect(html).toContain('data:image/png;base64,BBBBBBBB');
  });
});

describe('buildInspectionPdf — forklift verdict variants', () => {
  it('renders limited verdict', () => {
    const html = buildInspectionPdf(
      forkliftSchema,
      { inspection: buildInspection({ verdict: 'limited' }), projectName: 'P' },
      {},
    );
    expect(html).toContain(FORKLIFT_VERDICT_LABEL.limited);
  });

  it('renders rejected verdict', () => {
    const html = buildInspectionPdf(
      forkliftSchema,
      { inspection: buildInspection({ verdict: 'rejected' }), projectName: 'P' },
      {},
    );
    expect(html).toContain(FORKLIFT_VERDICT_LABEL.rejected);
  });

  it('renders with null verdict', () => {
    const html = buildInspectionPdf(
      forkliftSchema,
      { inspection: buildInspection({ verdict: null, items: buildDefaultForkliftItems() }), projectName: 'P' },
      {},
    );
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
  });
});
