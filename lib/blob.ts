import * as FileSystem from 'expo-file-system/legacy';

/**
 * Minimum bytes after the `data:<mime>;base64,` comma for a payload to be
 * considered a real image. A successful encode of even a 1×1 PNG is well
 * over 50 chars; anything shorter is the "0-byte upload" failure mode.
 */
const MIN_DATA_URL_PAYLOAD = 32;

/**
 * Convert a Blob to a `data:` URL.
 *
 * In React Native / Hermes, `FileReader.readAsDataURL` on a Blob produced by
 * `supabase.storage.download()` is unreliable — it sometimes resolves to an
 * empty string or a result missing the `data:<mime>;base64,` prefix, which
 * breaks PDF image embedding. We try the binary `arrayBuffer()` path first
 * (deterministic) and fall back to FileReader (works on web / older RN).
 */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  // 1. Preferred path: arrayBuffer() + manual base64 encode
  try {
    if (typeof (blob as any).arrayBuffer === 'function') {
      const ab: ArrayBuffer = await (blob as any).arrayBuffer();
      const base64 = arrayBufferToBase64(ab);
      const mime = blob.type || 'image/jpeg';
      if (base64.length > 0) return `data:${mime};base64,${base64}`;
    }
  } catch {
    // fall through
  }

  // 2. Fallback: FileReader. Reject empty/near-empty payloads so a 0-byte
  // blob can't smuggle a syntactically-valid `data:image/jpeg;base64,` (no
  // bytes after the comma) past callers and into a broken `<img>` tag.
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string' || !result.startsWith('data:')) {
        reject(new Error('FileReader produced no data URL'));
        return;
      }
      const comma = result.indexOf(',');
      if (comma < 0 || result.length - comma - 1 < MIN_DATA_URL_PAYLOAD) {
        reject(new Error('FileReader produced empty data URL'));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Read a local asset URI (typically `file://…` from ImagePicker / camera) into
 * a Blob suitable for `supabase.storage.upload`.
 *
 * `fetch(file://).blob()` is what every example uses, but Hermes occasionally
 * returns a 0-byte Blob for it — Supabase happily uploads the empty object,
 * the DB row points at a real path, and the failure stays invisible until PDF
 * generation tries to embed it. To avoid that we verify `blob.size > 0` and
 * fall back to `FileSystem.readAsStringAsync(uri, Base64)` → manual Blob,
 * which is reliable on RN. Throws if both routes return no bytes so the
 * caller's existing toast surfaces the real failure to the user instead of
 * silently corrupting future PDFs.
 */
export async function assetUriToBlob(uri: string, mimeType: string): Promise<Blob> {
  try {
    const res = await fetch(uri);
    const blob = await res.blob();
    if (blob && blob.size > 0) return blob;
  } catch {
    // fall through to FileSystem path
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  if (!base64) throw new Error(`asset at ${uri} is empty`);
  const ab = base64ToArrayBuffer(base64);
  if (ab.byteLength === 0) throw new Error(`asset at ${uri} decoded to 0 bytes`);
  return new Blob([ab], { type: mimeType });
}

/**
 * Decode a `data:<mime>;base64,<payload>` URL into an ArrayBuffer.
 * Use this instead of `fetch(dataUrl).blob()` when uploading to storage —
 * the fetch path silently produces 0-byte blobs in Hermes.
 */
export function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) throw new Error('not a data URL');
  const b64 = dataUrl.slice(comma + 1);
  return base64ToArrayBuffer(b64);
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const g = globalThis as unknown as {
    atob?: (s: string) => string;
    Buffer?: { from: (s: string, enc: string) => Uint8Array };
  };
  if (typeof g.atob === 'function') {
    const binary = g.atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }
  if (g.Buffer) {
    const buf = g.Buffer.from(b64, 'base64');
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  }
  throw new Error('no base64 decoder available');
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000; // stay well under String.fromCharCode.apply argument limit
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    // Array.from avoids passing a TypedArray to apply (which some engines reject).
    binary += String.fromCharCode.apply(null, Array.from(chunk) as number[]);
  }
  const g = globalThis as unknown as {
    btoa?: (s: string) => string;
    Buffer?: { from: (s: string, enc: string) => { toString: (enc: string) => string } };
  };
  if (typeof g.btoa === 'function') return g.btoa(binary);
  if (g.Buffer) return g.Buffer.from(binary, 'binary').toString('base64');
  throw new Error('No base64 encoder available');
}
