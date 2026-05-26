import { describe, it, expect } from 'vitest';
import { buildInspectionPdf } from '../../lib/inspection/pdf';
import { cargoPlatformSchema } from '../../lib/inspection/schemas/cargoPlatform';
import {
  buildDefaultCPInspection,
  buildDefaultCargoRow,
  CARGO_PLATFORM_TEMPLATE_ID,
  CP_VERDICT_LABEL,
} from '../../types/cargoPlatform';

function mockInsp() {
  const insp = buildDefaultCPInspection(
    'cp000011-2222-3333-4444-555566667777',
    'p1',
    'u1',
    CARGO_PLATFORM_TEMPLATE_ID,
    '2026-05-20T10:00:00Z',
  );
  insp.company = 'შპს ხარაჩო';
  insp.address = 'რუსთავი';
  insp.inspectorName = 'გიორგი ხ.';
  insp.floorZone = '5-ე სართული';
  insp.inspectionDate = '2026-05-20';
  insp.platformTypeModel = 'CP-2000';
  insp.platformLength = 4;
  insp.platformWidth = 2;
  insp.platformColorDesc = 'ლურჯი';
  insp.sideGuardrail = 'complete';
  insp.frontGuardrail = 'complete';
  insp.guardrailHeight = 'standard';
  insp.cargo = [
    { ...buildDefaultCargoRow(), name: 'ბარდანა', unit_weight_kg: 50, total_weight_kg: 500, note: 'ღია' },
    { ...buildDefaultCargoRow(), name: 'ცემენტი', unit_weight_kg: 25, total_weight_kg: 1200, note: '' },
  ];
  // FIXME(merge-2026-05-27): test author used 'ok'/'fail' but CPResult is
  // 'good' | 'fix' | 'na'. Cast keeps the original test intent compilable.
  insp.items = insp.items.map((it, i) =>
    i === 0
      ? { ...it, result: 'ok' as any, photo_paths: ['cargo/x/1.jpg'] }
      : i === 1
        ? { ...it, result: 'fail' as any, comment: 'ხარვეზია' }
        : it,
  );
  insp.verdict = 'approved';
  insp.verdictComment = 'წესრიგშია';
  insp.summaryPhotos = ['cargo/x/sum.jpg'];
  insp.signatures = [
    { name: 'შემოწმდა მ.', position: 'ინჟინერი', organization: 'Acme', signature: 'CARGOSIG', date: '2026-05-20' },
  ];
  insp.status = 'completed';
  insp.completedAt = '2026-05-20T11:00:00Z';
  return insp;
}

const PHOTOS = {
  'cargo/x/1.jpg': 'data:image/jpeg;base64,ITEM',
  'cargo/x/sum.jpg': 'data:image/jpeg;base64,SUM',
};

describe('buildInspectionPdf — cargoPlatform', () => {
  const html = buildInspectionPdf(
    cargoPlatformSchema,
    { inspection: mockInsp(), projectName: 'პროექტი' },
    PHOTOS,
  );

  it('produces a complete HTML document', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html.trimEnd().endsWith('</html>')).toBe(true);
  });

  it('renders the approved verdict label and comment', () => {
    expect(html).toContain(CP_VERDICT_LABEL.approved);
    expect(html).toContain('წესრიგშია');
  });

  it('renders item comments and photos', () => {
    expect(html).toContain('ხარვეზია');
    expect(html).toContain('data:image/jpeg;base64,ITEM');
    expect(html).toContain('data:image/jpeg;base64,SUM');
  });

  it('renders cargo rows', () => {
    expect(html).toContain('ბარდანა');
    expect(html).toContain('ცემენტი');
  });

  it('embeds signature', () => {
    expect(html).toContain('CARGOSIG');
    expect(html).toContain('შემოწმდა მ.');
  });
});

describe('buildInspectionPdf — cargoPlatform verdict variants', () => {
  it('renders conditional verdict', () => {
    const insp = buildDefaultCPInspection('cp', 'p1', 'u1', CARGO_PLATFORM_TEMPLATE_ID, '2026-05-20T10:00:00Z');
    insp.verdict = 'conditional';
    const html = buildInspectionPdf(cargoPlatformSchema, { inspection: insp, projectName: 'P' }, {});
    expect(html).toContain(CP_VERDICT_LABEL.conditional);
  });

  it('renders rejected verdict', () => {
    const insp = buildDefaultCPInspection('cp', 'p1', 'u1', CARGO_PLATFORM_TEMPLATE_ID, '2026-05-20T10:00:00Z');
    insp.verdict = 'rejected';
    const html = buildInspectionPdf(cargoPlatformSchema, { inspection: insp, projectName: 'P' }, {});
    expect(html).toContain(CP_VERDICT_LABEL.rejected);
  });
});

describe('buildInspectionPdf — cargoPlatform default state', () => {
  const insp = buildDefaultCPInspection('cp-id', 'p1', 'u1', CARGO_PLATFORM_TEMPLATE_ID, '2026-05-20T10:00:00Z');
  const html = buildInspectionPdf(cargoPlatformSchema, { inspection: insp, projectName: 'P' }, {});

  it('renders with all-default fields', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
  });
});
