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

// ─── Pure-JS Base64 ↔ Uint8Array (no Buffer polyfill needed) ────────────────

function base64ToUint8Array(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let s = '';
  // chunk to avoid call-stack overflow on large PDFs
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    s += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(s);
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
 * Runs on native only — safe to call on the raw temp URI returned by
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
    const bytes = base64ToUint8Array(b64);
    const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });

    const now = new Date();
    if (opts.title) pdfDoc.setTitle(opts.title);
    if (opts.author) pdfDoc.setAuthor(opts.author);
    if (opts.subject) pdfDoc.setSubject(opts.subject);
    pdfDoc.setProducer('HUBBLE Safety Inspection System');
    pdfDoc.setCreator('HUBBLE App');
    pdfDoc.setCreationDate(now);
    pdfDoc.setModificationDate(now);
    pdfDoc.setKeywords(['HUBBLE', 'safety', 'inspection', 'Georgia']);

    const lockedBytes = await pdfDoc.save({ useObjectStreams: false });
    const lockedB64 = uint8ArrayToBase64(lockedBytes);

    await FileSystem.writeAsStringAsync(uri, lockedB64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch {
    // If locking fails for any reason, we keep the original PDF intact.
    // PDF generation must not fail due to a metadata step.
  }
  return uri;
}

// ─── Integrity hash ──────────────────────────────────────────────────────────

/**
 * Compute a SHA-256 digest of the PDF at `uri` (hashes the Base64
 * representation, which is deterministic for the same bytes). Store the
 * result alongside the PDF record in Supabase to enable tamper detection.
 */
export async function hashPdf(uri: string): Promise<string> {
  const b64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    b64,
  );
}

/**
 * Return `true` if the PDF at `uri` matches `storedHash`; `false` if the
 * file was modified after the hash was recorded.
 */
export async function verifyPdf(
  uri: string,
  storedHash: string,
): Promise<boolean> {
  try {
    const current = await hashPdf(uri);
    return current === storedHash;
  } catch {
    return false;
  }
}
