// Pure types, constants, and SVG-path helpers for PhotoAnnotator.

import { Dimensions } from 'react-native';

export interface PhotoAnnotatorProps {
  sourceUri: string;
  onSave: (annotatedUri: string) => void;
  onCancel: () => void;
}

/* ─────────────────────────── Types ─────────────────────────── */

export type Tool = 'move' | 'pen' | 'arrow' | 'circle' | 'rect' | 'text';

/** Tools that draw a colored stroke — they reveal both the color + size pickers. */
export const STROKE_TOOLS: Tool[] = ['pen', 'arrow', 'circle', 'rect'];
/** Tools that use color (stroke tools + text). Text width is fixed → no size picker. */
export const COLOR_TOOLS: Tool[] = [...STROKE_TOOLS, 'text'];

export interface Point { x: number; y: number }

export interface Annotation {
  id: string;
  tool: Tool;
  color: string;
  width: number;
  // Pen: array of points
  points?: Point[];
  // Arrow / circle / rect
  start?: Point;
  end?: Point;
  // Text
  text?: string;
  x?: number;
  y?: number;
}

/* ─────────────────────────── Constants ─────────────────────────── */

export const COLORS = [
  { label: 'red', value: '#EF4444' },
  { label: 'yellow', value: '#F59E0B' },
  { label: 'green', value: '#10B981' },
  { label: 'black', value: '#1A1A1A' },
  { label: 'white', value: '#FFFFFF' },
];

/**
 * Discrete stroke widths surfaced by the floating size picker (thin / medium /
 * thick). Replaces the old drag slider — three taps instead of a gesture that
 * re-measured its track and made the thumb jump. The stored brush width is always
 * one of these, so the active preset highlights exactly. Single source of truth
 * for stroke widths (the old `WIDTHS` list was removed with the slider).
 */
export const SIZE_PRESETS = [3, 6, 10] as const;

export const SCREEN = Dimensions.get('window');

/* ─────────────────────────── Helpers ─────────────────────────── */

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function pointsToPathD(points: Point[]): string {
  if (points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

export function arrowHead(start: Point, end: Point, size = 14): string {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const angle = Math.atan2(dy, dx);
  const x1 = end.x - size * Math.cos(angle - Math.PI / 6);
  const y1 = end.y - size * Math.sin(angle - Math.PI / 6);
  const x2 = end.x - size * Math.cos(angle + Math.PI / 6);
  const y2 = end.y - size * Math.sin(angle + Math.PI / 6);
  return `${x1},${y1} ${end.x},${end.y} ${x2},${y2}`;
}

/* ─────────────────── Move-tool geometry helpers ─────────────────── */

export interface Bounds { minX: number; minY: number; maxX: number; maxY: number }

/**
 * Axis-aligned bounding box of an annotation in canvas coordinates, or null
 * for a malformed/empty one. Used by the move tool to hit-test taps and to
 * draw the selection outline.
 */
export function annotationBounds(a: Annotation): Bounds | null {
  if (a.tool === 'pen' && a.points && a.points.length > 0) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of a.points) {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    }
    return { minX, minY, maxX, maxY };
  }
  if (a.tool === 'circle' && a.start && a.end) {
    const r = Math.hypot(a.end.x - a.start.x, a.end.y - a.start.y);
    return { minX: a.start.x - r, minY: a.start.y - r, maxX: a.start.x + r, maxY: a.start.y + r };
  }
  if ((a.tool === 'arrow' || a.tool === 'rect') && a.start && a.end) {
    return {
      minX: Math.min(a.start.x, a.end.x),
      minY: Math.min(a.start.y, a.end.y),
      maxX: Math.max(a.start.x, a.end.x),
      maxY: Math.max(a.start.y, a.end.y),
    };
  }
  if (a.tool === 'text' && a.x !== undefined && a.y !== undefined) {
    // Text is drawn from the baseline-left at (x, y); approximate its box.
    const w = Math.max(24, (a.text?.length ?? 0) * 9);
    return { minX: a.x, minY: a.y - 18, maxX: a.x + w, maxY: a.y + 6 };
  }
  return null;
}

/** True if `p` falls within an annotation's bounding box, padded by `pad`. */
export function hitTestAnnotation(a: Annotation, p: Point, pad = 14): boolean {
  const b = annotationBounds(a);
  if (!b) return false;
  return p.x >= b.minX - pad && p.x <= b.maxX + pad && p.y >= b.minY - pad && p.y <= b.maxY + pad;
}

/** Returns a copy of the annotation shifted by (dx, dy). */
export function translateAnnotation(a: Annotation, dx: number, dy: number): Annotation {
  if (a.tool === 'pen' && a.points) {
    return { ...a, points: a.points.map(p => ({ x: p.x + dx, y: p.y + dy })) };
  }
  if (a.start && a.end) {
    return {
      ...a,
      start: { x: a.start.x + dx, y: a.start.y + dy },
      end: { x: a.end.x + dx, y: a.end.y + dy },
    };
  }
  if (a.x !== undefined && a.y !== undefined) {
    return { ...a, x: a.x + dx, y: a.y + dy };
  }
  return a;
}
