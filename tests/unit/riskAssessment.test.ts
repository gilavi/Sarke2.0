import { describe, it, expect } from 'vitest';
import {
  riskScore,
  riskCategory,
  emptyHazardEntry,
  emptyPpeEntry,
  type RiskAssessment,
} from '../../types/riskAssessment';
import {
  buildRiskAssessmentPdfHtml,
  buildPpeDeterminationPdfHtml,
} from '../../lib/riskAssessmentPdf';

describe('riskScore', () => {
  it('multiplies probability × severity', () => {
    expect(riskScore(3, 4)).toBe(12);
    expect(riskScore(5, 5)).toBe(25);
    expect(riskScore(1, 1)).toBe(1);
  });
  it('returns 0 for unset / invalid factors', () => {
    expect(riskScore(0, 4)).toBe(0);
    expect(riskScore(3, 0)).toBe(0);
    expect(riskScore(NaN, 4)).toBe(0);
  });
  it('clamps factors to 1..5', () => {
    expect(riskScore(9, 9)).toBe(25); // 5×5
  });
});

describe('riskCategory', () => {
  it('maps scores to the source matrix bands', () => {
    expect(riskCategory(25)).toBe('critical'); // 20–25
    expect(riskCategory(20)).toBe('critical');
    expect(riskCategory(16)).toBe('veryHigh'); // 10–16 (17–19 also veryHigh)
    expect(riskCategory(10)).toBe('veryHigh');
    expect(riskCategory(9)).toBe('high'); // 5–9
    expect(riskCategory(5)).toBe('high');
    expect(riskCategory(4)).toBe('medium'); // 3–4
    expect(riskCategory(3)).toBe('medium');
    expect(riskCategory(2)).toBe('low'); // 1–2
    expect(riskCategory(1)).toBe('low');
    expect(riskCategory(0)).toBeNull();
  });
});

describe('empty entry factories', () => {
  it('seed all fields with the given id', () => {
    expect(emptyHazardEntry('h1')).toMatchObject({ id: 'h1', hazard: '', probability: 0, severity: 0 });
    expect(emptyPpeEntry('p1')).toMatchObject({ id: 'p1', position: '', ppe: '' });
  });
});

function makeRA(overrides: Partial<RiskAssessment>): RiskAssessment {
  return {
    id: 'ra1', projectId: 'p1', userId: 'u1', docType: 'risk_assessment',
    header: {}, entries: [], signatories: {}, status: 'draft', pdfUrl: null,
    createdAt: '2026-07-01', updatedAt: '2026-07-01',
    ...overrides,
  };
}

describe('buildRiskAssessmentPdfHtml', () => {
  const ra = makeRA({
    header: { objectName: 'ობიექტი X', assessorName: 'ლაშა ო.', workDescription: 'სამშენებლო' },
    entries: [{
      id: 'h1', hazard: 'სიმაღლეზე მუშაობა', persons: 'მუშები', injuryType: 'ვარდნა',
      existingControls: 'ღვედი', probability: 4, severity: 5, additionalControls: 'ბარიერი',
      residualProbability: 2, residualSeverity: 3, measures: 'ინსტრუქტაჟი', responsible: 'HSE', reviewDate: '2026-08-01',
    }],
    signatories: { assessor: { name: 'ლაშა ო.', position: '', signature: null, date: null } },
  });
  const html = buildRiskAssessmentPdfHtml({ assessment: ra, projectName: 'P' });

  it('produces a complete document with header + hazard row', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('რისკების შეფასება');
    expect(html).toContain('ობიექტი X');
    expect(html).toContain('სიმაღლეზე მუშაობა');
    expect(html).toContain('ლაშა ო.');
  });
  it('renders the initial risk score (4×5=20) and the 5×5 matrix top cell (25)', () => {
    expect(html).toContain('>20<'); // initial risk pill
    expect(html).toContain('>25<'); // matrix max cell
    expect(html).toContain('ალბათობა');
    expect(html).toContain('კრიტიკული'); // legend / category label
  });
  it('escapes HTML in user content', () => {
    const evil = buildRiskAssessmentPdfHtml({ assessment: makeRA({
      entries: [{ ...emptyHazardEntry('x'), hazard: '<script>x</script>' }],
    }), projectName: 'P' });
    expect(evil).not.toContain('<script>x</script>');
    expect(evil).toContain('&lt;script&gt;');
  });
});

describe('buildPpeDeterminationPdfHtml', () => {
  const ra = makeRA({
    docType: 'ppe_determination',
    header: { companyName: 'შპს Acme', hseSpecialist: 'გიორგი ს.' },
    entries: [{ id: 'p1', position: 'შემდუღებელი', activities: 'შედუღება', hazards: 'ნაპერწკალი', bodyParts: 'თვალები', ppe: 'სათვალე' }],
  });
  const html = buildPpeDeterminationPdfHtml({ assessment: ra, projectName: 'P' });

  it('produces a complete PPE matrix document', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('განსაზღვრა');
    expect(html).toContain('შპს Acme');
    expect(html).toContain('შემდუღებელი');
    expect(html).toContain('სათვალე');
  });
});
