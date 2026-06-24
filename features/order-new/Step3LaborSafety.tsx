import { View, type LayoutChangeEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import { DateTimeField } from '../../components/DateTimeField';
import type { CombinedForm } from './orderFormSchema';
import type { OrderStyles } from './styles';

export function Step3LaborSafety({
  form, setForm, s, attempted, registerField,
}: {
  form: CombinedForm;
  setForm: React.Dispatch<React.SetStateAction<CombinedForm>>;
  s: OrderStyles;
  attempted: boolean;
  registerField: (key: string) => (e: LayoutChangeEvent) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.stepTitle}>{t('orders.specialistTitle')}</Text>

      <View onLayout={registerField('facilityName')}>
        <FloatingLabelInput
          label={t('orders.facilityNameAndAddress')}
          required
          value={form.facilityName}
          onChangeText={v => setForm(f => ({ ...f, facilityName: v }))}
          error={attempted && !form.facilityName.trim() ? t('orders.requiredField') : undefined}
          multiline
          numberOfLines={2}
        />
      </View>

      <View onLayout={registerField('specialistName')}>
        <FloatingLabelInput
          label={t('orders.specialistFullName')}
          required
          value={form.specialistName}
          onChangeText={v => setForm(f => ({ ...f, specialistName: v }))}
          error={attempted && !form.specialistName.trim() ? t('orders.requiredField') : undefined}
        />
      </View>

      <View onLayout={registerField('specialistPersonalId')}>
        <FloatingLabelInput
          label={t('orders.personalId11digits')}
          required
          value={form.specialistPersonalId}
          onChangeText={v => setForm(f => ({ ...f, specialistPersonalId: v }))}
          error={attempted && form.specialistPersonalId.trim().length !== 11 ? t('orders.requiredField') : undefined}
          keyboardType="numeric"
          maxLength={11}
        />
      </View>

      <View onLayout={registerField('certificateNumber')}>
        <FloatingLabelInput
          label={t('orders.certNumberLabel')}
          required
          value={form.certificateNumber}
          onChangeText={v => setForm(f => ({ ...f, certificateNumber: v }))}
          error={attempted && !form.certificateNumber.trim() ? t('orders.requiredField') : undefined}
        />
      </View>

      <DateTimeField
        label={t('orders.certIssueDate')}
        value={new Date(form.certificateDate)}
        onChange={d => setForm(f => ({ ...f, certificateDate: d.toISOString() }))}
        mode="date"
      />
    </View>
  );
}
