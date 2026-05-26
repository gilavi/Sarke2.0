import { Input } from '@/components/ui/input';
import { FieldRow } from './Step2Company';
import type { Form } from './types';

export function Step3LaborSafety({ form, setField }: { form: Form; setField: (k: keyof Form, v: string) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-neutral-800">სპეციალისტი</h2>
      <FieldRow label="ობიექტის სახელი და მისამართი *">
        <Input value={form.facilityName} onChange={e => setField('facilityName', e.target.value)} />
      </FieldRow>
      <FieldRow label="სპეციალისტი (სახელი, გვარი) *">
        <Input value={form.specialistName} onChange={e => setField('specialistName', e.target.value)} />
      </FieldRow>
      <FieldRow label="პირადი ნომერი">
        <Input value={form.specialistPersonalId} onChange={e => setField('specialistPersonalId', e.target.value)} maxLength={11} />
      </FieldRow>
      <FieldRow label="სერტიფიკატის ნომერი *">
        <Input value={form.certificateNumber} onChange={e => setField('certificateNumber', e.target.value)} />
      </FieldRow>
      <FieldRow label="სერტიფიკატის გაცემის თარიღი">
        <Input type="date" value={form.certificateDate} onChange={e => setField('certificateDate', e.target.value)} />
      </FieldRow>
    </div>
  );
}

export function Step3AlcoholControl({ form, setField }: { form: Form; setField: (k: keyof Form, v: string) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-neutral-800">პასუხისმგებელი პირი</h2>
      <FieldRow label="ობიექტის სახელი და მისამართი *">
        <Input value={form.facilityName} onChange={e => setField('facilityName', e.target.value)} />
      </FieldRow>
      <FieldRow label="სახელი, გვარი *">
        <Input value={form.responsiblePersonName} onChange={e => setField('responsiblePersonName', e.target.value)} />
      </FieldRow>
      <FieldRow label="თანამდებობა *">
        <Input value={form.responsiblePersonPosition} onChange={e => setField('responsiblePersonPosition', e.target.value)} />
      </FieldRow>
      <FieldRow label="პირადი ნომერი">
        <Input value={form.responsiblePersonPersonalId} onChange={e => setField('responsiblePersonPersonalId', e.target.value)} maxLength={11} />
      </FieldRow>
    </div>
  );
}

export function Step3FireSafety({ form, setField }: { form: Form; setField: (k: keyof Form, v: string) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-neutral-800">დანიშნული პირი</h2>
      <FieldRow label="სახელი, გვარი *">
        <Input value={form.appointedName} onChange={e => setField('appointedName', e.target.value)} />
      </FieldRow>
      <FieldRow label="ტელეფონის ნომერი *">
        <Input type="tel" value={form.appointedPhone} onChange={e => setField('appointedPhone', e.target.value)} />
      </FieldRow>
      <h2 className="text-sm font-semibold text-neutral-600 pt-1">ობიექტი</h2>
      <FieldRow label="ობიექტის დასახელება *">
        <Input value={form.objectName} onChange={e => setField('objectName', e.target.value)} />
      </FieldRow>
      <FieldRow label="ობიექტის მისამართი">
        <Input value={form.objectAddress} onChange={e => setField('objectAddress', e.target.value)} />
      </FieldRow>
    </div>
  );
}

export function Step3FireSafetyEnterprise({ form, setField }: { form: Form; setField: (k: keyof Form, v: string) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-neutral-800">დანიშნული პირი</h2>
      <FieldRow label="სახელი, გვარი *">
        <Input value={form.appointedName} onChange={e => setField('appointedName', e.target.value)} />
      </FieldRow>
      <FieldRow label="თანამდებობა *">
        <Input value={form.appointedPosition} onChange={e => setField('appointedPosition', e.target.value)} />
      </FieldRow>
      <FieldRow label="პირადი ნომერი *">
        <Input value={form.appointedIdNumber} onChange={e => setField('appointedIdNumber', e.target.value)} maxLength={11} />
      </FieldRow>
      <FieldRow label="ტელეფონის ნომერი *">
        <Input type="tel" value={form.appointedPhone} onChange={e => setField('appointedPhone', e.target.value)} />
      </FieldRow>
      <h2 className="text-sm font-semibold text-neutral-600 pt-1">ობიექტი</h2>
      <FieldRow label="ობიექტის დასახელება *">
        <Input value={form.objectName} onChange={e => setField('objectName', e.target.value)} />
      </FieldRow>
      <FieldRow label="ობიექტის მისამართი">
        <Input value={form.objectAddress} onChange={e => setField('objectAddress', e.target.value)} />
      </FieldRow>
    </div>
  );
}
