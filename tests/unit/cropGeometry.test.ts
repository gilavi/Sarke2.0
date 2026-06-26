/**
 * Unit tests for the pure cropper geometry (`components/photo-annotator/cropGeometry.ts`).
 *
 * These lock the load-bearing invariants the native crop depends on:
 *  - rects never escape the image bounds (clamp),
 *  - aspect-locked rects hold their ratio,
 *  - display→pixel mapping rounds THEN clamps so `origin + size <= dim`
 *    (a 1px overshoot makes expo-image-manipulator's crop throw on Android),
 *  - rotate swaps dimensions.
 */

import { describe, it, expect } from 'vitest';
import {
  clampRectToBounds,
  centeredAspectRect,
  enforceAspect,
  moveRect,
  resizeRect,
  displayRectToPixels,
  swapDimsForRotate,
  MIN_CROP,
  panClamp,
  isIdentityZoomPan,
  zoomPanToPixels,
  MAX_ZOOM,
} from '../../components/photo-annotator/cropGeometry';

const BOUNDS = { w: 300, h: 200 };

describe('clampRectToBounds', () => {
  it('pulls an off-edge rect back inside', () => {
    const r = clampRectToBounds({ x: -50, y: -10, w: 100, h: 50 }, BOUNDS);
    expect(r).toEqual({ x: 0, y: 0, w: 100, h: 50 });
  });

  it('caps oversized dimensions to the bounds', () => {
    const r = clampRectToBounds({ x: 0, y: 0, w: 999, h: 999 }, BOUNDS);
    expect(r).toEqual({ x: 0, y: 0, w: 300, h: 200 });
  });

  it('keeps a rect that overflows the far edge fully inside', () => {
    const r = clampRectToBounds({ x: 280, y: 180, w: 100, h: 100 }, BOUNDS);
    expect(r.x + r.w).toBeLessThanOrEqual(BOUNDS.w);
    expect(r.y + r.h).toBeLessThanOrEqual(BOUNDS.h);
  });
});

describe('centeredAspectRect', () => {
  it('returns the full box for free (null ratio)', () => {
    expect(centeredAspectRect(BOUNDS, null)).toEqual({ x: 0, y: 0, w: 300, h: 200 });
  });

  it('fits a 16:9 box centered, width-limited', () => {
    const r = centeredAspectRect(BOUNDS, 16 / 9);
    // height-limited would be h=200,w=355.5 > 300, so it's width-limited: w=300,h=168.75
    expect(r.w).toBeCloseTo(300);
    expect(r.h).toBeCloseTo(168.75);
    expect(r.x).toBeCloseTo(0);
    expect(r.y).toBeCloseTo((200 - 168.75) / 2);
  });

  it('fits a square centered, height-limited on a landscape box', () => {
    const r = centeredAspectRect(BOUNDS, 1);
    expect(r.w).toBeCloseTo(200);
    expect(r.h).toBeCloseTo(200);
    expect(r.x).toBeCloseTo(50);
  });
});

describe('enforceAspect', () => {
  it('holds the ratio and preserves center', () => {
    const start = { x: 50, y: 50, w: 120, h: 120 };
    const r = enforceAspect(start, BOUNDS, 4 / 3);
    expect(r.w / r.h).toBeCloseTo(4 / 3, 5);
    // center preserved (within clamp)
    expect(r.x + r.w / 2).toBeCloseTo(110, 0);
    expect(r.y + r.h / 2).toBeCloseTo(110, 0);
  });

  it('null ratio just clamps', () => {
    const r = enforceAspect({ x: -5, y: 0, w: 50, h: 50 }, BOUNDS, null);
    expect(r.x).toBe(0);
  });

  it('result stays inside bounds', () => {
    const r = enforceAspect({ x: 250, y: 150, w: 200, h: 50 }, BOUNDS, 16 / 9);
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.y).toBeGreaterThanOrEqual(0);
    expect(r.x + r.w).toBeLessThanOrEqual(BOUNDS.w + 1e-6);
    expect(r.y + r.h).toBeLessThanOrEqual(BOUNDS.h + 1e-6);
  });
});

