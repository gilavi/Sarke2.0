/**
 * SignatureCapture — lets the inspector add their signature + extra blank
 * signer rows to a completed act, then generate the PDF with them embedded.
 *
 * Regulatory: the captured signature lives ONLY in this component's state and
 * is handed to the print route via in-memory router state. It is never written
 * to Supabase, storage, or any browser storage (localStorage/sessionStorage).
 * See web-app/REDESIGN_NOTES.md → "Regulatory" + features/signatures/AGENTS.md.
 */
import { useState } from 'react';
import { NumberInput } from '@mantine/core';
import SignatureCanvas from '@/components/SignatureCanvas';
import { Button } from '@/components/ui/button';
import type { SignaturesSectionData } from '@root/lib/inspectionPdfTemplate';

interface Props {
  /** Inspector's name, printed under their signature. */
  creatorName: string;
  /** Called with the in-memory signature session to embed in the PDF. */
  onGenerate: (session: SignaturesSectionData) => void;
}

export default function SignatureCapture({ creatorName, onGenerate }: Props) {
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [rows, setRows] = useState(0);

  function handleGenerate() {
    const creatorSignature = signatureDataUrl
      ? {
          // Strip the "data:image/png;base64," prefix — the template wants bare base64.
          pngBase64: signatureDataUrl.split(',')[1] ?? '',
          capturedAtIso: new Date().toISOString(),
          creatorName,
        }
      : null;
    onGenerate({ creatorSignature, additionalRowsCount: rows });
  }

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
      <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
        ხელმოწერა და PDF
      </h2>
      <p className="mb-4 mt-1 text-xs text-neutral-400">
        ხელმოწერა გამოიყენება მხოლოდ PDF-ის შესაქმნელად და არსად ინახება.
      </p>

      {signatureDataUrl ? (
        <div className="mb-4 flex items-center gap-3">
          <img
            src={signatureDataUrl}
            alt="ხელმოწერა"
            className="h-16 rounded border border-neutral-200 bg-white p-1 dark:border-neutral-600"
          />
          <Button size="sm" variant="outline" onClick={() => setSignatureDataUrl(null)}>
            ხელახლა ხელმოწერა
          </Button>
        </div>
      ) : (
        <div className="mb-4">
          <SignatureCanvas onSave={setSignatureDataUrl} onCancel={() => setSignatureDataUrl(null)} />
        </div>
      )}

      <div className="mb-4 max-w-[240px]">
        <p className="mb-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          დამატებითი ხელმოსაწერი ველები
        </p>
        <NumberInput
          value={rows}
          onChange={(v) => setRows(typeof v === 'number' ? Math.max(0, Math.min(10, v)) : 0)}
          min={0}
          max={10}
        />
      </div>

      <Button onClick={handleGenerate}>ხელმოწერით PDF-ის გენერაცია</Button>
    </section>
  );
}
