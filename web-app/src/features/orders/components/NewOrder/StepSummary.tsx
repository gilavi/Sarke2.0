import { Button } from '@/components/ui/button';
import type { OrderDocumentType } from '@/lib/data/orders';
import type { Form } from './types';

export default function StepSummary({
  form,
  docType,
  onSaveDraft,
  isPending,
}: {
  form: Form;
  docType: OrderDocumentType | null;
  onSaveDraft: () => void;
  isPending: boolean;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-neutral-800">შეჯამება</h2>
      <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
        {[
          ['ბრძანება №', form.orderNumber],
          ['ქალაქი', form.city],
          ['თარიღი', form.orderDate],
          ['კომპანია', form.companyName],
          ['დირექტორი', form.directorName],
          ...(docType === 'fire_safety_order' ? [
            ['დანიშნული პირი', form.appointedName],
            ['ტელეფონი', form.appointedPhone],
            ['ობიექტი', form.objectName],
            ['დირექტ. ხელმოწ.', form.directorSignature ? '✓ ხელმოწერილია' : '-'],
            ['პასუხისმ. ხელმოწ.', form.appointedSignature ? '✓ ხელმოწერილია' : '-'],
          ] : docType === 'fire_safety_order_enterprise' ? [
            ['დანიშნული პირი', form.appointedName],
            ['თანამდებობა', form.appointedPosition],
            ['პ/ნ', form.appointedIdNumber],
            ['ტელეფონი', form.appointedPhone],
            ['ობიექტი', form.objectName],
            ['დირექტ. ხელმოწ.', form.directorSignature ? '✓ ხელმოწერილია' : '-'],
            ['პასუხისმ. ხელმოწ.', form.appointedSignature ? '✓ ხელმოწერილია' : '-'],
          ] : docType === 'labor_safety_specialist' ? [
            ['სპეციალისტი', form.specialistName],
            ['ობიექტი', form.facilityName],
          ] : [
            ['პასუხისმგებელი', form.responsiblePersonName],
            ['ობიექტი', form.facilityName],
          ]),
        ].map(([label, value]) => (
          <div key={label} className="flex items-center gap-3 px-4 py-2 text-sm">
            <span className="w-36 shrink-0 text-neutral-500">{label}</span>
            <span className="font-medium text-neutral-900 dark:text-neutral-100">{value || '-'}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-neutral-500">
        „PDF გენერირება" - ბრძანება შეინახება და გაიხსნება ახალ ჩანართში ბეჭდვისთვის.
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={onSaveDraft}
        disabled={isPending}
        className="w-full"
      >
        შენახვა (PDF-ის გარეშე)
      </Button>
    </div>
  );
}
