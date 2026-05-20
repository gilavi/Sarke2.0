/**
 * Shared chrome for print routes. Replaces the ~15-line sticky toolbar +
 * `<style>{A4_PRINT_STYLES}</style>` + `printAfterRender()` block that was
 * copy-pasted into all 8 print pages.
 *
 * Two modes:
 *   - standalone (default): the print route opened in its own tab/window —
 *     shows the toolbar and auto-fires the browser print dialog.
 *   - preview: the route embedded in a detail page's `<iframe srcDoc/?preview>`
 *     overlay — hides the toolbar and does NOT auto-print, because the overlay
 *     supplies its own print button driving `iframe.contentWindow.print()`.
 */
import { useEffect, type ReactNode } from 'react';
import { A4_PRINT_STYLES, printAfterRender } from '@/lib/printable';

interface PrintLayoutProps {
  children: ReactNode;
  /** Embedded preview mode: no toolbar, no auto-print. Default false. */
  preview?: boolean;
  /** Auto-open the print dialog after render (standalone only). Default true. */
  autoPrint?: boolean;
  /** Delay before auto-print, to let data-URL images lay out. Default 500ms. */
  printDelayMs?: number;
}

export function PrintLayout({
  children,
  preview = false,
  autoPrint = true,
  printDelayMs = 500,
}: PrintLayoutProps) {
  useEffect(() => {
    if (!preview && autoPrint) printAfterRender(printDelayMs);
  }, [preview, autoPrint, printDelayMs]);

  return (
    <>
      <style>{A4_PRINT_STYLES}</style>
      {!preview && (
        <div className="print-toolbar no-print">
          <button type="button" onClick={() => window.close()}>
            დახურვა
          </button>
          <button type="button" className="primary" onClick={() => window.print()}>
            ბეჭდვა
          </button>
        </div>
      )}
      <div className="doc">{children}</div>
    </>
  );
}
