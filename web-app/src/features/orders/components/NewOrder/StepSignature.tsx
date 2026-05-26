import { Pencil, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SignatureCanvas from '@/components/SignatureCanvas';
import type { Form } from './types';

interface SignStepProps {
  form: Form;
  signingOpen: boolean;
  setSigningOpen: (v: boolean) => void;
  onSave: (dataUrl: string) => void;
  onClear: () => void;
}

export function StepSignDirector({ form, signingOpen, setSigningOpen, onSave, onClear }: SignStepProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-neutral-800">დირექტორის ხელმოწერა</h2>
      <p className="text-sm text-neutral-500">{form.directorName || 'დირექტორი'}</p>
      {form.directorSignature ? (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <img
            src={`data:image/png;base64,${form.directorSignature}`}
            alt="Director signature"
            className="h-12 rounded border border-neutral-200 bg-white p-1"
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">ხელმოწერა დადებულია</p>
            {form.directorSignedAt && (
              <p className="text-xs text-green-600">{new Date(form.directorSignedAt).toLocaleString('ka-GE')}</p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClear} className="text-neutral-500">
            <RotateCcw size={14} />
          </Button>
        </div>
      ) : signingOpen ? (
        <SignatureCanvas onSave={onSave} onCancel={() => setSigningOpen(false)} />
      ) : (
        <Button variant="outline" onClick={() => setSigningOpen(true)} className="w-full gap-2">
          <Pencil size={16} />
          + ხელმოწერა
        </Button>
      )}
    </div>
  );
}

export function StepSignAppointed({ form, signingOpen, setSigningOpen, onSave, onClear }: SignStepProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-neutral-800">პასუხისმგებელი პირის ხელმოწერა</h2>
      <p className="text-sm text-neutral-500">{form.appointedName || 'დანიშნული პირი'}</p>
      {form.appointedSignature ? (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <img
            src={`data:image/png;base64,${form.appointedSignature}`}
            alt="Appointed signature"
            className="h-12 rounded border border-neutral-200 bg-white p-1"
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">ხელმოწერა დადებულია</p>
            {form.appointedSignedAt && (
              <p className="text-xs text-green-600">{new Date(form.appointedSignedAt).toLocaleString('ka-GE')}</p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClear} className="text-neutral-500">
            <RotateCcw size={14} />
          </Button>
        </div>
      ) : signingOpen ? (
        <SignatureCanvas onSave={onSave} onCancel={() => setSigningOpen(false)} />
      ) : (
        <Button variant="outline" onClick={() => setSigningOpen(true)} className="w-full gap-2">
          <Pencil size={16} />
          + ხელმოწერა
        </Button>
      )}
    </div>
  );
}
