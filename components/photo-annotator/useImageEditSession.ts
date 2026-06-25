// Owns the mutable image being edited in PhotoAnnotator: the working file URI,
// its pixel dimensions, the on-screen layout box, and the crop/rotate transforms.
// Lifted out of the component so the component stays near its size target and so
// crop math has a single source of truth for dims.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';
import { cropImage, normalizeImage, rotateImage, type PixelRect } from '../../lib/imageEditing';
import { SCREEN } from './schema';

export interface PhotoLayout {
  w: number;
  h: number;
}

// Reserved vertical chrome around the canvas (header + bottom toolbar). The
// toolbar is now a single tools row + Save pill (the color/size panel floats over
// the canvas instead of stacking below), so it reserves less than the old
// two-row layout.
const HEADER_BASE = 56;
const TOOLBAR_APPROX = 172;

export function useImageEditSession(sourceUri: string, insets: EdgeInsets) {
  const [workingUri, setWorkingUri] = useState(sourceUri);
  const [imgW, setImgW] = useState(0);
  const [imgH, setImgH] = useState(0);
  const [busy, setBusy] = useState(false);

  // Normalize once on mount: bake EXIF orientation + materialize a remote URI
  // (e.g. the signed Supabase URL from re-annotate) to a local file, so the
  // crop rect computed against display dims maps to the real pixel grid.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const norm = await normalizeImage(sourceUri);
      if (cancelled) return;
      setWorkingUri(norm.uri);
      if (norm.width && norm.height) {
        setImgW(norm.width);
        setImgH(norm.height);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sourceUri]);

  // Authoritative display dims whenever the working file changes (fast for the
  // now-local file; also confirms the normalize/transform seed).
  useEffect(() => {
    let cancelled = false;
    Image.getSize(
      workingUri,
      (w, h) => {
        if (!cancelled) {
          setImgW(w);
          setImgH(h);
        }
      },
      () => {
        // keep last-known dims; a 4:3 fallback only if we have nothing
        if (!cancelled && !imgW) {
          setImgW(4);
          setImgH(3);
        }
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workingUri]);

  // Contain-fit box: container aspect == image aspect, so display→pixel is one
  // uniform scale (imgW / photoLayout.w) and captureRef preserves true aspect.
  const photoLayout = useMemo<PhotoLayout | null>(() => {
    if (!imgW || !imgH) return null;
    const headerH = HEADER_BASE + insets.top;
    const maxW = SCREEN.width;
    // Reserve the home-indicator inset too — the toolbar now pads it below the
    // Save pill (AnnotatorToolbar), so the canvas must give up that space.
    const maxH = SCREEN.height - headerH - TOOLBAR_APPROX - insets.bottom;
    const aspect = imgW / imgH;
    let w = maxW;
    let h = w / aspect;
    if (h > maxH) {
      h = maxH;
      w = h * aspect;
    }
    return { w, h };
  }, [imgW, imgH, insets.top]);

  const applyRotate = useCallback(
    async (deg: number) => {
      setBusy(true);
      try {
        const r = await rotateImage(workingUri, deg);
        setWorkingUri(r.uri);
        if (r.width && r.height) {
          setImgW(r.width);
          setImgH(r.height);
        }
      } finally {
        setBusy(false);
      }
    },
    [workingUri],
  );

  const applyCrop = useCallback(
    async (rect: PixelRect) => {
      setBusy(true);
      try {
        const r = await cropImage(workingUri, rect);
        setWorkingUri(r.uri);
        if (r.width && r.height) {
          setImgW(r.width);
          setImgH(r.height);
        }
      } finally {
        setBusy(false);
      }
    },
    [workingUri],
  );

  return { workingUri, imgW, imgH, photoLayout, busy, applyCrop, applyRotate };
}
