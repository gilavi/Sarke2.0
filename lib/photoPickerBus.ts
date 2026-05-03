// Tiny one-shot bus to ferry a picked photo URI back from /photo-picker to
// whatever screen pushed it. expo-router doesn't natively return values from
// modal routes; using a module-level callback keeps it honest without
// dragging in extra navigation state.
//
// Usage:
//   import { setPhotoPickerCallback } from '../lib/photoPickerBus';
//   const token = setPhotoPickerCallback(uri => { ... });
//   router.push('/photo-picker');
//   // On unmount: cancelPhotoPicker(token);
// Inside the picker screen:
//   import { resolvePhotoPicker } from '../lib/photoPickerBus';
//   resolvePhotoPicker(uri);
//   router.back();
//
// Location side-channel: photo-picker.tsx stores the location it captured
// alongside the URI here. Callers read it immediately after the callback fires.
import type { PhotoLocation } from '../utils/location';

let _lastPhotoLocation: PhotoLocation | null = null;

export function setLastPhotoLocation(loc: PhotoLocation | null): void {
  _lastPhotoLocation = loc;
}

export function getLastPhotoLocation(): PhotoLocation | null {
  return _lastPhotoLocation;
}

const callbacks = new Map<number, (uri: string | null) => void>();
const annotateCallbacks = new Map<number, (uri: string | null) => void>();

let lastToken: number | null = null;
let lastAnnotateToken: number | null = null;

let tokenCounter = 0;
function nextToken(): number {
  tokenCounter = (tokenCounter + 1) | 0;
  return tokenCounter;
}

export function setPhotoPickerCallback(cb: (uri: string | null) => void): number {
  const token = nextToken();
  callbacks.set(token, cb);
  lastToken = token;
  return token;
}

export function resolvePhotoPicker(uri: string | null): void {
  if (lastToken === null) return;
  const cb = callbacks.get(lastToken);
  if (!cb) return;
  callbacks.delete(lastToken);
  lastToken = null;
  cb(uri);
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
