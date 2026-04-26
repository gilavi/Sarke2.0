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

  // 2. Fallback: FileReader
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === 'string' && result.startsWith('data:')) {
        resolve(result);
      } else {
        reject(new Error('FileReader produced no data URL'));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
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
