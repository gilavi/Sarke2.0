/**
 * PDF integrity and traceability utilities.
 *
 * All generated PDFs pass through this module so that:
 *   1. The HTML source gets CSS user-select:none + a visible footer watermark.
 *   2. After expo-print renders the PDF, pdf-lib stamps document metadata.
 *   3. A SHA-256 hash of the locked PDF can be stored in Supabase for
 *      tamper detection after the fact.
 *
 * Note: pdf-lib does not expose a PDF encryption API, so "protection" here
 * means traceability + deterrence (metadata, watermark, hash), not
 * cryptographic permission flags.
 *
 * Perf note: photo-heavy act PDFs run to several MB, so this module avoids
 * every avoidable pass over the data on the JS thread — base64 goes straight
 * into/out of pdf-lib (no hand-rolled string↔bytes loops), and the integrity
 * hash is digested from the base64 already in memory at lock time instead of
 * re-reading the file (see the hash memo below).
 */

import { PDFDocument } from 'pdf-lib';
import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';

export interface PdfSecurityOptions {
  /** Document title, e.g. template name or document type */
  title?: string;
  /** Author display name (inspector / specialist full name) */
  author?: string;
  /** Document ID embedded in the footer (inspection / incident / report ID) */
  documentId?: string;
  /** Short subject line, e.g. "შრომის უსაფრთხოების შემოწმება" */
  subject?: string;
}

// ─── Hash memo ───────────────────────────────────────────────────────────────
// `lockPdf` already holds the exact base64 it writes to disk, so it digests
// it there (one native SHA-256 call) and remembers the result per file URI —
// every upload path calls `hashPdf` right after generating, which would
// otherwise re-read the whole multi-MB file. `generateAndSharePdf` registers
// its pretty-named byte-for-byte copy via `notePdfCopy` so the memo also
// covers the URI callers actually receive.

const hashMemo = new Map<string, string>();
const HASH_MEMO_MAX = 16;

function rememberHash(uri: string, hash: string): void {
  hashMemo.delete(uri);
  hashMemo.set(uri, hash);
  if (hashMemo.size > HASH_MEMO_MAX) {
    const oldest = hashMemo.keys().next().value;
    if (oldest !== undefined) hashMemo.delete(oldest);
  }
}

/**
 * Record that the PDF at `to` is a byte-for-byte copy of the one at `from`
 * (the pretty-named share copy made by `generateAndSharePdf`), so
 * `hashPdf(to)` can reuse the hash memoized when `from` was locked. If `from`
 * has no memoized hash (lock skipped or failed), any stale entry for `to` is
 * dropped instead — pretty-name paths are reused across shares and must
 * never serve an old hash.
 */
export function notePdfCopy(from: string, to: string): void {
  const hash = hashMemo.get(from);
  if (hash !== undefined) rememberHash(to, hash);
  else hashMemo.delete(to);
}

/** Let a queued frame (spinner, share UI) paint between multi-MB passes. */
function yieldToUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// ─── HTML injection ──────────────────────────────────────────────────────────

/**
 * Inject security markup into an HTML string before it is passed to
 * `printToFileAsync`. Adds:
 *   - `<meta>` tags with author / title / generator
 *   - CSS `user-select: none` on every element
 *   - A fixed-position footer watermark visible on every page
 */
