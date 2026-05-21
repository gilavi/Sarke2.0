/**
 * Full-screen PDF preview overlay: an iframe pointed at the entity's print
 * route (`?preview=1`) with a close button and a print button that drives the
 * iframe's own print dialog. Identical across all four equipment detail pages.
 */
import { useRef } from 'react';

interface InspectionPdfOverlayProps {
  /** Hash route of the print view, e.g. `#/bobcat/<id>/print?preview=1`. */
  src: string;
  onClose: () => void;
}

export function InspectionPdfOverlay({ src, onClose }: InspectionPdfOverlayProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60">
      <div className="flex items-center justify-between bg-white px-4 py-2 shadow">
        <button
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
          onClick={onClose}
        >
          ✕ დახურვა
        </button>
        <button
          className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          onClick={() => iframeRef.current?.contentWindow?.print()}
        >
          ბეჭდვა
        </button>
      </div>
      <iframe
        ref={iframeRef}
        src={src}
        className="flex-1 w-full border-0 bg-white"
        title="PDF გადახედვა"
      />
    </div>
  );
}
