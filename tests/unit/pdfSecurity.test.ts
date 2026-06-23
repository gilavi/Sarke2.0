import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────
// pdfSecurity.ts imports native expo modules + pdf-lib, none of which run under
// jsdom, so we stub each one with in-memory fakes. Per the house style, the
// vi.mock() calls come FIRST, then a dynamic import AFTER.

// In-memory file system backing readAsStringAsync / writeAsStringAsync.
const fsStore: Record<string, string> = {};
let readThrows = false;
let writeThrows = false;

const readAsStringAsync = vi.fn(async (uri: string) => {
  if (readThrows) throw new Error('read failed');
  if (!(uri in fsStore)) throw new Error('no such file: ' + uri);
  return fsStore[uri];
});

const writeAsStringAsync = vi.fn(async (uri: string, contents: string) => {
  if (writeThrows) throw new Error('write failed');
  fsStore[uri] = contents;
});

vi.mock('expo-file-system/legacy', () => ({
  readAsStringAsync,
  writeAsStringAsync,
  EncodingType: { Base64: 'base64' },
}));

// pdf-lib stub. PDFDocument.load resolves to an object whose setter methods are
// spies. save() returns a fixed Uint8Array so we can assert the round-trip.
let loadThrows = false;
const SAVED_BYTES = new Uint8Array([1, 2, 3, 4]);

const setTitle = vi.fn();
const setAuthor = vi.fn();
const setSubject = vi.fn();
const setProducer = vi.fn();
const setCreator = vi.fn();
const setCreationDate = vi.fn();
const setModificationDate = vi.fn();
const setKeywords = vi.fn();
const save = vi.fn(async () => SAVED_BYTES);

const load = vi.fn(async (_bytes?: unknown, _opts?: unknown) => {
  if (loadThrows) throw new Error('load failed');
  return {
    setTitle,
    setAuthor,
    setSubject,
    setProducer,
    setCreator,
    setCreationDate,
    setModificationDate,
    setKeywords,
    save,
  };
});

vi.mock('pdf-lib', () => ({
  PDFDocument: { load },
}));

// expo-crypto stub. digestStringAsync returns a deterministic fake digest.
let digestThrows = false;
const digestStringAsync = vi.fn(async (_algo: string, data: string) => {
  if (digestThrows) throw new Error('digest failed');
  return 'sha256(' + data + ')';
});

vi.mock('expo-crypto', () => ({
  digestStringAsync,
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

const { injectSecurityMarkup, lockPdf, hashPdf, verifyPdf } = await import(
  '../../lib/pdfSecurity'
);

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of Object.keys(fsStore)) delete fsStore[k];
  readThrows = false;
  writeThrows = false;
  loadThrows = false;
  digestThrows = false;
});

// ─── injectSecurityMarkup ────────────────────────────────────────────────────

describe('injectSecurityMarkup — head insertion', () => {
  it('inserts meta + css before </head> when a head is present', () => {
    const out = injectSecurityMarkup('<html><head></head><body></body></html>', {});
    // Meta/css land inside the head, immediately before its closing tag.
    expect(out).toContain('<meta name="generator" content="HUBBLE Safety App v1.0">');
    expect(out).toContain('-webkit-user-select:none');
    // The closing </head> still exists and the injected block precedes it.
    expect(out).toMatch(/HUBBLE Safety App v1\.0[\s\S]*<\/head>/);
    expect(out.indexOf('<meta')).toBeLessThan(out.indexOf('</head>'));
  });

  it('matches a closing head tag case-insensitively', () => {
    const out = injectSecurityMarkup('<HTML><HEAD></HEAD><BODY></BODY></HTML>', {});
    expect(out).toContain('<meta name="generator"');
    // The /i regex matches </HEAD>, but .replace() substitutes the literal
    // lowercase "</head>" from the source, so the upper-case form is gone.
    expect(out).toContain('</head>');
    expect(out).not.toContain('</HEAD>');
    expect(out.indexOf('<meta')).toBeLessThan(out.indexOf('</head>'));
  });

  it('prepends meta + css when no head is present', () => {
    const out = injectSecurityMarkup('<div>body only</div>', {});
    // No head → block goes at the very front of the document.
    expect(out.startsWith('\n<meta name="author"')).toBe(true);
    expect(out).toContain('<div>body only</div>');
    expect(out).not.toContain('</head>');
  });
});

