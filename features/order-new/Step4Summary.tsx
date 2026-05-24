import { View } from 'react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import type { OrderDocumentType, Project } from '../../types/models';
import { ORDER_DOCUMENT_TYPE_LABEL } from '../../types/models';
import type { CombinedForm } from './orderFormSchema';
import type { OrderStyles } from './styles';

function SummaryRow({ label, value, s }: { label: string; value: string; s: OrderStyles }) {
  return (
    <View style={s.summaryRow}>
      <Text style={s.summaryLabel}>{label}</Text>
      <Text style={s.summaryValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

export function Step4Summary({
  form, docType, project, s,
}: {
  form: CombinedForm;
  docType: OrderDocumentType | null;
  project: Project | null;
  s: OrderStyles;
}) {
  const orderDate = new Date(form.orderDate).toLocaleDateString('ka-GE', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <View style={{ gap: 12 }}>
      <Text style={s.stepTitle}>შეჯამება</Text>

      <View style={s.summaryCard}>
        {docType ? (
          <Text style={[s.summaryLabel, { width: 'auto', marginBottom: 4, fontWeight: '700' }]}>
            {ORDER_DOCUMENT_TYPE_LABEL[docType]}
          </Text>
        ) : null}
        <SummaryRow label="ბრძანება №" value={form.orderNumber || '—'} s={s} />
        <SummaryRow label="ქალაქი" value={form.city || '—'} s={s} />
        <SummaryRow label="თარიღი" value={orderDate} s={s} />
        <SummaryRow label="კომპანია" value={form.companyName || '—'} s={s} />
        {form.identificationCode ? (
          <SummaryRow label="კოდი" value={form.identificationCode} s={s} />
        ) : null}
        {form.legalAddress ? (
          <SummaryRow label="მისამართი" value={form.legalAddress} s={s} />
        ) : null}
        <SummaryRow label="დირექტორი" value={form.directorName || '—'} s={s} />
        <SummaryRow label="ობიექტი" value={form.facilityName || '—'} s={s} />

        {docType === 'labor_safety_specialist' ? (
          <>
            <SummaryRow label="სპეციალისტი" value={form.specialistName || '—'} s={s} />
            <SummaryRow label="პ/ნ" value={form.specialistPersonalId || '—'} s={s} />
            <SummaryRow label="სერტიფიკატი №" value={form.certificateNumber || '—'} s={s} />
          </>
        ) : docType === 'fire_safety_order' ? (
          <>
            <SummaryRow label="დანიშნული პირი" value={form.appointedName || '—'} s={s} />
            <SummaryRow label="ტელეფონი" value={form.appointedPhone || '—'} s={s} />
            <SummaryRow label="ობიექტი" value={form.objectName || '—'} s={s} />
            <SummaryRow label="დირექტორი ✓" value={form.directorSignature ? 'ხელმოწერილია' : '—'} s={s} />
            <SummaryRow label="პასუხისმ. ✓" value={form.appointedSignature ? 'ხელმოწერილია' : '—'} s={s} />
          </>
        ) : docType === 'fire_safety_order_enterprise' ? (
          <>
            <SummaryRow label="დანიშნული პირი" value={form.appointedName || '—'} s={s} />
            <SummaryRow label="თანამდებობა" value={form.appointedPosition || '—'} s={s} />
            <SummaryRow label="პ/ნ" value={form.appointedIdNumber || '—'} s={s} />
            <SummaryRow label="ტელეფონი" value={form.appointedPhone || '—'} s={s} />
            <SummaryRow label="ობიექტი" value={form.objectName || '—'} s={s} />
            <SummaryRow label="დირექტორი ✓" value={form.directorSignature ? 'ხელმოწერილია' : '—'} s={s} />
            <SummaryRow label="პასუხისმ. ✓" value={form.appointedSignature ? 'ხელმოწერილია' : '—'} s={s} />
          </>
        ) : docType === 'crane_operator_order' ? (
          <>
            <SummaryRow label="ოპერატორი" value={form.craneOperatorName || '—'} s={s} />
            <SummaryRow label="პ/ნ" value={form.craneOperatorPersonalId || '—'} s={s} />
            <SummaryRow label="სერტ. №" value={form.craneOperatorCertNumber || '—'} s={s} />
            <SummaryRow label="ამწე" value={form.craneModel || '—'} s={s} />
            {form.craneMaxLoad ? <SummaryRow label="ტვირთი" value={`${form.craneMaxLoad} ტ.`} s={s} /> : null}
            <SummaryRow label="დირექტორი ✓" value={form.directorSignature ? 'ხელმოწერილია' : '—'} s={s} />
            <SummaryRow label="ოპერატორი ✓" value={form.operatorSignature ? 'ხელმოწერილია' : '—'} s={s} />
          </>
        ) : docType === 'crane_technical_order' ? (
          <>
            <SummaryRow label="სპეციალისტი" value={form.craneOperatorName || '—'} s={s} />
            <SummaryRow label="პ/ნ" value={form.craneOperatorPersonalId || '—'} s={s} />
            <SummaryRow label="სერტ. №" value={form.craneOperatorCertNumber || '—'} s={s} />
            <SummaryRow label="ამწე" value={form.craneModel || '—'} s={s} />
            {form.craneMaxLoad ? <SummaryRow label="ტვირთი" value={`${form.craneMaxLoad} ტ.`} s={s} /> : null}
            <SummaryRow label="დირექტორი ✓" value={form.directorSignature ? 'ხელმოწერილია' : '—'} s={s} />
            <SummaryRow label="სპეციალისტი ✓" value={form.operatorSignature ? 'ხელმოწერილია' : '—'} s={s} />
          </>
        ) : (
          <>
            <SummaryRow label="პასუხისმგებელი" value={form.responsiblePersonName || '—'} s={s} />
            <SummaryRow label="თანამდებობა" value={form.responsiblePersonPosition || '—'} s={s} />
            <SummaryRow label="პ/ნ" value={form.responsiblePersonPersonalId || '—'} s={s} />
          </>
        )}

        {project ? (
          <SummaryRow label="პროექტი" value={project.name} s={s} />
        ) : null}
      </View>
    </View>
  );
}
