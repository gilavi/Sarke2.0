// Pure types, constants, and SVG-path helpers for PhotoAnnotator.

import { Dimensions } from 'react-native';

export interface PhotoAnnotatorProps {
  sourceUri: string;
  onSave: (annotatedUri: string) => void;
  onCancel: () => void;
}

/* ─────────────────────────── Types ─────────────────────────── */

export type Tool = 'pen' | 'arrow' | 'circle' | 'rect' | 'text';

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

export const WIDTHS = [2, 4, 6, 8, 10, 12];

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