describe('moveRect', () => {
  it('translates within bounds', () => {
    const r = moveRect({ x: 10, y: 10, w: 50, h: 50 }, 20, 30, BOUNDS);
    expect(r).toEqual({ x: 30, y: 40, w: 50, h: 50 });
  });

  it('stops at the far edge instead of escaping', () => {
    const r = moveRect({ x: 260, y: 160, w: 50, h: 50 }, 100, 100, BOUNDS);
    expect(r.x).toBe(BOUNDS.w - 50);
    expect(r.y).toBe(BOUNDS.h - 50);
  });
});

describe('resizeRect', () => {
  it('free resize from the br corner grows the box', () => {
    const r = resizeRect({ x: 50, y: 50, w: 50, h: 50 }, 'br', 40, 30, BOUNDS, null);
    expect(r.x).toBe(50);
    expect(r.y).toBe(50);
    expect(r.w).toBe(90);
    expect(r.h).toBe(80);
  });

  it('aspect-locked resize keeps the ratio', () => {
    const r = resizeRect({ x: 20, y: 20, w: 80, h: 60 }, 'br', 80, 0, BOUNDS, 4 / 3);
    expect(r.w / r.h).toBeCloseTo(4 / 3, 5);
  });

  it('never shrinks below MIN_CROP', () => {
    const r = resizeRect({ x: 50, y: 50, w: 100, h: 100 }, 'br', -300, -300, BOUNDS, null);
    expect(r.w).toBeGreaterThanOrEqual(MIN_CROP);
    expect(r.h).toBeGreaterThanOrEqual(MIN_CROP);
  });

  it('stays within bounds when dragged past an edge', () => {
    const r = resizeRect({ x: 50, y: 50, w: 50, h: 50 }, 'br', 1000, 1000, BOUNDS, null);
    expect(r.x + r.w).toBeLessThanOrEqual(BOUNDS.w);
    expect(r.y + r.h).toBeLessThanOrEqual(BOUNDS.h);
  });
});

describe('displayRectToPixels', () => {
  it('scales display coords into source pixels', () => {
    const px = displayRectToPixels({ x: 10, y: 20, w: 100, h: 50 }, 4, 1200, 800);
    expect(px).toEqual({ originX: 40, originY: 80, width: 400, height: 200 });
  });

  it('rounds then clamps so origin + size never exceeds the image', () => {
    // scale chosen so rounding pushes the far edge 1px over the bound
    const imgW = 1000;
    const imgH = 1000;
    const px = displayRectToPixels({ x: 0, y: 0, w: 333.4, h: 333.4 }, 3, imgW, imgH);
    expect(px.originX + px.width).toBeLessThanOrEqual(imgW);
    expect(px.originY + px.height).toBeLessThanOrEqual(imgH);
  });

  it('clamps a full-image crop exactly to the bounds', () => {
    const px = displayRectToPixels({ x: 0, y: 0, w: 300, h: 200 }, 4, 1200, 800);
    expect(px).toEqual({ originX: 0, originY: 0, width: 1200, height: 800 });
  });

  it('never returns a zero-size crop', () => {
    const px = displayRectToPixels({ x: 1199.9, y: 0, w: 0.01, h: 0.01 }, 1, 1200, 800);
    expect(px.width).toBeGreaterThanOrEqual(1);
    expect(px.height).toBeGreaterThanOrEqual(1);
    expect(px.originX + px.width).toBeLessThanOrEqual(1200);
  });
});

describe('swapDimsForRotate', () => {
  it('swaps w and h', () => {
    expect(swapDimsForRotate({ w: 1200, h: 800 })).toEqual({ w: 800, h: 1200 });
  });
});

describe('panClamp', () => {
  it('is zero at scale 1 (no room to pan)', () => {
    expect(panClamp({ w: 300, h: 200 }, 1)).toEqual({ maxX: 0, maxY: 0 });
  });

  it('grows with zoom: half the slack each side', () => {
    // at 2× the image is twice the box, so it can pan ± half a box each axis
    expect(panClamp({ w: 300, h: 200 }, 2)).toEqual({ maxX: 150, maxY: 100 });
  });

  it('treats sub-1 scale as 1', () => {
    expect(panClamp({ w: 300, h: 200 }, 0.5)).toEqual({ maxX: 0, maxY: 0 });
  });
});