export function injectSecurityMarkup(
  html: string,
  opts: PdfSecurityOptions,
): string {
  const now = new Date();
  const timestamp = now.toLocaleString('ka-GE');
  const isoNow = now.toISOString();
  const shortId = opts.documentId ? opts.documentId.slice(0, 8) : '';

  const metaTags = `
<meta name="author" content="${escAttr(opts.author ?? '')}">
<meta name="title" content="${escAttr(opts.title ?? '')}">
<meta name="created" content="${isoNow}">
<meta name="generator" content="HUBBLE Safety App v1.0">
<meta name="description" content="${escAttr(opts.subject ?? opts.title ?? '')}">`;

  const securityCss = `
<style>
  *{-webkit-user-select:none;-moz-user-select:none;user-select:none;
     -webkit-print-color-adjust:exact;print-color-adjust:exact;}
  body{-webkit-user-select:none;}
</style>`;

  const footer = `
<div style="position:fixed;bottom:8px;left:0;right:0;text-align:center;
            font-size:8px;color:#9CA3AF;font-family:sans-serif;
            letter-spacing:0.02em;">
  შედგენილია HUBBLE-ის მეშვეობით${opts.author ? ' · ' + escHtml(opts.author) : ''}${
    timestamp ? ' · ' + timestamp : ''
  }${shortId ? ' · ID: ' + shortId : ''}
</div>`;

  // Insert meta tags and CSS into <head> if present, else prepend to document
  if (/<\/head>/i.test(html)) {
    html = html.replace(/<\/head>/i, `${metaTags}${securityCss}</head>`);
  } else {
    html = `${metaTags}${securityCss}` + html;
  }

  // Append footer before </body> if present, else append to end
  if (/<\/body>/i.test(html)) {
    html = html.replace(/<\/body>/i, `${footer}</body>`);
  } else {
    html = html + footer;
  }

  return html;
}

function escAttr(s: string): string {
  return s.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─── pdf-lib metadata stamping ───────────────────────────────────────────────

/**
 * Read the PDF at `uri`, stamp document metadata via pdf-lib, then overwrite
 * the same file. Returns `uri` unchanged for chaining convenience.
 *
 * Runs on native only - safe to call on the raw temp URI returned by
 * `printToFileAsync` before the pretty-name copy is made.
 */
export async function lockPdf(
  uri: string,
  opts: PdfSecurityOptions,
): Promise<string> {
  try {
    const b64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    // pdf-lib takes base64 input directly — no manual string→bytes pass.
    await yieldToUi();
    const pdfDoc = await PDFDocument.load(b64, { ignoreEncryption: true });

    const now = new Date();
    if (opts.title) pdfDoc.setTitle(opts.title);
    if (opts.author) pdfDoc.setAuthor(opts.author);
    if (opts.subject) pdfDoc.setSubject(opts.subject);
    pdfDoc.setProducer('HUBBLE Safety Inspection System');
    pdfDoc.setCreator('HUBBLE App');
    pdfDoc.setCreationDate(now);
    pdfDoc.setModificationDate(now);
    pdfDoc.setKeywords(['HUBBLE', 'safety', 'inspection', 'Georgia']);

    // …and serializes straight back to base64 — no manual bytes→string pass.
    await yieldToUi();
    const lockedB64 = await pdfDoc.saveAsBase64({ useObjectStreams: false });

    await FileSystem.writeAsStringAsync(uri, lockedB64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Digest the base64 we already hold (native call, no file re-read) so a
    // following hashPdf(uri) is free. Same hash input as ever — SHA-256 of
    // the Base64 representation — so stored pdf_hash values keep verifying.
    rememberHash(
      uri,
      await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, lockedB64),
    );
  } catch {
    // If locking fails for any reason, we keep the original PDF intact.
    // PDF generation must not fail due to a metadata step.
  }
  return uri;
}

// ─── Integrity hash ──────────────────────────────────────────────────────────

async function digestPdfFile(uri: string): Promise<string> {
  const b64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    b64,
  );
}

/**
 * Compute a SHA-256 digest of the PDF at `uri` (hashes the Base64
 * representation, which is deterministic for the same bytes). Served from
 * the lock-time memo when the file was just stamped/copied by this pipeline
 * — no file re-read — otherwise reads the file once and digests natively.
 * Store the result alongside the PDF record in Supabase to enable tamper
 * detection.
 */
export async function hashPdf(uri: string): Promise<string> {
  return hashMemo.get(uri) ?? digestPdfFile(uri);
}

/**
 * Return `true` if the PDF at `uri` matches `storedHash`; `false` if the
 * file was modified after the hash was recorded. Always re-reads and
 * re-digests the file (never the memo) — tampering is what this exists to
 * catch.
 */
export async function verifyPdf(
  uri: string,
  storedHash: string,
): Promise<boolean> {
  try {
    const current = await digestPdfFile(uri);
    return current === storedHash;
  } catch {
    return false;
  }
}
