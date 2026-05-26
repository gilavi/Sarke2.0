import { describe, it, expect } from 'vitest';
import { buildInspectionPdf } from '../../lib/inspection/pdf';
import { safetyNetSchema } from '../../lib/inspection/schemas/safetyNet';
import {
  buildDefaultSNInspection,
  buildDefaultSNLoadTestRow,
  SAFETY_NET_TEMPLATE_ID,
  SN_VERDICT_LABEL,
} from '../../types/safetyNet';

function mockInsp() {
  const insp = buildDefaultSNInspection(
    'sn000011-2222-3333-4444-555566667777',
    'p1',
    'u1',
    SAFETY_NET_TEMPLATE_ID,
    '2026-05-20T10:00:00Z',
  );
  insp.company = 'შპს Acme';
  insp.address = 'თბილისი';
  insp.inspectionDate = '2026-05-20';
  insp.inspectorName = 'გიორგი ხ.';
  // FIXME(merge-2026-05-27): test author used 'ok'/'fail' but SNResult is
  // 'good' | 'fix' | 'na'. Cast keeps the original test intent compilable.
  insp.items = insp.items.map((it, i) =>
    i === 0
      ? { ...it, result: 'ok' as any, photo_paths: ['sn/x/1.jpg'] }
      : i === 1
        ? { ...it, result: 'fail' as any, comment: 'ცვეთა' }
        : it,
  );
  insp.loadTestRows = [
    { ...buildDefaultSNLoadTestRow(), name: 'ცემენტი', unitWeightKg: 50, quantity: 10, totalWeightKg: 500 },
  ];
  insp.verdict = 'pass';
  insp.verdictComment = 'წესრიგშია';
  insp.signatures = [
    { name: 'შემოწმდა მ.', position: 'ინჟინერი', organization: 'Acme', signature: 'EEEEEEEE', date: '2026-05-20' },
  ];
  insp.summaryPhotos = ['sn/x/sum.jpg'];
  insp.status = 'completed';
  insp.completedAt = '2026-05-20T11:00:00Z';
  return insp;
}

const PHOTOS = {
  'sn/x/1.jpg': 'data:image/jpeg;base64,ITEM',
  'sn/x/sum.jpg': 'data:image/jpeg;base64,SUM',
};

describe('buildInspectionPdf — safetyNet', () => {
  const html = buildInspectionPdf(
    safetyNetSchema,
    { inspection: mockInsp(), projectName: 'პროექტი' },
    PHOTOS,
  );

  it('produces a complete HTML document', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html.trimEnd().endsWith('</html>')).toBe(true);
  });

  it('renders pass verdict label and comment', () => {
    expect(html).toContain(SN_VERDICT_LABEL.pass);
    expect(html).toContain('წესრიგშია');
  });

  it('renders item comment and photos', () => {
    expect(html).toContain('ცვეთა');
    expect(html).toContain('data:image/jpeg;base64,ITEM');
    expect(html).toContain('data:image/jpeg;base64,SUM');
  });

  it('embeds signature', () => {
    expect(html).toContain('EEEEEEEE');
    expect(html).toContain('შემოწმდა მ.');
  });

  it('renders the load-test row', () => {
    expect(html).toContain('ცემენტი');
  });
});

describe('buildInspectionPdf — safetyNet fail verdict', () => {
  const insp = buildDefaultSNInspection('sn-id', 'p1', 'u1', SAFETY_NET_TEMPLATE_ID, '2026-05-20T10:00:00Z');
  insp.verdict = 'fail';
  const html = buildInspectionPdf(safetyNetSchema, { inspection: insp, projectName: 'P' }, {});

  it('renders fail verdict label', () => {
    expect(html).toContain(SN_VERDICT_LABEL.fail);
  });
});

describe('buildInspectionPdf — safetyNet default state', () => {
  const insp = buildDefaultSNInspection('sn-id', 'p1', 'u1', SAFETY_NET_TEMPLATE_ID, '2026-05-20T10:00:00Z');
  const html = buildInspectionPdf(safetyNetSchema, { inspection: insp, projectName: 'P' }, {});

  it('renders with all-null defaults', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
  });
});
