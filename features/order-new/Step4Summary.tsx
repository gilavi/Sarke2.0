import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

  const orderDate = new Date(form.orderDate).toLocaleDateString('ka-GE', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <View style={{ gap: 12 }}>
      <Text style={s.stepTitle}>{t('orders.summary')}</Text>

      <View style={s.summaryCard}>
        {docType ? (
          <Text style={[s.summaryLabel, { width: 'auto', marginBottom: 4, fontWeight: '700' }]}>
            {ORDER_DOCUMENT_TYPE_LABEL[docType]}
          </Text>
        ) : null}
        <SummaryRow label={t('orders.orderNumberShort')} value={form.orderNumber || '-'} s={s} />
        <SummaryRow label={t('orders.city')} value={form.city || '-'} s={s} />
        <SummaryRow label={t('common.date')} value={orderDate} s={s} />
        <SummaryRow label={t('common.company')} value={form.companyName || '-'} s={s} />
        {form.identificationCode ? (
          <SummaryRow label={t('orders.code')} value={form.identificationCode} s={s} />
        ) : null}
        {form.legalAddress ? (
          <SummaryRow label={t('common.address')} value={form.legalAddress} s={s} />
        ) : null}
        <SummaryRow label={t('orders.director')} value={form.directorName || '-'} s={s} />
        <SummaryRow label={t('orders.object')} value={form.facilityName || '-'} s={s} />

        {docType === 'labor_safety_specialist' ? (
          <>
            <SummaryRow label={t('orders.specialist')} value={form.specialistName || '-'} s={s} />
            <SummaryRow label={t('orders.objectAddress')} value={form.objectAddress || '-'} s={s} />
            <SummaryRow label={t('orders.activityField')} value={form.activityField || '-'} s={s} />
          </>
        ) : docType === 'training_schedule_order' ? (
          <SummaryRow label={t('orders.director')} value={form.directorName || '-'} s={s} />
        ) : docType === 'fire_safety_order' ? (
          <>
            <SummaryRow label={t('orders.assignedPerson')} value={form.appointedName || '-'} s={s} />
            <SummaryRow label={t('common.phone')} value={form.appointedPhone || '-'} s={s} />
            <SummaryRow label={t('orders.object')} value={form.objectName || '-'} s={s} />
            <SummaryRow label={t('orders.directorSigned')} value={form.directorSignature ? t('orders.signed') : '-'} s={s} />
            <SummaryRow label={t('orders.responsibleSigned')} value={form.appointedSignature ? t('orders.signed') : '-'} s={s} />
          </>
        ) : docType === 'fire_safety_order_enterprise' ? (
          <>
            <SummaryRow label={t('orders.assignedPerson')} value={form.appointedName || '-'} s={s} />
            <SummaryRow label={t('orders.jobTitle')} value={form.appointedPosition || '-'} s={s} />
            <SummaryRow label={t('orders.idNumber')} value={form.appointedIdNumber || '-'} s={s} />
            <SummaryRow label={t('common.phone')} value={form.appointedPhone || '-'} s={s} />
            <SummaryRow label={t('orders.object')} value={form.objectName || '-'} s={s} />
            <SummaryRow label={t('orders.directorSigned')} value={form.directorSignature ? t('orders.signed') : '-'} s={s} />
            <SummaryRow label={t('orders.responsibleSigned')} value={form.appointedSignature ? t('orders.signed') : '-'} s={s} />
          </>
        ) : docType === 'crane_operator_order' ? (
          <>
            <SummaryRow label={t('orders.operator')} value={form.craneOperatorName || '-'} s={s} />
            <SummaryRow label={t('orders.idNumber')} value={form.craneOperatorPersonalId || '-'} s={s} />
            <SummaryRow label={t('orders.certNumberShort')} value={form.craneOperatorCertNumber || '-'} s={s} />
            <SummaryRow label={t('orders.crane')} value={form.craneModel || '-'} s={s} />
            {form.craneMaxLoad ? <SummaryRow label={t('orders.load')} value={`${form.craneMaxLoad} ტ.`} s={s} /> : null}
          </>
        ) : docType === 'crane_technical_order' ? (
          <>
            <SummaryRow label={t('orders.specialist')} value={form.craneOperatorName || '-'} s={s} />
            <SummaryRow label={t('orders.idNumber')} value={form.craneOperatorPersonalId || '-'} s={s} />
            <SummaryRow label={t('orders.certNumberShort')} value={form.craneOperatorCertNumber || '-'} s={s} />
            <SummaryRow label={t('orders.crane')} value={form.craneModel || '-'} s={s} />
            {form.craneMaxLoad ? <SummaryRow label={t('orders.load')} value={`${form.craneMaxLoad} ტ.`} s={s} /> : null}
          </>
        ) : (
          <>
            <SummaryRow label={t('orders.responsible')} value={form.responsiblePersonName || '-'} s={s} />
            <SummaryRow label={t('orders.jobTitle')} value={form.responsiblePersonPosition || '-'} s={s} />
            <SummaryRow label={t('orders.idNumber')} value={form.responsiblePersonPersonalId || '-'} s={s} />
          </>
        )}

        {project ? (
          <SummaryRow label={t('common.project')} value={project.name} s={s} />
        ) : null}
      </View>
    </View>
  );
}
