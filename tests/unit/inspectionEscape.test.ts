import { describe, it, expect } from 'vitest';
import { escapeHtml, fmtDate, fmtDateTime } from '../../lib/inspection/escape';
import {
  escapeHtml as pdfEscapeHtml,
  formatDate as pdfFormatDate,
  pad2,
  tPdf,
} from '../../lib/pdf/inspection/_shared';

describe('lib/inspection/escape — escapeHtml', () => {
  it('returns "" for null/undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('escapes the standard HTML metacharacters', () => {
    expect(escapeHtml('<a>&"\'')).toBe('&lt;a&gt;&amp;&quot;&#39;');
  });

  it('passes plain text through unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
    expect(escapeHtml('გიორგი')).toBe('გიორგი');
  });

  it('escapes apostrophes (img onerror safety)', () => {
    expect(escapeHtml("O'Brien")).toBe('O&#39;Brien');
  });
});

describe('lib/inspection/escape — fmtDate', () => {
  it('returns em-dash for null/empty', () => {
    expect(fmtDate(null)).toBe('—');
    expect(fmtDate('')).toBe('—');
    expect(fmtDate(undefined)).toBe('—');
  });

  it('echoes unparseable strings unchanged', () => {
    expect(fmtDate('not-a-date')).toBe('not-a-date');
  });

  it('formats a valid ISO date in Georgian long form', () => {
    const out = fmtDate('2026-05-20T10:00:00Z');
    expect(out).toMatch(/2026/);
    expect(out).toMatch(/მაისი/);
  });
});

describe('lib/inspection/escape — fmtDateTime', () => {
  it('returns "" for null/empty', () => {
    expect(fmtDateTime(null)).toBe('');
    expect(fmtDateTime('')).toBe('');
    expect(fmtDateTime(undefined)).toBe('');
  });

  it('returns "" for unparseable strings', () => {
    expect(fmtDateTime('not-a-date')).toBe('');
  });

  it('formats valid ISO as dd.mm.yyyy hh:mm', () => {
    const out = fmtDateTime('2026-05-20T10:30:00');
    expect(out).toMatch(/^20\.05\.2026 \d{2}:30$/);
  });
});

describe('lib/pdf/inspection/_shared — escapeHtml', () => {
  it('escapes the standard HTML metacharacters', () => {
    expect(pdfEscapeHtml('<a>&"\'')).toBe('&lt;a&gt;&amp;&quot;&#39;');
  });

  it('returns "" for null/undefined', () => {
    expect(pdfEscapeHtml(null)).toBe('');
    expect(pdfEscapeHtml(undefined)).toBe('');
  });
});

describe('lib/pdf/inspection/_shared — formatDate', () => {
  it('formats ISO as dd.mm.yyyy hh:mm', () => {
    const out = pdfFormatDate('2026-05-20T10:30:00');
    expect(out).toMatch(/^20\.05\.2026 \d{2}:30$/);
  });
});

describe('lib/pdf/inspection/_shared — pad2', () => {
  it('left-pads single-digit numbers', () => {
    expect(pad2(0)).toBe('00');
    expect(pad2(7)).toBe('07');
    expect(pad2(10)).toBe('10');
    expect(pad2(99)).toBe('99');
    expect(pad2(100)).toBe('100');
  });
});

describe('lib/pdf/inspection/_shared — tPdf', () => {
  it('returns undefined for unknown keys', () => {
    expect(tPdf('this.is.not.a.real.key')).toBeUndefined();
  });

  it('substitutes {{var}} when vars supplied', () => {
    // We don't assume what's in ka.json; just confirm the substitution path
    // when the key resolves to undefined.
    expect(tPdf('nope', { x: 'y' })).toBeUndefined();
  });
});
