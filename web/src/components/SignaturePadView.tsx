import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import SignaturePad from 'signature_pad';

export interface SignaturePadHandle {
  isEmpty: () => boolean;
  clear: () => void;
  /** PNG Blob at canvas resolution. */
  toPngBlob: () => Promise<Blob | null>;
}

/**
 * Wraps `signature_pad` so the canvas resizes correctly on devicePixelRatio
 * and orientation changes, and exposes the minimum API the page needs.
 */
export const SignaturePadView = forwardRef<SignaturePadHandle>(function SignaturePadView(_, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      // Snapshot before resize because resizing clears the canvas.
      const data = padRef.current?.toData();
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      const ctx = canvas.getContext('2d');
      ctx?.scale(ratio, ratio);
      if (padRef.current) {
        padRef.current.clear();
        if (data) padRef.current.fromData(data);
      }
    };

    padRef.current = new SignaturePad(canvas, {
      backgroundColor: 'rgba(0,0,0,0)',
      penColor: '#1A1A1A',
      minWidth: 0.6,
      maxWidth: 2.4,
    });
    resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      padRef.current?.off();
      padRef.current = null;
    };
  }, []);

  useImperativeHandle(ref, () => ({
    isEmpty: () => padRef.current?.isEmpty() ?? true,
    clear: () => padRef.current?.clear(),
    toPngBlob: async () => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      return new Promise<Blob | null>(resolve => {
        canvas.toBlob(b => resolve(b), 'image/png');
      });
    },
  }));

  const clearCanvas = () => padRef.current?.clear();

  return (
    <div className="canvas-wrap">
      <canvas ref={canvasRef} aria-label="ხელის მოწერის ველი" />
      <button type="button" className="canvas-clear" onClick={clearCanvas}>
        გასუფთავება
      </button>
    </div>
  );
});
