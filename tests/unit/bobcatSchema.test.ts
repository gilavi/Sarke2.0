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
  BOBCAT_CATEGORY_LABELS,
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

describe('buildInspectionPdf — bobcat specific fixes', () => {
  describe('numbered result pills', () => {
    const html = buildInspectionPdf(
      bobcatSchema,
      { inspection: buildInspection(), projectName: 'P' },
      {},
    );

    it('pill-good renders "1 — კარგია"', () => {
      expect(html).toContain('1 — კარგია');
    });

    it('pill-def renders "2 — ნაკლი"', () => {
      expect(html).toContain('2 — ნაკლი');
    });

    it('pill-bad renders "3 — გამოუსადეგ."', () => {
      expect(html).toContain('3 — გამოუსადეგ.');
    });

    it('result pill spans do not contain legacy icon characters ✓, ⚠, or ✗', () => {
      // Extract only pill spans so the base CSS (content:'✓') does not false-positive
      const pillMatches = html.match(/<span class="pill[^"]*">[^<]+<\/span>/g) ?? [];
      const pillText = pillMatches.join('');
      expect(pillText).not.toContain('✓');
      expect(pillText).not.toContain('⚠');
      expect(pillText).not.toContain('✗');
    });
  });

  describe('notes block always visible', () => {
    it('when notes is a non-empty string, the label and text are both present', () => {
      const html = buildInspectionPdf(
        bobcatSchema,
        { inspection: buildInspection({ notes: 'ტესტური შენიშვნა' }), projectName: 'P' },
        {},
      );
      expect(html).toContain('შენიშვნები / ხარვეზები');
      expect(html).toContain('ტესტური შენიშვნა');
    });

    it('when notes is null, the notes label is still present', () => {
      const html = buildInspectionPdf(
        bobcatSchema,
        { inspection: buildInspection({ notes: null }), projectName: 'P' },
        {},
      );
      expect(html).toContain('შენიშვნები / ხარვეზები');
    });

    it('when notes is an empty string, the notes label is still present', () => {
      const html = buildInspectionPdf(
        bobcatSchema,
        { inspection: buildInspection({ notes: '' }), projectName: 'P' },
        {},
      );
      expect(html).toContain('შენიშვნები / ხარვეზები');
    });
  });

  describe('legend content', () => {
    const html = buildInspectionPdf(
      bobcatSchema,
      { inspection: buildInspection(), projectName: 'P' },
      {},
    );

    it('legend contains "1" and "კარგია"', () => {
      expect(html).toContain('1');
      expect(html).toContain('კარგია');
    });

    it('legend contains "2" and "ნაკლი"', () => {
      expect(html).toContain('2');
      expect(html).toContain('ნაკლი');
    });

    it('legend contains "3" and "გამოუსადეგარია"', () => {
      expect(html).toContain('3');
      expect(html).toContain('გამოუსადეგარია');
    });
  });

  describe('neutral unusable pill (unusableIsNeutral)', () => {
    const htmlNeutral = buildInspectionPdf(
      bobcatSchema,
      {
        inspection: buildInspection({
          templateId: LARGE_LOADER_TEMPLATE_ID,
          items: buildDefaultItems(LARGE_LOADER_ITEMS).map(it =>
            it.id === 40 ? { ...it, result: 'unusable' } : it,
          ),
        }),
        projectName: 'P',
      },
      {},
    );

    it('item #40 with result "unusable" renders pill-neutral (not a pill-bad span)', () => {
      // pill-neutral span should be present
      expect(htmlNeutral).toContain('class="pill pill-neutral"');
      // no <span class="pill pill-bad"> element should be rendered (CSS class definition is fine)
      expect(htmlNeutral).not.toContain('class="pill pill-bad"');
    });

    it('the neutral pill text contains "არ გააჩნია"', () => {
      expect(htmlNeutral).toContain('არ გააჩნია');
    });
  });

  describe('category label headers', () => {
    const html = buildInspectionPdf(
      bobcatSchema,
      { inspection: buildInspection(), projectName: 'P' },
      {},
    );

    it('Section III contains all four BOBCAT_CATEGORY_LABELS', () => {
      expect(html).toContain(BOBCAT_CATEGORY_LABELS['A']);
      expect(html).toContain(BOBCAT_CATEGORY_LABELS['B']);
      expect(html).toContain(BOBCAT_CATEGORY_LABELS['C']);
      expect(html).toContain(BOBCAT_CATEGORY_LABELS['D']);
    });
  });
});
