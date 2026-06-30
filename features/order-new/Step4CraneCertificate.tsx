import { View, type LayoutChangeEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import { DateTimeField } from '../../components/DateTimeField';
import { QualDoc } from '../../components/inspection-parts';
import type { CombinedForm } from './orderFormSchema';
import type { OrderStyles } from './styles';

/**
 * Step 4 — operator certificate: number (required), validity date, and the
 * certificate photo. Split out of the operator step so each screen stays
 * focused (see order-new/AGENTS.md).
 */
export function Step4CraneCertificate({
  form, setForm, s, attempted, registerField, onPickPhoto, onDeletePhoto,
}: {
  form: CombinedForm;
  setForm: React.Dispatch<React.SetStateAction<CombinedForm>>;
  s: OrderStyles;
  attempted: boolean;
  registerField: (key: string) => (e: LayoutChangeEvent) => void;
  onPickPhoto: () => void;
  onDeletePhoto: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.stepTitle}>{t('orders.certStepTitle')}</Text>

      <View onLayout={registerField('craneOperatorCertNumber')}>
        <FloatingLabelInput
          label={t('orders.certNumberLabel')}
          required
          value={form.craneOperatorCertNumber}
          onChangeText={v => setForm(f => ({ ...f, craneOperatorCertNumber: v }))}
          error={attempted && !form.craneOperatorCertNumber.trim() ? t('orders.requiredField') : undefined}
        />
      </View>

      <DateTimeField
        label={t('orders.certExpiry')}
        value={new Date(form.craneOperatorCertExpiry)}
        onChange={d => setForm(f => ({ ...f, craneOperatorCertExpiry: d.toISOString() }))}
        mode="date"
      />

      <Text style={s.sectionLabel}>{t('orders.certPhoto')}</Text>
      <QualDoc
        photoPath={form.craneOperatorCertPhoto}
        onAdd={onPickPhoto}
        onDelete={onDeletePhoto}
        label={t('orders.certPhoto')}
      />
    </View>
  );
}