describe('isIdentityZoomPan', () => {
  it('true for the untouched transform', () => {
    expect(isIdentityZoomPan({ scale: 1, tx: 0, ty: 0 })).toBe(true);
  });
  it('tolerates sub-pixel jitter', () => {
    expect(isIdentityZoomPan({ scale: 1.0001, tx: 0.4, ty: -0.3 })).toBe(true);
  });
  it('false once zoomed', () => {
    expect(isIdentityZoomPan({ scale: 1.5, tx: 0, ty: 0 })).toBe(false);
  });
  it('false once panned', () => {
    expect(isIdentityZoomPan({ scale: 1, tx: 12, ty: 0 })).toBe(false);
  });
});

describe('zoomPanToPixels', () => {
  const BOX = { w: 300, h: 200 };
  const IMG = { w: 1200, h: 800 };

  it('identity transform == the whole image', () => {
    const px = zoomPanToPixels(BOX, IMG, { scale: 1, tx: 0, ty: 0 });
    expect(px).toEqual({ originX: 0, originY: 0, width: 1200, height: 800 });
  });

  it('centered 2× zoom keeps the middle half of the image', () => {
    const px = zoomPanToPixels(BOX, IMG, { scale: 2, tx: 0, ty: 0 });
    expect(px).toEqual({ originX: 300, originY: 200, width: 600, height: 400 });
  });

  it('panning the image right at 2× reveals its left edge (originX → 0)', () => {
    // max pan at 2× is +150 display px; that pins the window to the image left
    const px = zoomPanToPixels(BOX, IMG, { scale: 2, tx: 150, ty: 0 });
    expect(px.originX).toBe(0);
    expect(px.width).toBe(600);
  });

  it('panning left at 2× reveals the right edge (origin + width == imgW)', () => {
    const px = zoomPanToPixels(BOX, IMG, { scale: 2, tx: -150, ty: 0 });
    expect(px.originX + px.width).toBe(IMG.w);
  });

  it('over-pan is clamped so the crop never leaves the image', () => {
    const px = zoomPanToPixels(BOX, IMG, { scale: 2, tx: 9999, ty: -9999 });
    expect(px.originX).toBeGreaterThanOrEqual(0);
    expect(px.originY + px.height).toBeLessThanOrEqual(IMG.h);
    expect(px.originX + px.width).toBeLessThanOrEqual(IMG.w);
  });

  it('guards against a zero-size box (no NaN/Infinity)', () => {
    const px = zoomPanToPixels({ w: 0, h: 0 }, IMG, { scale: 2, tx: 10, ty: 10 });
    expect(Number.isFinite(px.originX)).toBe(true);
    expect(Number.isFinite(px.width)).toBe(true);
    expect(px.width).toBeGreaterThanOrEqual(1);
    expect(px.height).toBeGreaterThanOrEqual(1);
    expect(panClamp({ w: 0, h: 0 }, 3)).toEqual({ maxX: 0, maxY: 0 });
  });

  it('always stays within bounds and non-degenerate for arbitrary zooms', () => {
    for (const s of [1, 1.3, 2.7, 4, MAX_ZOOM]) {
      for (const tx of [-500, -40, 0, 40, 500]) {
        const px = zoomPanToPixels(BOX, IMG, { scale: s, tx, ty: tx / 2 });
        expect(px.width).toBeGreaterThanOrEqual(1);
        expect(px.height).toBeGreaterThanOrEqual(1);
        expect(px.originX).toBeGreaterThanOrEqual(0);
        expect(px.originY).toBeGreaterThanOrEqual(0);
        expect(px.originX + px.width).toBeLessThanOrEqual(IMG.w);
        expect(px.originY + px.height).toBeLessThanOrEqual(IMG.h);
      }
    }
  });
});
