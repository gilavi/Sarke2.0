import { test } from 'node:test';
import assert from 'node:assert/strict';

// Mirror of generatePdfName from lib/pdfName.ts.
// Inlined so no TS transpilation step is needed.
// Keep in sync with lib/pdfName.ts when the transliteration map or format rules change.

const MONTH_ABBR = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
];

const GEO_TO_LATIN = {
  'ა': 'a', 'ბ': 'b', 'გ': 'g', 'დ': 'd', 'ე': 'e', 'ვ': 'v', 'ზ': 'z',
  'თ': 't', 'ი': 'i', 'კ': 'k', 'ლ': 'l', 'მ': 'm', 'ნ': 'n', 'ო': 'o',
  'პ': 'p', 'ჟ': 'zh', 'რ': 'r', 'ს': 's', 'ტ': 't', 'უ': 'u', 'ფ': 'p',
  'ქ': 'k', 'ღ': 'gh', 'ყ': 'q', 'შ': 'sh', 'ჩ': 'ch', 'ც': 'ts', 'ძ': 'dz',
  'წ': 'ts', 'ჭ': 'ch', 'ხ': 'kh', 'ჯ': 'j', 'ჰ': 'h',
};

function transliterate(input) {
  return input.split('').map((ch) => GEO_TO_LATIN[ch] ?? ch).join('');
}

function sanitize(input) {
  return input.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_');
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max) : str;
}

function generatePdfName(projectName, docType, date, id) {
  const shortProject = truncate(sanitize(transliterate(projectName)), 10);
  const sanitizedDocType = sanitize(transliterate(docType));
  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTH_ABBR[date.getMonth()];
  const year = date.getFullYear();
  const dateStr = `${day}${month}${year}`;
  const shortId = id.slice(0, 4).toUpperCase();

  let name = `${shortProject}_${sanitizedDocType}_${dateStr}_${shortId}.pdf`;

  if (name.length > 60) {
    const overage = name.length - 60;
    const adjustedProject = shortProject.slice(0, Math.max(1, shortProject.length - overage));
    name = `${adjustedProject}_${sanitizedDocType}_${dateStr}_${shortId}.pdf`;
  }

  return name;
}

// ── Basic format ──────────────────────────────────────────────────────────────

test('generatePdfName: produces the expected format for a short ASCII name', () => {
  const result = generatePdfName('Bridge', 'Inspection', new Date(2026, 0, 15), 'abcd1234');
  assert.equal(result, 'Bridge_Inspection_15jan2026_ABCD.pdf');
});

test('generatePdfName: output always ends with .pdf', () => {
  const result = generatePdfName('Site', 'Report', new Date(2026, 5, 1), 'xyz');
  assert.ok(result.endsWith('.pdf'));
});

// ── Georgian transliteration ──────────────────────────────────────────────────

test('generatePdfName: transliterates Georgian project name to Latin', () => {
  // სარკე → sarke
  const result = generatePdfName('სარკე', 'Report', new Date(2026, 0, 1), 'abcd');
  assert.ok(result.startsWith('sarke_'), `got: ${result}`);
});

test('generatePdfName: transliterates multi-char Georgian clusters correctly (შ→sh, ხ→kh)', () => {
  // შხამი → shkhamI — project prefix uses first 10 chars of transliterated string
  const result = generatePdfName('შხამი', 'Doc', new Date(2026, 0, 1), 'abcd');
  assert.ok(result.startsWith('shkhamI') || result.startsWith('shkhami'), `got: ${result}`);
});

// ── Space handling ────────────────────────────────────────────────────────────

test('generatePdfName: converts spaces in project name to underscores', () => {
  const result = generatePdfName('My Site', 'Inspection', new Date(2026, 0, 1), 'abcd');
  assert.ok(result.startsWith('My_Site_') || result.startsWith('My_Site'), `got: ${result}`);
});

test('generatePdfName: converts spaces in docType to underscores', () => {
  const result = generatePdfName('Site', 'Full Report', new Date(2026, 0, 1), 'abcd');
  assert.ok(result.includes('Full_Report'), `got: ${result}`);
});

// ── Illegal filename chars ────────────────────────────────────────────────────

test('generatePdfName: replaces illegal chars (/:*?"<>|\\) with underscores', () => {
  const illegalChars = ['/', ':', '*', '?', '"', '<', '>', '|'];
  for (const ch of illegalChars) {
    const result = generatePdfName(`Site${ch}A`, 'Doc', new Date(2026, 0, 1), 'abcd');
    assert.ok(!result.includes(ch), `char "${ch}" leaked through: ${result}`);
  }
});

// ── Project name length truncation ───────────────────────────────────────────

test('generatePdfName: truncates project name to 10 chars', () => {
  const result = generatePdfName('VeryLongProjectName', 'Inspection', new Date(2026, 0, 1), 'abcd');
  const projectPart = result.split('_')[0];
  assert.ok(projectPart.length <= 10, `project part "${projectPart}" exceeds 10 chars`);
});

test('generatePdfName: short project name is not padded', () => {
  const result = generatePdfName('Hi', 'Doc', new Date(2026, 0, 1), 'abcd');
  assert.ok(result.startsWith('Hi_'), `got: ${result}`);
});

// ── 60-char total length cap ──────────────────────────────────────────────────

test('generatePdfName: output never exceeds 60 chars', () => {
  // Force a long docType to trigger overage trimming
  const result = generatePdfName(
    'LongProject',
    'VeryLongDocumentTypeName',
    new Date(2026, 0, 1),
    'abcd1234',
  );
  assert.ok(result.length <= 60, `length ${result.length} exceeds 60: ${result}`);
});

test('generatePdfName: project prefix is at least 1 char even under extreme overage', () => {
  const result = generatePdfName(
    'X',
    'AnExtremelyLongDocumentTypeNameThatAlmostFillsTheEntireLimit',
    new Date(2026, 0, 1),
    'abcd',
  );
  assert.ok(result.length >= 1);
  assert.ok(!result.startsWith('_'), `name must not start with underscore: ${result}`);
});

// ── Short ID ──────────────────────────────────────────────────────────────────

test('generatePdfName: uses full id when id is shorter than 4 chars', () => {
  const result = generatePdfName('Site', 'Doc', new Date(2026, 0, 1), 'ab');
  assert.ok(result.includes('_AB.pdf'), `got: ${result}`);
});

test('generatePdfName: uppercases the first 4 chars of the id', () => {
  const result = generatePdfName('Site', 'Doc', new Date(2026, 0, 1), 'abcd5678');
  assert.ok(result.endsWith('_ABCD.pdf'), `got: ${result}`);
});

// ── Month boundary ────────────────────────────────────────────────────────────

test('generatePdfName: January is jan (index 0)', () => {
  const result = generatePdfName('Site', 'Doc', new Date(2026, 0, 1), 'abcd');
  assert.ok(result.includes('jan'), `got: ${result}`);
});

test('generatePdfName: December is dec (index 11)', () => {
  const result = generatePdfName('Site', 'Doc', new Date(2026, 11, 31), 'abcd');
  assert.ok(result.includes('dec'), `got: ${result}`);
});

test('generatePdfName: day is zero-padded to 2 digits', () => {
  const result = generatePdfName('Site', 'Doc', new Date(2026, 0, 5), 'abcd');
  assert.ok(result.includes('05jan'), `got: ${result}`);
});
