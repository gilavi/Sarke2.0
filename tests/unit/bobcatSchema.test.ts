import { describe, it, expect } from 'vitest';
import { buildInspectionPdf } from '../../lib/inspection/pdf';
import { bobcatSchema } from '../../lib/inspection/schemas/bobcat';
import {
  buildDefaultItems,
  BOBCAT_ITEMS,
  LARGE_LOADER_ITEMS,
  BOBCAT_TEMPLATE_ID,
  LARGE_LOADER_TEMPLATE_ID,
  VERDICT_LABEL,
  type BobcatInspection,
} from '../../types/bobcat';

function buildInspection(over: Partial<BobcatInspection> = {}): BobcatInspection {
  return {
    id: 'bb000000-1111-2222-3333-444455556666',
    projectId: 'p1',
    templateId: BOBCAT_TEMPLATE_ID,
    userId: 'u1',
    status: 'completed',
    company: 'შპს ბობკატი',
    address: 'თბილისი, საქართველო',
    equipmentModel: 'Bobcat S650',
    registrationNumber: 'BB-001-A',
    inspectionDate: '2026-05-20',
    inspectionType: 'pre_work',
    inspectorName: 'გიორგი ხ.',
    items: buildDefaultItems(BOBCAT_ITEMS).map((it, i) => {
      if (i === 0) return { ...it, result: 'good', photo_paths: ['bobcat/x/1/a.jpg'] };
      if (i === 1) return { ...it, result: 'deficient', comment: 'ცვეთა' };
      if (i === 5) return { ...it, result: 'unusable', comment: 'გაუმართავია' };
      return it;
    }),
    verdict: 'approved',
    notes: 'ყველაფერი წესრიგშია',
    inspectorSignature: 'QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo=',
    summaryPhotos: ['bobcat/x/summary/1.jpg'],
    completedAt: '2026-05-20T10:00:00Z',
    createdAt: '2026-05-20T09:00:00Z',
    updatedAt: '2026-05-20T10:00:00Z',
    ...over,
  };
}

const PHOTOS = {
  'bobcat/x/1/a.jpg': 'data:image/jpeg;base64,ITEMPHOTO',
  'bobcat/x/summary/1.jpg': 'data:image/jpeg;base64,SUMMARYPHOTO',
};

describe('buildInspectionPdf — bobcat (small loader)', () => {
  const html = buildInspectionPdf(
    bobcatSchema,
    { inspection: buildInspection(), projectName: 'Project X' },
    PHOTOS,
  );

  it('produces a complete HTML document', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html.trimEnd().endsWith('</html>')).toBe(true);
  });

  it('renders section headers and bobcat-specific titles', () => {
    expect(html).toContain('I — ზოგადი ინფორმაცია');
    expect(html).toContain('III —');
  });

  it('renders the small-loader title (not large-loader)', () => {
    expect(html).toContain('ციცხვიანი დამტვირთველი');
    expect(html).not.toContain('დიდი ციცხვიანი დამტვირთველი');
  });

  it('renders the verdict label and notes', () => {
    expect(html).toContain(VERDICT_LABEL.approved);
    expect(html).toContain('ყველაფერი წესრიგშია');
  });

  it('renders item-level pills, comment, and photos', () => {
    expect(html).toContain('pill-good');
    expect(html).toContain('pill-def');
    expect(html).toContain('pill-bad');
    expect(html).toContain('ცვეთა');
    expect(html).toContain('data:image/jpeg;base64,ITEMPHOTO');
    expect(html).toContain('data:image/jpeg;base64,SUMMARYPHOTO');
  });

  it('embeds inspector signature', () => {
    expect(html).toContain('data:image/png;base64,QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo=');
    expect(html).toContain('გიორგი ხ.');
  });

  it('escapes apostrophes (img onerror safety)', () => {
    const withApostrophe = buildInspectionPdf(
      bobcatSchema,
      { inspection: buildInspection({ inspectorName: "O'Brien" }), projectName: 'P' },
      PHOTOS,
    );
    expect(withApostrophe).toContain('O&#39;Brien');
    expect(withApostrophe).not.toContain("O'Brien");
  });
});

describe('buildInspectionPdf — bobcat (large loader variant)', () => {
  const html = buildInspectionPdf(
    bobcatSchema,
    {
      inspection: buildInspection({
        templateId: LARGE_LOADER_TEMPLATE_ID,
        items: buildDefaultItems(LARGE_LOADER_ITEMS).map((it, i) =>
          i === 0 ? { ...it, result: 'good' } : it,
        ),
        verdict: 'limited',
        inspectionType: 'scheduled',
      }),
      projectName: 'P',
    },
    {},
  );

  it('switches to the large-loader title', () => {
    expect(html).toContain('დიდი ციცხვიანი დამტვირთველი');
  });

  it('renders the limited verdict label', () => {
    expect(html).toContain(VERDICT_LABEL.limited);
  });

  it('uses scheduled inspection type marker', () => {
    expect(html).toContain('გეგმური');
  });
});

describe('buildInspectionPdf — bobcat empty/null state', () => {
  const html = buildInspectionPdf(
    bobcatSchema,
    {
      inspection: buildInspection({
        company: null,
        address: null,
        equipmentModel: null,
        registrationNumber: null,
        inspectorName: null,
        inspectionType: null,
        verdict: null,
        notes: null,
        inspectorSignature: null,
        summaryPhotos: [],
        items: buildDefaultItems(BOBCAT_ITEMS),
      }),
      projectName: 'P',
    },
    {},
  );

  it('still renders structure even with mostly null fields', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('I — ზოგადი ინფორმაცია');
  });

  it('renders null pills for unfilled items', () => {
    expect(html).toContain('pill-null');
  });
});
