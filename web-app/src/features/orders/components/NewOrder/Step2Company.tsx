import { Input } from '@/components/ui/input';
import type { Form } from './types';

export function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-neutral-600">{label}</p>
      {children}
    </div>
  );
}

export function Step2Company({ form, setField }: { form: Form; setField: (k: keyof Form, v: string) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-neutral-800">ბრძანების ინფო</h2>
      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="ბრძანების ნომერი *">
          <Input value={form.orderNumber} onChange={e => setField('orderNumber', e.target.value)} placeholder="მაგ. №01/2025" />
        </FieldRow>
        <FieldRow label="ქალაქი *">
          <Input value={form.city} onChange={e => setField('city', e.target.value)} placeholder="თბილისი" />
        </FieldRow>
      </div>
      <FieldRow label="ბრძანების თარიღი">
        <Input type="date" value={form.orderDate} onChange={e => setField('orderDate', e.target.value)} />
      </FieldRow>
      <h2 className="text-sm font-semibold text-neutral-600 pt-1">კომპანიის ინფო</h2>
      <FieldRow label="კომპანიის დასახელება *">
        <Input value={form.companyName} onChange={e => setField('companyName', e.target.value)} placeholder="შპს / სს ..." />
      </FieldRow>
      <FieldRow label="საიდენტიფიკაციო კოდი">
        <Input value={form.identificationCode} onChange={e => setField('identificationCode', e.target.value)} />
      </FieldRow>
      <FieldRow label="იურიდიული მისამართი">
        <Input value={form.legalAddress} onChange={e => setField('legalAddress', e.target.value)} />
      </FieldRow>
      <FieldRow label="დირექტორი (სახელი, გვარი) *">
        <Input value={form.directorName} onChange={e => setField('directorName', e.target.value)} />
      </FieldRow>
    </div>
  );
}
