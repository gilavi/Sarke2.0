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
let pendingAnnotate: ((uri: string | null) => void) | null = null;

export function setPhotoPickerCallback(cb: (uri: string | null) => void): void {
  pending = cb;
}

export function resolvePhotoPicker(uri: string | null): void {
  const cb = pending;
  pending = null;
  cb?.(uri);
}

export function cancelPhotoPicker(): void {
  resolvePhotoPicker(null);
}

/** Callback for annotated photo return from PhotoAnnotator. */
export function setPhotoAnnotateCallback(cb: (uri: string | null) => void): void {
  pendingAnnotate = cb;
}

export function resolvePhotoAnnotate(uri: string | null): void {
  const cb = pendingAnnotate;
  pendingAnnotate = null;
  cb?.(uri);
}

export function cancelPhotoAnnotate(): void {
  resolvePhotoAnnotate(null);
}
