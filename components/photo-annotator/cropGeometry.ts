// Pure geometry for the photo cropper. NO React Native imports → unit-testable.
//
// All rects here are in DISPLAY space (the on-screen photo box, == photoLayout)
// until displayRectToPixels maps the chosen rect into SOURCE pixels for
// expo-image-manipulator's crop action.

export interface Size {
  w: number;
  h: number;
}

/** A crop rectangle in display coordinates. */
export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A crop rectangle in source pixels, as expo-image-manipulator expects. */
export interface PixelRect {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

export type Corner = 'tl' | 'tr' | 'bl' | 'br';

export type AspectKey = 'free' | 'square' | '4:3' | '16:9';

export interface AspectPreset {
  key: AspectKey;
  /** Display label for the chip (the 'free' label is translated by the caller). */
  label: string;
  /** w / h, or null for free-form. */
  ratio: number | null;
}

export const ASPECT_PRESETS: AspectPreset[] = [
  { key: 'free', label: 'Free', ratio: null },
  { key: 'square', label: '1:1', ratio: 1 },
  { key: '4:3', label: '4:3', ratio: 4 / 3 },
  { key: '16:9', label: '16:9', ratio: 16 / 9 },
];

/** Smallest crop edge in display px — keeps the rect grabbable. */
export const MIN_CROP = 24;

/**
 * Clamp a rect to `[0, 0, bounds.w, bounds.h]`. Width/height are first capped to
 * the bounds, then the origin is pulled in so the whole rect stays inside.
 */
export function clampRectToBounds(rect: CropRect, bounds: Size): CropRect {
  const w = Math.min(rect.w, bounds.w);
  const h = Math.min(rect.h, bounds.h);
  const x = Math.min(Math.max(0, rect.x), bounds.w - w);
  const y = Math.min(Math.max(0, rect.y), bounds.h - h);
  return { x, y, w, h };
}

/** Largest centered rect of the given aspect (w/h) inside bounds; null → full. */
export function centeredAspectRect(bounds: Size, ratio: number | null): CropRect {
  if (ratio == null) return { x: 0, y: 0, w: bounds.w, h: bounds.h };
  let w = bounds.w;
  let h = w / ratio;
  if (h > bounds.h) {
    h = bounds.h;
    w = h * ratio;
  }
  return { x: (bounds.w - w) / 2, y: (bounds.h - h) / 2, w, h };
}

/**
 * Re-fit `rect` to an aspect ratio, preserving its center, clamped to bounds.
 * `null` ratio leaves the rect unchanged (just clamped). Used when the user
 * toggles a preset chip while a crop rect already exists.
 */
export function enforceAspect(rect: CropRect, bounds: Size, ratio: number | null): CropRect {
  if (ratio == null) return clampRectToBounds(rect, bounds);
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  let w = rect.w;
  let h = w / ratio;
  if (w > bounds.w) {
    w = bounds.w;
    h = w / ratio;
  }
  if (h > bounds.h) {
    h = bounds.h;
    w = h * ratio;
  }
  return clampRectToBounds({ x: cx - w / 2, y: cy - h / 2, w, h }, bounds);
}

/** Translate `rect` by (dx, dy), clamped so it stays fully inside bounds. */
export function moveRect(rect: CropRect, dx: number, dy: number, bounds: Size): CropRect {
  return clampRectToBounds({ ...rect, x: rect.x + dx, y: rect.y + dy }, bounds);
}

/**
 * Resize `rect` by dragging `corner` by (dx, dy) from the rect captured at
 * gesture start, keeping the opposite corner anchored. `ratio` null → free;
 * otherwise height is derived from width to hold the aspect. Result is clamped
 * to bounds and floored at MIN_CROP.
 */
export function resizeRect(
  rect: CropRect,
  corner: Corner,
  dx: number,
  dy: number,
  bounds: Size,
  ratio: number | null,
): CropRect {
  const right = rect.x + rect.w;
  const bottom = rect.y + rect.h;

  // anchor = fixed opposite corner; free = the dragged corner's new position.
  let ax: number;
  let ay: number;
  let fx: number;
  let fy: number;
  switch (corner) {
    case 'br':
      ax = rect.x; ay = rect.y; fx = right + dx; fy = bottom + dy; break;
    case 'tl':
      ax = right; ay = bottom; fx = rect.x + dx; fy = rect.y + dy; break;
    case 'tr':
      ax = rect.x; ay = bottom; fx = right + dx; fy = rect.y + dy; break;
    case 'bl':
    default:
      ax = right; ay = rect.y; fx = rect.x + dx; fy = bottom + dy; break;
  }

  const signX = fx >= ax ? 1 : -1;
  const signY = fy >= ay ? 1 : -1;
  let w = Math.abs(fx - ax);
  let h = Math.abs(fy - ay);

  if (ratio != null) {
    // Drive by whichever axis demands the larger box, then derive the other.
    if (w / ratio >= h) h = w / ratio;
    else w = h * ratio;
  }

  // Limit the box so it can't cross the bounds given the anchor + drag direction.
  const maxW = signX > 0 ? bounds.w - ax : ax;
  const maxH = signY > 0 ? bounds.h - ay : ay;
  if (ratio != null) {
    const s = Math.min(1, maxW / w, maxH / h);
    w *= s; h *= s;
  } else {
    w = Math.min(w, maxW);
    h = Math.min(h, maxH);
  }

  w = Math.max(MIN_CROP, w);
  h = ratio != null ? w / ratio : Math.max(MIN_CROP, h);

  const x = signX > 0 ? ax : ax - w;
  const y = signY > 0 ? ay : ay - h;
  return clampRectToBounds({ x, y, w, h }, bounds);
}

/**
 * Map a display-space rect to an integer SOURCE-pixel crop. Rounds first, THEN
 * clamps so `originX + width <= imgW` and `originY + height <= imgH` — rounding
 * can otherwise push the far edge 1px past the image and the native crop throws.
 */
export function displayRectToPixels(
  rect: CropRect,
  scale: number,
  imgW: number,
  imgH: number,
): PixelRect {
  let originX = Math.round(rect.x * scale);
  let originY = Math.round(rect.y * scale);
  let width = Math.round(rect.w * scale);
  let height = Math.round(rect.h * scale);

  // Leave room for at least a 1px crop, then size to the remaining space, so
  // `origin + size <= dim` holds even for a degenerate edge-pinned rect.
  originX = Math.max(0, Math.min(originX, imgW - 1));
  originY = Math.max(0, Math.min(originY, imgH - 1));
  width = Math.max(1, Math.min(width, imgW - originX));
  height = Math.max(1, Math.min(height, imgH - originY));
  return { originX, originY, width, height };
}

/** Swap dimensions for a 90°/270° rotation. */
export function swapDimsForRotate(size: Size): Size {
  return { w: size.h, h: size.w };
}

/* ───────────────── Pinch-zoom / pan crop (no aspect presets) ─────────────────
 *
 * The simplified cropper (no resizable rect, no aspect chips) frames a photo by
 * pinch-to-zoom + drag. The crop WINDOW is the whole photo box, whose aspect ==
 * the image aspect, so at scale 1 the image exactly fills it (no crop). The image
 * is scaled by `scale` about the box CENTER and translated by (tx, ty) display px
 * — exactly the RN transform `[{translateX:tx},{translateY:ty},{scale}]` with the
 * default center transform-origin. Zooming in (scale ≥ 1) shrinks the visible
 * source region; the output keeps the source aspect (no ratio picker).
 */

/** A pinch-zoom / pan transform of the photo, in display space. */
export interface ZoomPan {
  /** Uniform scale, ≥ 1 (1 = whole image, no crop). */
  scale: number;
  /** Horizontal pan of the image center, display px (+ = image moved right). */
  tx: number;
  /** Vertical pan of the image center, display px (+ = image moved down). */
  ty: number;
}

export const MAX_ZOOM = 6;

/**
 * Largest pan (display px, per axis) that keeps the scaled image fully covering
 * the crop window — i.e. no empty gap creeps into the frame. Zero at scale 1.
 */
export function panClamp(box: Size, scale: number): { maxX: number; maxY: number } {
  if (!(box.w > 0) || !(box.h > 0)) return { maxX: 0, maxY: 0 };
  const s = Math.max(1, scale);
  return { maxX: (box.w * (s - 1)) / 2, maxY: (box.h * (s - 1)) / 2 };
}

/** True when a transform is (within tolerance) the identity — nothing to crop. */
export function isIdentityZoomPan(t: ZoomPan, eps = 0.75): boolean {
  return Math.abs(t.scale - 1) < 1e-3 && Math.abs(t.tx) < eps && Math.abs(t.ty) < eps;
}

/**
 * Map a pinch-zoom/pan transform to the SOURCE-pixel crop rect that the window
 * shows. `box` is the on-screen photo box (== photoLayout, aspect == image
 * aspect); `img` is the source pixel size. Pan is assumed pre-clamped by
 * `panClamp` (this also clamps defensively). Rounds THEN clamps so
 * `origin + size <= dim` — a 1px overshoot makes the native crop throw.
 *
 * Derivation: with center origin the image center sits at boxCenter + (tx,ty),
 *   originX = imgW·(s-1)/(2s) − (imgW/boxW)·tx / s,   width = imgW / s
 * and symmetrically for Y.
 */
export function zoomPanToPixels(box: Size, img: Size, t: ZoomPan): PixelRect {
  // Defensive: a zero/negative box would divide to Infinity → NaN crop. Callers
  // only render the cropper once photoLayout (and thus the box) is positive, but
  // this is a pure helper, so guard it.
  if (!(box.w > 0) || !(box.h > 0) || !(img.w > 0) || !(img.h > 0)) {
    return { originX: 0, originY: 0, width: Math.max(1, Math.round(img.w) || 1), height: Math.max(1, Math.round(img.h) || 1) };
  }
  const s = Math.max(1, t.scale);
  const { maxX, maxY } = panClamp(box, s);
  const tx = Math.min(maxX, Math.max(-maxX, t.tx));
  const ty = Math.min(maxY, Math.max(-maxY, t.ty));

  const kx = img.w / box.w; // source px per display px at scale 1
  const ky = img.h / box.h;

  let originX = Math.round((img.w * (s - 1)) / (2 * s) - (kx * tx) / s);
  let originY = Math.round((img.h * (s - 1)) / (2 * s) - (ky * ty) / s);
  let width = Math.round(img.w / s);
  let height = Math.round(img.h / s);

  originX = Math.max(0, Math.min(originX, img.w - 1));
  originY = Math.max(0, Math.min(originY, img.h - 1));
  width = Math.max(1, Math.min(width, img.w - originX));
  height = Math.max(1, Math.min(height, img.h - originY));
  return { originX, originY, width, height };
}