describe('injectSecurityMarkup — body / footer insertion', () => {
  it('inserts footer before </body> when a body is present', () => {
    const out = injectSecurityMarkup('<html><head></head><body>x</body></html>', {});
    expect(out).toContain('შედგენილია HUBBLE-ის მეშვეობით');
    expect(out.indexOf('შედგენილია HUBBLE-ის მეშვეობით')).toBeLessThan(
      out.indexOf('</body>'),
    );
  });

  it('matches a closing body tag case-insensitively', () => {
    const out = injectSecurityMarkup('<html><head></head><BODY>x</BODY></html>', {});
    expect(out).toContain('შედგენილია HUBBLE-ის მეშვეობით');
    // /i regex matches </BODY>, but .replace() substitutes the literal
    // lowercase "</body>" from the source — the upper-case form is gone.
    expect(out).toContain('</body>');
    expect(out).not.toContain('</BODY>');
    expect(out.indexOf('შედგენილია')).toBeLessThan(out.indexOf('</body>'));
  });

  it('appends footer to the end when no body is present', () => {
    const out = injectSecurityMarkup('<p>no body tag</p>', {});
    // Footer text appears after the original content.
    expect(out.indexOf('<p>no body tag</p>')).toBeLessThan(
      out.indexOf('შედგენილია HUBBLE-ის მეშვეობით'),
    );
    expect(out).not.toContain('</body>');
  });
});

describe('injectSecurityMarkup — footer author / id segments', () => {
  it('includes a · author segment when author is provided', () => {
    const out = injectSecurityMarkup('<body></body>', { author: 'Gio' });
    expect(out).toContain('შედგენილია HUBBLE-ის მეშვეობით · Gio');
  });

  it('omits the author segment when author is absent', () => {
    const out = injectSecurityMarkup('<body></body>', {});
    // With no author, the only segment after "მეშვეობით · " is the timestamp,
    // which begins with a digit (e.g. "23.6.2026, ..."). An author would have
    // pushed a non-digit name into that slot instead.
    expect(out).toMatch(/მეშვეობით · \d/);
    expect(out).toContain('შედგენილია HUBBLE-ის მეშვეობით · ');
  });

  it('includes an "ID: <shortId>" segment using the first 8 chars of documentId', () => {
    const out = injectSecurityMarkup('<body></body>', {
      documentId: '1234567890abcdef',
    });
    expect(out).toContain('· ID: 12345678');
    // Only the first 8 chars — never the full id.
    expect(out).not.toContain('1234567890abcdef');
  });

  it('omits the ID segment when documentId is absent', () => {
    const out = injectSecurityMarkup('<body></body>', {});
    expect(out).not.toContain('· ID:');
  });

  it('escapes the author in the footer via escHtml (& < >)', () => {
    const out = injectSecurityMarkup('<body></body>', {
      author: 'A & B <script>',
    });
    expect(out).toContain('A &amp; B &lt;script&gt;');
    // Raw, unescaped form must not leak into the footer.
    expect(out).not.toContain('A & B <script>');
  });
});

