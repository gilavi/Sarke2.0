// Tiny one-shot bus to ferry picked photo URIs back from /photo-picker to
// whatever screen pushed it. expo-router doesn't natively return values from
// modal routes; using a module-level callback keeps it honest without
// dragging in extra navigation state.
//
// The picker callback delivers an ARRAY of URIs: a single shutter capture or a
// single library pick resolves with `[uri]`; the recent-strip / system-library
// multi-select resolves with `[uri1, uri2, …]`. Cancel resolves with `null`.
//
// Usage:
//   import { setPhotoPickerCallback } from '../lib/photoPickerBus';
//   const token = setPhotoPickerCallback(uris => { ... });   // uris: string[] | null
//   router.push('/photo-picker');                            // add ?multi=1 for batch UX
//   // On unmount: cancelPhotoPicker(token);
// Inside the picker screen:
//   import { resolvePhotoPicker } from '../lib/photoPickerBus';
//   resolvePhotoPicker([uri]);   // or [uri1, uri2, …], or null to cancel
//   router.back();
//
// Side-channels (read immediately after the callback fires, before another pick):
//   - location:    the GPS fix captured alongside the photos (one per batch).
//   - fromCapture: true when the batch came from a live shutter capture (the
//     hook annotates those); false for strip/library batches (skip annotation).
import type { PhotoLocation } from '../utils/location';

let _lastPhotoLocation: PhotoLocation | null = null;

export function setLastPhotoLocation(loc: PhotoLocation | null): void {
  _lastPhotoLocation = loc;
}

export function getLastPhotoLocation(): PhotoLocation | null {
  return _lastPhotoLocation;
}

// Whether the most recent resolve came from a live shutter capture (annotate it)
// vs a strip/library batch (skip annotation).
let _lastPhotoFromCapture = false;

export function setLastPhotoFromCapture(fromCapture: boolean): void {
  _lastPhotoFromCapture = fromCapture;
}

export function getLastPhotoFromCapture(): boolean {
  return _lastPhotoFromCapture;
}

const callbacks = new Map<number, (uris: string[] | null) => void>();
const annotateCallbacks = new Map<number, (uri: string | null) => void>();

let lastToken: number | null = null;
let lastAnnotateToken: number | null = null;

let tokenCounter = 0;
function nextToken(): number {
  tokenCounter = (tokenCounter + 1) | 0;
  return tokenCounter;
}

export function setPhotoPickerCallback(cb: (uris: string[] | null) => void): number {
  const token = nextToken();
  callbacks.set(token, cb);
  lastToken = token;
  return token;
}

export function resolvePhotoPicker(uris: string[] | null): void {
  if (lastToken === null) return;
  const cb = callbacks.get(lastToken);
  if (!cb) return;
  callbacks.delete(lastToken);
  lastToken = null;
  cb(uris);
}

export function cancelPhotoPicker(token?: number): void {
  if (token !== undefined) {
    callbacks.delete(token);
    if (lastToken === token) {
      lastToken = null;
    }
  } else {
    // Legacy no-arg: resolve last with null
    if (lastToken !== null) {
      const cb = callbacks.get(lastToken);
      callbacks.delete(lastToken);
      if (cb) cb(null);
      lastToken = null;
    }
  }
}

/** Callback for annotated photo return from PhotoAnnotator. */
export function setPhotoAnnotateCallback(cb: (uri: string | null) => void): number {
  const token = nextToken();
  annotateCallbacks.set(token, cb);
  lastAnnotateToken = token;
  return token;
}

export function resolvePhotoAnnotate(uri: string | null): void {
  if (lastAnnotateToken === null) return;
  const cb = annotateCallbacks.get(lastAnnotateToken);
  if (!cb) return;
  annotateCallbacks.delete(lastAnnotateToken);
  lastAnnotateToken = null;
  cb(uri);
}

export function cancelPhotoAnnotate(token?: number): void {
  if (token !== undefined) {
    annotateCallbacks.delete(token);
    if (lastAnnotateToken === token) {
      lastAnnotateToken = null;
    }
  } else {
    if (lastAnnotateToken !== null) {
      const cb = annotateCallbacks.get(lastAnnotateToken);
      annotateCallbacks.delete(lastAnnotateToken);
      if (cb) cb(null);
      lastAnnotateToken = null;
    }
  }
}
