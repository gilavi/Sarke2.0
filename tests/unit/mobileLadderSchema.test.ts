import { describe, it, expect } from 'vitest';
import { buildInspectionPdf } from '../../lib/inspection/pdf';
import { mobileLadderSchema } from '../../lib/inspection/schemas/mobileLadder';
import {
  buildDefaultMLInspection,
  MOBILE_LADDER_TEMPLATE_ID,
  ML_VERDICT_LABELS,
} from '../../types/mobileLadder';

function mockInsp() {
  const insp = buildDefaultMLInspection(
    'ml000011-2222-3333-4444-555566667777',
    'p1',
    'u1',
    MOBILE_LADDER_TEMPLATE_ID,
    '2026-05-20T10:00:00Z',
  );
  insp.company = 'შპს Acme';
  insp.address = 'ბათუმი';
  insp.inspectionDate = '2026-05-20';
  insp.inspectorName = 'გიორგი ხ.';
  insp.items = insp.items.map((it, i) =>
    i === 0
      ? { ...it, result: 'safe', photo_paths: ['ml/x/1.jpg'] }
      : i === 1
        ? { ...it, result: 'critical', comment: 'გაუმართავია' }
        : it,
  );
  insp.verdict = 'safe';
  insp.verdictComment = 'წესრიგშია';
  insp.signature = {
    name: 'შემოწმდა მ.',
    position: 'ინჟინერი',
    signature: 'MLSIGNATURE',
    date: '2026-05-20',
  };
  insp.summaryPhotos = ['ml/x/sum.jpg'];
  insp.status = 'completed';
  insp.completedAt = '2026-05-20T11:00:00Z';
  return insp;
}

const PHOTOS = {
  'ml/x/1.jpg': 'data:image/jpeg;base64,ITEM',
  'ml/x/sum.jpg': 'data:image/jpeg;base64,SUM',
};

describe('buildInspectionPdf — mobileLadder', () => {
  const html = buildInspectionPdf(
    mobileLadderSchema,
    { inspection: mockInsp(), projectName: 'პროექტი' },
    PHOTOS,
  );

  it('produces a complete HTML document', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html.trimEnd().endsWith('</html>')).toBe(true);
  });

  it('renders the safe verdict label and comment', () => {
    expect(html).toContain(ML_VERDICT_LABELS.safe);
    expect(html).toContain('წესრიგშია');
  });

  it('renders item comments and item-level photos', () => {
    expect(html).toContain('გაუმართავია');
    expect(html).toContain('data:image/jpeg;base64,ITEM');
  });

  it('embeds signature', () => {
    expect(html).toContain('MLSIGNATURE');
    expect(html).toContain('შემოწმდა მ.');
  });
});

describe('buildInspectionPdf — mobileLadder verdict variants', () => {
  it('renders minor verdict', () => {
    const insp = buildDefaultMLInspection('ml', 'p1', 'u1', MOBILE_LADDER_TEMPLATE_ID, '2026-05-20T10:00:00Z');
    insp.verdict = 'minor';
    const html = buildInspectionPdf(mobileLadderSchema, { inspection: insp, projectName: 'P' }, {});
    expect(html).toContain(ML_VERDICT_LABELS.minor);
  });

  it('renders banned verdict', () => {
    const insp = buildDefaultMLInspection('ml', 'p1', 'u1', MOBILE_LADDER_TEMPLATE_ID, '2026-05-20T10:00:00Z');
    insp.verdict = 'banned';
    const html = buildInspectionPdf(mobileLadderSchema, { inspection: insp, projectName: 'P' }, {});
    expect(html).toContain(ML_VERDICT_LABELS.banned);
  });
});

describe('buildInspectionPdf — mobileLadder default state', () => {
  const insp = buildDefaultMLInspection('ml-id', 'p1', 'u1', MOBILE_LADDER_TEMPLATE_ID, '2026-05-20T10:00:00Z');
  const html = buildInspectionPdf(mobileLadderSchema, { inspection: insp, projectName: 'P' }, {});

  it('renders with all-default fields', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
  });
});