describe('injectSecurityMarkup — meta tag escaping & content', () => {
  it('escapes " < > in author/title/subject attributes via escAttr', () => {
    const out = injectSecurityMarkup('<head></head>', {
      author: 'He said "hi" <b>',
      title: 'T <x> "y"',
      subject: 'S "z" <i>',
    });
    expect(out).toContain(
      '<meta name="author" content="He said &quot;hi&quot; &lt;b&gt;">',
    );
    expect(out).toContain('<meta name="title" content="T &lt;x&gt; &quot;y&quot;">');
    expect(out).toContain(
      '<meta name="description" content="S &quot;z&quot; &lt;i&gt;">',
    );
  });

  it('does not escape & in attributes (escAttr only handles " < >)', () => {
    const out = injectSecurityMarkup('<head></head>', { author: 'A & B' });
    // escAttr leaves ampersands untouched (unlike escHtml).
    expect(out).toContain('<meta name="author" content="A & B">');
  });

  it('emits empty author/title meta content when those opts are absent', () => {
    const out = injectSecurityMarkup('<head></head>', {});
    expect(out).toContain('<meta name="author" content="">');
    expect(out).toContain('<meta name="title" content="">');
    expect(out).toContain('<meta name="description" content="">');
  });

  it('falls back to title in the description meta when subject is absent', () => {
    const out = injectSecurityMarkup('<head></head>', { title: 'My Title' });
    expect(out).toContain('<meta name="description" content="My Title">');
  });

  it('prefers subject over title for the description meta', () => {
    const out = injectSecurityMarkup('<head></head>', {
      title: 'My Title',
      subject: 'My Subject',
    });
    expect(out).toContain('<meta name="description" content="My Subject">');
  });

  it('always emits the generator meta and an ISO created meta', () => {
    const out = injectSecurityMarkup('<head></head>', {});
    expect(out).toContain('<meta name="generator" content="HUBBLE Safety App v1.0">');
    // created is the ISO timestamp — assert the well-formed shape.
    const m = out.match(/<meta name="created" content="([^"]+)">/);
    expect(m).not.toBeNull();
    expect(m![1]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('always injects the user-select:none security CSS', () => {
    const out = injectSecurityMarkup('<head></head>', {});
    expect(out).toContain('user-select:none');
    expect(out).toContain('print-color-adjust:exact');
  });
});

// ─── lockPdf ─────────────────────────────────────────────────────────────────

describe('lockPdf', () => {
  it('stamps all metadata and returns the same uri', async () => {
    fsStore['file://doc.pdf'] = btoa('original-bytes');

    const result = await lockPdf('file://doc.pdf', {
      title: 'Title',
      author: 'Author',
      subject: 'Subject',
    });

    expect(result).toBe('file://doc.pdf');
    expect(load).toHaveBeenCalledTimes(1);
    // load called with the decoded bytes + ignoreEncryption flag.
    expect(load.mock.calls[0][1]).toEqual({ ignoreEncryption: true });

    expect(setTitle).toHaveBeenCalledWith('Title');
    expect(setAuthor).toHaveBeenCalledWith('Author');
    expect(setSubject).toHaveBeenCalledWith('Subject');
    expect(setProducer).toHaveBeenCalledWith('HUBBLE Safety Inspection System');
    expect(setCreator).toHaveBeenCalledWith('HUBBLE App');
    expect(setCreationDate).toHaveBeenCalledTimes(1);
    expect(setCreationDate.mock.calls[0][0]).toBeInstanceOf(Date);
    expect(setModificationDate).toHaveBeenCalledTimes(1);
    expect(setKeywords).toHaveBeenCalledWith([
      'HUBBLE',
      'safety',
      'inspection',
      'Georgia',
    ]);

    expect(save).toHaveBeenCalledWith({ useObjectStreams: false });
    // Saved bytes get written back to the same uri (base64-encoded).
    expect(writeAsStringAsync).toHaveBeenCalledTimes(1);
    expect(writeAsStringAsync.mock.calls[0][0]).toBe('file://doc.pdf');
  });

  it('skips title/author/subject setters when those opts are absent', async () => {
    fsStore['file://min.pdf'] = btoa('x');

    await lockPdf('file://min.pdf', {});

    expect(setTitle).not.toHaveBeenCalled();
    expect(setAuthor).not.toHaveBeenCalled();
    expect(setSubject).not.toHaveBeenCalled();
    // Unconditional metadata still applied.
    expect(setProducer).toHaveBeenCalledWith('HUBBLE Safety Inspection System');
    expect(setCreator).toHaveBeenCalledWith('HUBBLE App');
    expect(setKeywords).toHaveBeenCalledTimes(1);
  });

  it('writes the saved bytes back as the round-tripped base64 of SAVED_BYTES', async () => {
    fsStore['file://rt.pdf'] = btoa('orig');

    await lockPdf('file://rt.pdf', { title: 'T' });

    // uint8ArrayToBase64(SAVED_BYTES) == btoa of its char codes.
    const expectedB64 = btoa(String.fromCharCode(...SAVED_BYTES));
    expect(fsStore['file://rt.pdf']).toBe(expectedB64);
  });

  it('swallows errors and still returns the uri when load throws', async () => {
    fsStore['file://bad.pdf'] = btoa('data');
    loadThrows = true;

    const result = await lockPdf('file://bad.pdf', { title: 'T' });

    expect(result).toBe('file://bad.pdf');
    // No write happens because load threw before save.
    expect(writeAsStringAsync).not.toHaveBeenCalled();
    // Original file left intact.
    expect(fsStore['file://bad.pdf']).toBe(btoa('data'));
  });

  it('swallows errors and still returns the uri when read throws', async () => {
    readThrows = true;
    const result = await lockPdf('file://missing.pdf', { title: 'T' });
    expect(result).toBe('file://missing.pdf');
    expect(load).not.toHaveBeenCalled();
  });

  it('swallows errors and still returns the uri when write throws', async () => {
    fsStore['file://wfail.pdf'] = btoa('data');
    writeThrows = true;

    const result = await lockPdf('file://wfail.pdf', { title: 'T' });

    expect(result).toBe('file://wfail.pdf');
    // Metadata was still stamped before the write blew up.
    expect(setTitle).toHaveBeenCalledWith('T');
    expect(save).toHaveBeenCalledTimes(1);
  });
});

// ─── hashPdf ─────────────────────────────────────────────────────────────────

describe('hashPdf', () => {
  it('returns the SHA-256 digest of the file base64', async () => {
    fsStore['file://h.pdf'] = btoa('hello');

    const hash = await hashPdf('file://h.pdf');

    expect(readAsStringAsync).toHaveBeenCalledWith('file://h.pdf', {
      encoding: 'base64',
    });
    expect(digestStringAsync).toHaveBeenCalledWith('SHA-256', btoa('hello'));
    expect(hash).toBe('sha256(' + btoa('hello') + ')');
  });

  it('propagates read errors (does not swallow)', async () => {
    readThrows = true;
    await expect(hashPdf('file://x.pdf')).rejects.toThrow('read failed');
  });

  it('propagates digest errors (does not swallow)', async () => {
    fsStore['file://d.pdf'] = btoa('data');
    digestThrows = true;
    await expect(hashPdf('file://d.pdf')).rejects.toThrow('digest failed');
  });
});

// ─── verifyPdf ───────────────────────────────────────────────────────────────

describe('verifyPdf', () => {
  it('returns true when the current hash matches the stored hash', async () => {
    fsStore['file://v.pdf'] = btoa('content');
    const stored = 'sha256(' + btoa('content') + ')';

    expect(await verifyPdf('file://v.pdf', stored)).toBe(true);
  });

  it('returns false when the current hash differs from the stored hash', async () => {
    fsStore['file://v.pdf'] = btoa('content');

    expect(await verifyPdf('file://v.pdf', 'some-other-hash')).toBe(false);
  });

  it('returns false (swallows) when hashPdf throws via a read error', async () => {
    readThrows = true;
    expect(await verifyPdf('file://gone.pdf', 'whatever')).toBe(false);
  });

  it('returns false (swallows) when hashPdf throws via a digest error', async () => {
    fsStore['file://v.pdf'] = btoa('content');
    digestThrows = true;
    expect(await verifyPdf('file://v.pdf', 'whatever')).toBe(false);
  });
});
