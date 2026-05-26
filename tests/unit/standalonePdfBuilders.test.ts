import { describe, it, expect } from 'vitest';
import { buildBriefingPdfHtml, buildBriefingPreviewHtml } from '../../lib/briefingPdf';
import { buildIncidentPdfHtml } from '../../lib/incidentPdf';
import { buildReportPdfHtml } from '../../lib/reportPdf';
import type { Briefing, Project, Incident, Report } from '../../types/models';

function mockProject(over: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    user_id: 'u1',
    name: 'ობიექტი X',
    company_name: 'შპს Acme',
    address: 'თბილისი',
    latitude: null,
    longitude: null,
    crew: null,
    logo: null,
    contact_phone: null,
    created_at: '2026-05-20T10:00:00Z',
    ...over,
  };
}

// ── briefingPdf ───────────────────────────────────────────────────────────────

describe('buildBriefingPdfHtml', () => {
  function mockBriefing(over: Partial<Briefing> = {}): Briefing {
    return {
      id: 'b1',
      projectId: 'p1',
      dateTime: '2026-05-20T10:00:00Z',
      topics: ['scaffold_safety', 'ppe', 'custom:custom topic'],
      participants: [
        { name: 'პირი 1', signature: 'AAAA' },
        { name: 'პირი 2', signature: null },
      ],
      inspectorSignature: 'INSPSIG',
      inspectorName: 'გიორგი ხ.',
      status: 'completed',
      createdAt: '2026-05-20T11:00:00Z',
      ...over,
    };
  }

  const html = buildBriefingPdfHtml(mockBriefing(), mockProject());

  it('produces a complete HTML document', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('</html>');
  });

  it('renders predefined topic labels and custom topics', () => {
    expect(html).toContain('ხარაჩოს უსაფრთხოება'); // scaffold_safety
    expect(html).toContain('დამცავი აღჭურვილობა'); // ppe
    expect(html).toContain('custom topic'); // custom: prefix stripped
  });

  it('renders participant names and inspector', () => {
    expect(html).toContain('პირი 1');
    expect(html).toContain('პირი 2');
    expect(html).toContain('გიორგი ხ.');
  });

  it('embeds participant signature image when present', () => {
    expect(html).toContain('data:image/png;base64,AAAA');
  });

  it('preview variant also produces valid HTML', () => {
    const preview = buildBriefingPreviewHtml(mockBriefing(), mockProject());
    expect(preview.startsWith('<!DOCTYPE html>')).toBe(true);
  });
});

// ── incidentPdf ───────────────────────────────────────────────────────────────

describe('buildIncidentPdfHtml', () => {
  function mockIncident(over: Partial<Incident> = {}): Incident {
    return {
      id: 'i1',
      project_id: 'p1',
      user_id: 'u1',
      type: 'severe',
      injured_name: 'დაშავებული პირი',
      injured_role: 'მუშა',
      date_time: '2026-05-20T10:00:00Z',
      location: 'სამშენებლო ობიექტი',
      description: 'ვადასცემული ხელი',
      cause: 'უსაფრთხოების დაუცველობა',
      actions_taken: 'მედიკოსი გამოიყვანეს',
      witnesses: ['მ. გვ.', 'ნ. ა.'],
      photos: ['incident-photos/i1/1.jpg'],
      inspector_signature: null,
      status: 'completed',
      pdf_url: null,
      created_at: '2026-05-20T11:00:00Z',
      ...over,
    };
  }

  const html = buildIncidentPdfHtml({
    incident: mockIncident(),
    project: mockProject(),
    inspectorName: 'გიორგი ხ.',
    inspectorRole: 'ინჟინერი',
    inspectorSignatureDataUrl: 'data:image/png;base64,INSPSIG',
    photoDataUrls: ['data:image/jpeg;base64,PHOTO1'],
    photoAddresses: ['თბილისი, საქართველო'],
  });

  it('produces a complete HTML document', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
  });

  it('renders the incident type label, location, and description', () => {
    expect(html).toContain('მძიმე');
    expect(html).toContain('სამშენებლო ობიექტი');
    expect(html).toContain('ვადასცემული ხელი');
  });

  it('renders witnesses', () => {
    expect(html).toContain('მ. გვ.');
    expect(html).toContain('ნ. ა.');
  });

  it('embeds photo data URLs and addresses', () => {
    expect(html).toContain('data:image/jpeg;base64,PHOTO1');
    expect(html).toContain('თბილისი');
  });

  it('embeds inspector signature when provided', () => {
    expect(html).toContain('data:image/png;base64,INSPSIG');
    expect(html).toContain('გიორგი ხ.');
  });

  it('handles nearmiss type (no injured person)', () => {
    const nearmissHtml = buildIncidentPdfHtml({
      incident: mockIncident({ type: 'nearmiss', injured_name: null, injured_role: null }),
      project: mockProject(),
      inspectorName: 'გიორგი ხ.',
    });
    expect(nearmissHtml).toContain('near miss');
  });
});

// ── reportPdf ─────────────────────────────────────────────────────────────────

describe('buildReportPdfHtml', () => {
  function mockReport(over: Partial<Report> = {}): Report {
    return {
      id: 'r1',
      project_id: 'p1',
      user_id: 'u1',
      title: 'რეპორტი 1',
      status: 'completed',
      slides: [
        {
          id: 's1',
          order: 0,
          title: 'სლაიდი 1',
          description: 'აღწერა 1',
          image_path: 'report-photos/r1/s1.jpg',
          annotated_image_path: null,
        },
        {
          id: 's2',
          order: 1,
          title: 'სლაიდი 2',
          description: 'აღწერა 2',
          image_path: null,
          annotated_image_path: null,
        },
      ],
      pdf_url: null,
      created_at: '2026-05-20T11:00:00Z',
      ...over,
    };
  }

  const html = buildReportPdfHtml({
    report: mockReport(),
    project: mockProject(),
    inspectorName: 'გიორგი ხ.',
    slideImageDataUrls: { 'report-photos/r1/s1.jpg': 'data:image/jpeg;base64,SLIDE1' },
  });

  it('produces a complete HTML document', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
  });

  it('renders slide titles and descriptions', () => {
    expect(html).toContain('სლაიდი 1');
    expect(html).toContain('სლაიდი 2');
    expect(html).toContain('აღწერა 1');
    expect(html).toContain('აღწერა 2');
  });

  it('embeds slide image when path resolves', () => {
    expect(html).toContain('data:image/jpeg;base64,SLIDE1');
  });

  it('handles null project gracefully', () => {
    const html2 = buildReportPdfHtml({
      report: mockReport(),
      project: null,
      inspectorName: 'გიორგი ხ.',
      slideImageDataUrls: {},
    });
    expect(html2.startsWith('<!DOCTYPE html>')).toBe(true);
  });
});

