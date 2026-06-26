/**
 * Unit tests for the pure helpers in `components/photo-annotator/schema.ts`:
 * the SVG path/arrow builders and the move-tool geometry (bounding box,
 * hit-test, translate). These back the draw + move tools, so a regression here
 * silently breaks annotation rendering or drag-to-reposition.
 *
 * (schema.ts imports `Dimensions` from react-native, which vitest aliases to
 * react-native-web — so the module imports cleanly under jsdom.)
 */

import { describe, it, expect } from 'vitest';
import {
  pointsToPathD,
  arrowHead,
  annotationBounds,
  hitTestAnnotation,
  translateAnnotation,
} from '../../components/photo-annotator/schema';
import type { Annotation } from '../../components/photo-annotator/schema';

const pen = (points: { x: number; y: number }[]): Annotation => ({ id: 'p', tool: 'pen', color: '#000', width: 6, points });
const shape = (tool: 'arrow' | 'circle' | 'rect', start: any, end: any): Annotation => ({ id: 's', tool, color: '#000', width: 6, start, end });
const text = (x: number, y: number, t: string): Annotation => ({ id: 't', tool: 'text', color: '#000', width: 0, text: t, x, y });

describe('pointsToPathD', () => {
  it('empty → empty string', () => {
    expect(pointsToPathD([])).toBe('');
  });
  it('single point → a Move only', () => {
    expect(pointsToPathD([{ x: 1, y: 2 }])).toBe('M 1 2');
  });
  it('multiple points → Move then Lines', () => {
    expect(pointsToPathD([{ x: 0, y: 0 }, { x: 3, y: 4 }, { x: 5, y: 6 }])).toBe('M 0 0 L 3 4 L 5 6');
  });
});

describe('arrowHead', () => {
  it('returns the tip plus two symmetric wing points behind it', () => {
    const out = arrowHead({ x: 0, y: 0 }, { x: 10, y: 0 }, 14);
    const tokens = out.split(' ');
    expect(tokens).toHaveLength(3);
    // middle token is the tip
    expect(tokens[1]).toBe('10,0');
    const [x1, y1] = tokens[0].split(',').map(Number);
    const [x2, y2] = tokens[2].split(',').map(Number);
    // both wings sit behind the tip (smaller x) and mirror across the shaft
    expect(x1).toBeLessThan(10);
    expect(x2).toBeLessThan(10);
    expect(x1).toBeCloseTo(x2, 5);
    expect(y1).toBeCloseTo(-y2, 5);
  });
});

describe('annotationBounds', () => {
  it('pen → bbox of all points', () => {
    expect(annotationBounds(pen([{ x: 0, y: 0 }, { x: 10, y: 5 }, { x: 3, y: 20 }]))).toEqual({ minX: 0, minY: 0, maxX: 10, maxY: 20 });
  });
  it('circle → center ± radius (radius = distance start→end)', () => {
    expect(annotationBounds(shape('circle', { x: 50, y: 50 }, { x: 53, y: 54 }))).toEqual({ minX: 45, minY: 45, maxX: 55, maxY: 55 });
  });
  it('rect/arrow → min/max of the two corners regardless of drag direction', () => {
    expect(annotationBounds(shape('rect', { x: 30, y: 40 }, { x: 10, y: 20 }))).toEqual({ minX: 10, minY: 20, maxX: 30, maxY: 40 });
    expect(annotationBounds(shape('arrow', { x: 10, y: 20 }, { x: 30, y: 40 }))).toEqual({ minX: 10, minY: 20, maxX: 30, maxY: 40 });
  });
  it('text → an approximate box from the baseline-left origin', () => {
    const b = annotationBounds(text(5, 20, 'abc'))!;
    expect(b.minX).toBe(5);
    expect(b.maxX).toBeGreaterThan(b.minX);
    expect(b.minY).toBeLessThan(20);
    expect(b.maxY).toBeGreaterThan(20);
  });
  it('malformed annotations → null', () => {
    expect(annotationBounds(pen([]))).toBeNull();
    expect(annotationBounds({ id: 'x', tool: 'circle', color: '#000', width: 1 })).toBeNull();
  });
});

describe('hitTestAnnotation', () => {
  const r = shape('rect', { x: 10, y: 10 }, { x: 30, y: 30 });
  it('true inside the box', () => {
    expect(hitTestAnnotation(r, { x: 20, y: 20 })).toBe(true);
  });
  it('true within the padding margin', () => {
    expect(hitTestAnnotation(r, { x: 2, y: 2 }, 14)).toBe(true);
  });
  it('false well outside', () => {
    expect(hitTestAnnotation(r, { x: 100, y: 100 })).toBe(false);
  });
});

describe('translateAnnotation', () => {
  it('shifts every pen point', () => {
    const out = translateAnnotation(pen([{ x: 1, y: 1 }, { x: 2, y: 3 }]), 5, -2);
    expect(out.points).toEqual([{ x: 6, y: -1 }, { x: 7, y: 1 }]);
  });
  it('shifts a shape start + end', () => {
    const out = translateAnnotation(shape('arrow', { x: 0, y: 0 }, { x: 10, y: 10 }), 4, 4);
    expect(out.start).toEqual({ x: 4, y: 4 });
    expect(out.end).toEqual({ x: 14, y: 14 });
  });
  it('shifts a text origin', () => {
    const out = translateAnnotation(text(5, 5, 'hi'), -3, 7);
    expect(out.x).toBe(2);
    expect(out.y).toBe(12);
  });
  it('leaves a malformed annotation untouched', () => {
    const a: Annotation = { id: 'z', tool: 'pen', color: '#000', width: 6 };
    expect(translateAnnotation(a, 10, 10)).toBe(a);
  });
});
