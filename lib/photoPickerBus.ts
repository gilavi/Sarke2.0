// Tiny one-shot bus to ferry a picked photo URI back from /photo-picker to
// whatever screen pushed it. expo-router doesn't natively return values from
// modal routes; using a module-level callback keeps it honest without
// dragging in extra navigation state.
//
// Usage:
//   import { setPhotoPickerCallback } from '../lib/photoPickerBus';
//   setPhotoPickerCallback(uri => { ... });
//   router.push('/photo-picker');
// Inside the picker screen:
//   import { resolvePhotoPicker } from '../lib/photoPickerBus';
//   resolvePhotoPicker(uri);
//   router.back();

let pending: ((uri: string | null) => void) | null = null;
let pendingToken: number | null = null;
let resolveToken: number | null = null;
let pendingAnnotate: ((uri: string | null) => void) | null = null;
let pendingAnnotateToken: number | null = null;
let resolveAnnotateToken: number | null = null;

let tokenCounter = 0;
function nextToken(): number {
  tokenCounter = (tokenCounter + 1) | 0;
  return tokenCounter;
}

export function setPhotoPickerCallback(cb: (uri: string | null) => void): number {
  pending = cb;
  pendingToken = nextToken();
  resolveToken = pendingToken;
  return pendingToken;
}

function isPhotoPickerStale(): boolean {
  return resolveToken !== pendingToken;
}

export function resolvePhotoPicker(uri: string | null): void {
  if (isPhotoPickerStale() || !pending) return;
  const cb = pending;
  pending = null;
  resolveToken = null;
  pendingToken = null;
  cb(uri);
}

export function cancelPhotoPicker(): void {
  resolvePhotoPicker(null);
}

/** Callback for annotated photo return from PhotoAnnotator. */
export function setPhotoAnnotateCallback(cb: (uri: string | null) => void): number {
  pendingAnnotate = cb;
  pendingAnnotateToken = nextToken();
  resolveAnnotateToken = pendingAnnotateToken;
  return pendingAnnotateToken;
}

function isPhotoAnnotateStale(): boolean {
  return resolveAnnotateToken !== pendingAnnotateToken;
}

export function resolvePhotoAnnotate(uri: string | null): void {
  if (isPhotoAnnotateStale() || !pendingAnnotate) return;
  const cb = pendingAnnotate;
  pendingAnnotate = null;
  resolveAnnotateToken = null;
  pendingAnnotateToken = null;
  cb(uri);
}

export function cancelPhotoAnnotate(): void {
  resolvePhotoAnnotate(null);
}
