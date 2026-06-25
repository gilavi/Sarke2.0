// Crop rectangle overlay for PhotoAnnotator.
//
// Absolutely fills the photo box (== photoLayout), so its touch coordinates are
// already in display space. Owns the live crop rect; reports it up via
// `onRectChange` (the parent keeps the latest in a ref to read on Apply). All the
// geometry lives in the pure cropGeometry helpers so this file is just gestures
// + chrome.

import { useEffect, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import {
  centeredAspectRect,
  enforceAspect,
  moveRect,
  resizeRect,
  type CropRect,
  type Corner,
  type Size,
} from './cropGeometry';

const HANDLE_HIT = 32; // touch radius for grabbing a corner
const HANDLE_SIZE = 22; // visual corner size

interface CropOverlayProps {
  layout: Size; // display size of the photo box
  ratio: number | null; // active aspect lock
  accent: string;
  onRectChange: (rect: CropRect) => void;
}

function hitCorner(rect: CropRect, px: number, py: number): Corner | null {
  const corners: { key: Corner; cx: number; cy: number }[] = [
    { key: 'tl', cx: rect.x, cy: rect.y },
    { key: 'tr', cx: rect.x + rect.w, cy: rect.y },
    { key: 'bl', cx: rect.x, cy: rect.y + rect.h },
    { key: 'br', cx: rect.x + rect.w, cy: rect.y + rect.h },
  ];
  for (const c of corners) {
    if (Math.abs(px - c.cx) <= HANDLE_HIT && Math.abs(py - c.cy) <= HANDLE_HIT) return c.key;
  }
  return null;
}

export function CropOverlay({ layout, ratio, accent, onRectChange }: CropOverlayProps) {
  const [rect, setRect] = useState<CropRect>(() => centeredAspectRect(layout, ratio));

  // Live mirrors so the PanResponder never reads stale state.
  const rectRef = useRef(rect);
  const startRef = useRef(rect);
  const ratioRef = useRef(ratio);
  const layoutRef = useRef(layout);
  const modeRef = useRef<{ type: 'move' } | { type: 'resize'; corner: Corner } | null>(null);

  useEffect(() => {
    rectRef.current = rect;
    onRectChange(rect);
  }, [rect, onRectChange]);

  useEffect(() => {
    ratioRef.current = ratio;
    setRect((r) => enforceAspect(r, layoutRef.current, ratio));
  }, [ratio]);

  // Re-center on a new photo box (e.g. after a rotate swaps the aspect).
  useEffect(() => {
    layoutRef.current = layout;
    setRect(centeredAspectRect(layout, ratioRef.current));
  }, [layout.w, layout.h]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        startRef.current = rectRef.current;
        const corner = hitCorner(rectRef.current, locationX, locationY);
        modeRef.current = corner ? { type: 'resize', corner } : { type: 'move' };
      },
      onPanResponderMove: (_e, g) => {
        const m = modeRef.current;
        if (!m) return;
        const start = startRef.current;
        const bounds = layoutRef.current;
        if (m.type === 'move') {
          setRect(moveRect(start, g.dx, g.dy, bounds));
        } else {
          setRect(resizeRect(start, m.corner, g.dx, g.dy, bounds, ratioRef.current));
        }
      },
      onPanResponderRelease: () => {
        modeRef.current = null;
      },
      onPanResponderTerminate: () => {
        modeRef.current = null;
      },
    }),
  ).current;

  const mask = 'rgba(0,0,0,0.55)';
  const handleStyle = (corners: { top?: boolean; left?: boolean }) => ({
    position: 'absolute' as const,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderColor: accent,
    [corners.top ? 'top' : 'bottom']: -2,
    [corners.left ? 'left' : 'right']: -2,
    [corners.top ? 'borderTopWidth' : 'borderBottomWidth']: 3,
    [corners.left ? 'borderLeftWidth' : 'borderRightWidth']: 3,
  });

  return (
    <View style={StyleSheet.absoluteFill} {...pan.panHandlers}>
      {/* Dim mask — four Views around the crop rect (no touches). */}
      <View pointerEvents="none" style={[styles.maskBase, { backgroundColor: mask, left: 0, right: 0, top: 0, height: rect.y }]} />
      <View pointerEvents="none" style={[styles.maskBase, { backgroundColor: mask, left: 0, right: 0, top: rect.y + rect.h, bottom: 0 }]} />
      <View pointerEvents="none" style={[styles.maskBase, { backgroundColor: mask, left: 0, top: rect.y, width: rect.x, height: rect.h }]} />
      <View pointerEvents="none" style={[styles.maskBase, { backgroundColor: mask, left: rect.x + rect.w, right: 0, top: rect.y, height: rect.h }]} />

      {/* Crop frame + thirds grid + corner handles. */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.w, height: rect.h, borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' }}
      >
        <View style={[styles.grid, { left: rect.w / 3 }]} />
        <View style={[styles.grid, { left: (rect.w * 2) / 3 }]} />
        <View style={[styles.gridH, { top: rect.h / 3 }]} />
        <View style={[styles.gridH, { top: (rect.h * 2) / 3 }]} />
        <View style={handleStyle({ top: true, left: true })} />
        <View style={handleStyle({ top: true, left: false })} />
        <View style={handleStyle({ top: false, left: true })} />
        <View style={handleStyle({ top: false, left: false })} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  maskBase: { position: 'absolute' },
  grid: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.35)' },
  gridH: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.35)' },
});
