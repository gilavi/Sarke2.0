import { describe, it, expect } from 'vitest';
import { buildInspectionPdf } from '../../lib/inspection/pdf';
import { generalEquipmentSchema } from '../../lib/inspection/schemas/generalEquipment';
import {
  buildDefaultEquipment,
  GENERAL_EQUIPMENT_TEMPLATE_ID,
  INSPECTION_TYPE_LABEL,
  type GeneralEquipmentInspection,
} from '../../types/generalEquipment';

function buildInspection(over: Partial<GeneralEquipmentInspection> = {}): GeneralEquipmentInspection {
  const equipment = buildDefaultEquipment();
  return {
    id: 'ge000011-2222-3333-4444-555566667777',
    projectId: 'p1',
    templateId: GENERAL_EQUIPMENT_TEMPLATE_ID,
    userId: 'u1',
    status: 'completed',
    objectName: 'შპს Acme — საწყობი',
    address: 'რუსთავი',
    activityType: 'სამშენებლო',
    inspectionDate: '2026-05-20',
    actNumber: 'A-001',
    inspectionType: 'initial',
    inspectorName: 'გიორგი ხ.',
    equipment: [
      { ...equipment[0], name: 'სამშენებლო ხერხი', model: 'XR-100', serialNumber: 'SN-1', condition: 'good', note: 'წესრიგშია', photo_paths: ['ge/x/1.jpg'] },
      { ...equipment[1], name: 'ბურღი', model: 'B-50', serialNumber: 'SN-2', condition: 'needs_service', note: 'მცირე ცვეთა', photo_paths: [] },
      { ...equipment[2], name: 'შტატივი', model: 'ST-1', serialNumber: 'SN-3', condition: 'unusable', note: 'გატეხილია', photo_paths: [] },
    ],
    conclusion: 'საერთო წესრიგშია',
    summaryPhotos: ['ge/x/sum.jpg'],
    signerName: 'შემოწმდა მ.',
    signerRole: 'safety_specialist',
    signerRoleCustom: null,
    inspectorSignature: 'CCCCCCCC',
    completedAt: '2026-05-20T11:00:00Z',
    createdAt: '2026-05-20T09:00:00Z',
    updatedAt: '2026-05-20T11:00:00Z',
    ...over,
  };
}

const PHOTOS = {
  'ge/x/1.jpg': 'data:image/jpeg;base64,ITEM',
  'ge/x/sum.jpg': 'data:image/jpeg;base64,SUM',
};

describe('buildInspectionPdf — generalEquipment', () => {
  const html = buildInspectionPdf(
    generalEquipmentSchema,
    { inspection: buildInspection(), projectName: 'პროექტი' },
    PHOTOS,
  );

  it('produces a complete HTML document', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html.trimEnd().endsWith('</html>')).toBe(true);
  });

  it('renders all equipment names and serials', () => {
    expect(html).toContain('სამშენებლო ხერხი');
    expect(html).toContain('ბურღი');
    expect(html).toContain('შტატივი');
    expect(html).toContain('SN-1');
    expect(html).toContain('SN-2');
    expect(html).toContain('SN-3');
  });

  it('renders condition symbols (✓ / ⚠ / ✗)', () => {
    expect(html).toContain('ck-good');
    expect(html).toContain('ck-warn');
    expect(html).toContain('ck-bad');
  });

  it('renders inspection type marker', () => {
    expect(html).toContain(INSPECTION_TYPE_LABEL.initial);
  });

  it('renders the conclusion and signer block', () => {
    expect(html).toContain('საერთო წესრიგშია');
    expect(html).toContain('შემოწმდა მ.');
    expect(html).toContain('data:image/png;base64,CCCCCCCC');
    expect(html).toContain('data:image/jpeg;base64,SUM');
  });
});

describe('buildInspectionPdf — generalEquipment custom signer role', () => {
  const html = buildInspectionPdf(
    generalEquipmentSchema,
    {
      inspection: buildInspection({
        signerRole: 'other',
        signerRoleCustom: 'სხვა როლი',
      }),
      projectName: 'P',
    },
    {},
  );

  it('renders the custom signer role', () => {
    expect(html).toContain('სხვა როლი');
  });
});

describe('buildInspectionPdf — generalEquipment defaults', () => {
  it('renders with mostly null/default fields', () => {
    const html = buildInspectionPdf(
      generalEquipmentSchema,
      {
        inspection: buildInspection({
          objectName: null,
          address: null,
          activityType: null,
          actNumber: null,
          inspectionType: null,
          inspectorName: null,
          equipment: buildDefaultEquipment(),
          conclusion: null,
          summaryPhotos: [],
          signerName: null,
          signerRole: null,
          inspectorSignature: null,
        }),
        projectName: 'P',
      },
      {},
    );
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
  });
});
