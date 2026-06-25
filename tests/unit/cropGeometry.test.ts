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
