import { describe, it, expect } from 'vitest';
import { buildInspectionPdf } from '../../lib/inspection/pdf';
import { excavatorSchema } from '../../lib/inspection/schemas/excavator';
import {
  buildDefaultExcavatorItems,
  EXCAVATOR_MACHINE_SPECS,
  EXCAVATOR_VERDICT_LABEL,
  type ExcavatorInspection,
  type ExcavatorChecklistItemState,
} from '../../types/excavator';
import { liftingAccessoriesSchema } from '../../lib/inspection/schemas/liftingAccessories';
import {
  buildDefaultLAInspection,
  LIFTING_ACCESSORIES_TEMPLATE_ID,
} from '../../types/liftingAccessories';

function mockExcavator(): ExcavatorInspection {
  const d = buildDefaultExcavatorItems();
  return {
    id: 'abcdef12-3456-7890-aaaa-bbbbccccdddd',
    projectId: 'p1',
    templateId: 't1',
    userId: 'u1',
    status: 'completed',
    machineSpecs: EXCAVATOR_MACHINE_SPECS,
    serialNumber: 'SER-123',
    registrationNumber: 'AA-001-BB',
    inventoryNumber: 'INV-9',
    projectName: 'ობიექტი X',
    department: 'განყ. A',
    inspectionDate: '2026-05-10',
    motoHours: 1200,
    inspectorName: 'გიორგი ხ.',
    lastInspectionDate: '2026-01-01',
    engineItems: d.engineItems.map((it, idx): ExcavatorChecklistItemState =>
      idx === 0
        ? { ...it, result: 'good', photo_paths: ['excavator/x/engine/1.jpg'] }
        : idx === 1
          ? { ...it, result: 'unusable', comment: 'ბზარი აღმოჩნდა' }
          : it,
    ),
    undercarriageItems: d.undercarriageItems,
    cabinItems: d.cabinItems,
    safetyItems: d.safetyItems,
    maintenanceItems: d.maintenanceItems.map((m, i) =>
      i === 0 ? { ...m, answer: 'yes' as const, date: '2026-05-01' } : m,
    ),
    verdict: 'approved',
    notes: 'ყველაფერი წესრიგშია',
    inspectorPosition: 'ინჟინერი',
    inspectorSignature: 'QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVowMTIzNDU2Nzg5',
    summaryPhotos: ['excavator/x/summary/1.jpg'],
    completedAt: '2026-05-10T10:00:00Z',
    createdAt: '2026-05-10T09:00:00Z',
    updatedAt: '2026-05-10T10:00:00Z',
  };
}

const PHOTOS = {
  'excavator/x/engine/1.jpg': 'data:image/jpeg;base64,ENGINEPHOTO',
  'excavator/x/summary/1.jpg': 'data:image/jpeg;base64,SUMMARYPHOTO',
};

describe('buildInspectionPdf — excavator', () => {
  const html = buildInspectionPdf(excavatorSchema, { inspection: mockExcavator(), projectName: 'კომპანია' }, PHOTOS);

  it('produces a complete HTML document', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html.trimEnd().endsWith('</html>')).toBe(true);
    expect(html).toContain('Noto Sans Georgian');
  });

  it('renders header, all section titles, and footer', () => {
    expect(html).toContain('ექსკავატორის ტექნიკური<br>შემოწმების აქტი');
    expect(html).toContain('Excavator Technical Inspection Report');
    expect(html).toContain('I — მანქანის ტექნიკური მახასიათებლები');
    expect(html).toContain('II — დოკუმენტის ინფორმაცია');
    expect(html).toContain('III — შემოწმების ჩეკლისტი');
    expect(html).toContain('VI — ტექნიკური მომსახურება');
    expect(html).toContain('IV — დასკვნა');
    expect(html).toContain('V — შემომწმებელი');
    expect(html).toContain('Sarke 2.0 — ექსკავატორის ტექნიკური შემოწმების აქტი');
  });

  it('renders machine specs and identification values', () => {
    expect(html).toContain(EXCAVATOR_MACHINE_SPECS.weight);
    expect(html).toContain('SER-123');
    expect(html).toContain('AA-001-BB');
    expect(html).toContain('ობიექტი X');
  });

  it('marks checklist results with the correct glyph + tone class', () => {
    expect(html).toContain('<span class="ck-good">✓</span>');
    expect(html).toContain('<span class="ck-bad">✗</span>');
    expect(html).toContain('ბზარი აღმოჩნდა'); // item comment
  });

  it('embeds resolved item and summary photos', () => {
    expect(html).toContain('data:image/jpeg;base64,ENGINEPHOTO');
    expect(html).toContain('data:image/jpeg;base64,SUMMARYPHOTO');
  });

  it('marks the selected verdict and renders notes', () => {
    expect(html).toContain(EXCAVATOR_VERDICT_LABEL.approved);
    expect(html).toContain('verdict-option selected');
    expect(html).toContain('verdict-box checked');
    expect(html).toContain('ყველაფერი წესრიგშია');
  });

  it('renders the inspector signature block with the embedded signature', () => {
    expect(html).toContain('გიორგი ხ.');
    expect(html).toContain('ინჟინერი');
    expect(html).toContain('data:image/png;base64,QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVowMTIzNDU2Nzg5');
  });

  it('escapes apostrophes (img onerror safety / legal-name correctness)', () => {
    const withApostrophe = buildInspectionPdf(
      excavatorSchema,
      { inspection: { ...mockExcavator(), inspectorName: "O'Brien" }, projectName: 'კომპანია' },
      PHOTOS,
    );
    expect(withApostrophe).toContain('O&#39;Brien');
    expect(withApostrophe).not.toContain("O'Brien");
  });
});

describe('buildInspectionPdf — lifting accessories result pills (regression)', () => {
  function mockLA() {
    const insp = buildDefaultLAInspection(
      'la000011-2222-3333-4444-555566667777',
      'p1',
      'u1',
      LIFTING_ACCESSORIES_TEMPLATE_ID,
      '2026-05-10T10:00:00Z',
    );
    // item 1 = Section A (visual) → ok; item 6 = Section B (functional) → fail
    insp.items = insp.items.map((it) =>
      it.id === 1 ? { ...it, result: 'ok' as const } : it.id === 6 ? { ...it, result: 'fail' as const } : it,
    );
    return insp;
  }

  const html = buildInspectionPdf(liftingAccessoriesSchema, { inspection: mockLA(), projectName: 'კომპანია' }, {});

  // Before the fix, checklistPill received the display string instead of the enum,
  // so every result cell rendered the null "—" pill. These assert the real pills.
  it('renders the green ✓ pill for an "ok" result', () => {
    expect(html).toContain('class="pill pill-ok">✓ გამართულია');
  });

  it('renders the red ✗ pill for a "fail" result', () => {
    expect(html).toContain('class="pill pill-fail">✗ გაუმართავია');
  });
});
