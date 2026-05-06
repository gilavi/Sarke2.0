import { describe, it, expect } from 'vitest';
import { generatePdfName } from '../../lib/pdfName';

describe('pdfName', () => {
  describe('generatePdfName', () => {
    it('generates basic filename', () => {
      const date = new Date(2026, 4, 6); // May 6, 2026
      const name = generatePdfName('Project Alpha', 'Inspection', date, 'abc123def');
      // Project name truncated to 10 chars: 'Project_Al'
      expect(name).toBe('Project_Al_Inspection_06may2026_ABC1.pdf');
    });

    it('transliterates Georgian characters', () => {
      const date = new Date(2026, 4, 6);
      const name = generatePdfName('პროექტი', 'ინსპექცია', date, 'xyz789');
      expect(name).toContain('proekti');
      expect(name).toContain('inspektsia');
    });

    it('sanitizes special characters', () => {
      const date = new Date(2026, 4, 6);
      const name = generatePdfName('Project:Alpha/Beta', 'Report', date, 'id12');
      expect(name).not.toContain(':');
      expect(name).not.toContain('/');
      // Project name is truncated to 10 chars before assembly
      expect(name.startsWith('Project_Al')).toBe(true);
    });

    it('truncates long project names to stay under 60 chars', () => {
      const date = new Date(2026, 4, 6);
      const longName = 'A'.repeat(50);
      const name = generatePdfName(longName, 'VeryLongDocumentTypeName', date, 'id12');
      expect(name.length).toBeLessThanOrEqual(60);
      expect(name.endsWith('.pdf')).toBe(true);
    });

    it('uses uppercase for short ID', () => {
      const date = new Date(2026, 4, 6);
      const name = generatePdfName('Test', 'Doc', date, 'abcd');
      expect(name).toContain('ABCD');
    });

    it('replaces spaces with underscores', () => {
      const date = new Date(2026, 4, 6);
      const name = generatePdfName('My Project', 'My Doc', date, 'x1');
      expect(name).toContain('My_Project');
      expect(name).toContain('My_Doc');
    });
  });
});
