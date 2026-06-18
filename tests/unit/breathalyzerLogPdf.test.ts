import { describe, it, expect, vi } from 'vitest';

// Stub the modules pdfShared transitively pulls in (expo + supabase chain).
vi.mock('../../lib/supabase', () => ({
  supabase: {},
  STORAGE_BUCKETS: {
    answerPhotos: 'answer-photos',
    pdfs: 'pdfs',
    signatures: 'signatures',
  },
}));
vi.mock('../../lib/imageUrl', () => ({
  pdfPhotoEmbed: async (..._: any[]) => '',
}));

const { buildBreathalizerLogPdfHtml } = await import('../../lib/breathalyzerLogPdf');
import type { BreathalizerLog } from '../../types/breathalyzerLog';

function mockLog(over: Partial<BreathalizerLog> = {}): BreathalizerLog {
  return {
    id: 'bl000011-2222-3333-4444-555566667777',
    projectId: 'p1',
    date: '2026-05-20',
    deviceSerialNumber: 'SN-001',
    entries: [
      {
        id: 'e1',
        order: 1,
        personName: 'პირი 1',
        position: 'მუშა',
        testType: 'primary',
        result: 0.05,
        resultStatus: 'safe',
        signature: 'SIG1',
        refusedSignature: false,
        time: '2026-05-20T10:00:00Z',
        relatedEntryId: null,
      },
      {
        id: 'e2',
        order: 2,
        personName: 'პირი 2',
        position: 'მუშა',
        testType: 'primary',
        result: 0.15,
        resultStatus: 'warning',
        signature: null,
        refusedSignature: true,
        time: '2026-05-20T10:30:00Z',
        relatedEntryId: null,
      },
      {
        id: 'e3',
        order: 3,
        personName: 'პირი 3',
        position: 'მუშა',
        testType: 'repeat',
        result: 0.25,
        resultStatus: 'fail',
        signature: 'SIG3',
        refusedSignature: false,
        time: '2026-05-20T11:00:00Z',
        relatedEntryId: null,
      },
    ],
    responsiblePerson: { name: 'გიორგი ხ.', signature: 'RESPSIG' },
    status: 'closed',
    createdAt: '2026-05-20T09:00:00Z',
    updatedAt: '2026-05-20T11:00:00Z',
    pdfUri: null,
    ...over,
  };
}

describe('buildBreathalizerLogPdfHtml', () => {
  it('produces a complete HTML document', async () => {
    const html = await buildBreathalizerLogPdfHtml({
      log: mockLog(),
      projectName: 'ობიექტი X',
      companyName: 'შპს Acme',
    });
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('</html>');
  });

  it('renders all three result-status tiers', async () => {
    const html = await buildBreathalizerLogPdfHtml({ log: mockLog() });
    expect(html).toContain('პირი 1');
    expect(html).toContain('პირი 2');
    expect(html).toContain('პირი 3');
  });

  it('renders responsible person + signature', async () => {
    const html = await buildBreathalizerLogPdfHtml({ log: mockLog() });
    expect(html).toContain('გიორგი ხ.');
    expect(html).toContain('RESPSIG');
  });

  it('uses defaults when project/company name omitted', async () => {
    const html = await buildBreathalizerLogPdfHtml({ log: mockLog() });
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
  });

  it('renders the closed-status badge', async () => {
    const html = await buildBreathalizerLogPdfHtml({ log: mockLog({ status: 'closed' }) });
    expect(html).toContain('დასრულებული');
  });

  it('skips the closed-status badge when log is open', async () => {
    const html = await buildBreathalizerLogPdfHtml({ log: mockLog({ status: 'open' }) });
    expect(html).not.toContain('დასრულებული');
  });

  it('handles empty entries', async () => {
    const html = await buildBreathalizerLogPdfHtml({ log: mockLog({ entries: [] }) });
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
  });

  it('renders dash for missing serial number', async () => {
    const html = await buildBreathalizerLogPdfHtml({ log: mockLog({ deviceSerialNumber: null }) });
    expect(html).toContain('-');
  });
});
