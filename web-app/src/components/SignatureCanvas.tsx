/**
 * SignatureCanvas — finger/mouse draw pad for inspector signatures.
 *
 * Props:
 *   onSave(dataUrl)  Called with a PNG data-URL when the user clicks "შენახვა".
 *   onCancel         Called when the user clicks "გაუქმება".
 *   existing         Optional existing data-URL to show before the user draws.
 */
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
  existing?: string | null;
}

export default function SignatureCanvas({ onSave, onCancel, existing }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasStroke, setHasStroke] = useState(false);

  // If an existing signature is passed in, render it initially
  useEffect(() => {
    if (!existing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
      ctx.drawImage(img, 0, 0, canvasRef.current!.width, canvasRef.current!.height);
      setHasStroke(true);
    };
    img.src = existing;
  }, [existing]);

  function getPos(e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const t = e.touches[0];
      return {
        x: (t.clientX - rect.left) * scaleX,
        y: (t.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const pos = getPos(e);
    if (!pos || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setDrawing(true);
    setHasStroke(true);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    if (!drawing) return;
    const pos = getPos(e);
    if (!pos || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111827';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function endDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    setDrawing(false);
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasStroke(false);
  }

  function save() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  }

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-lg border border-neutral-300 bg-white">
        <canvas
          ref={canvasRef}
          width={600}
          height={150}
          className="w-full touch-none cursor-crosshair"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {!hasStroke && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-neutral-300">
            ხელმოწერა აქ
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={!hasStroke}>
          შენახვა
        </Button>
        <Button size="sm" variant="outline" onClick={clear} disabled={!hasStroke}>
          გასუფთავება
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          გაუქმება
        </Button>
      </div>
    </div>
  );
}
