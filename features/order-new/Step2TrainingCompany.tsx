import { View, type LayoutChangeEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import { DateTimeField } from '../../components/DateTimeField';
import type { CombinedForm } from './orderFormSchema';
import type { OrderStyles } from './styles';

/**
 * Step 2 — training-schedule (doc #7). The plan-schedule body is fixed legal
 * text; only the company name + director (and date) are filled in.
 */
export function Step2TrainingCompany({
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
      <Text style={s.stepTitle}>{t('orders.companyInfoLabel')}</Text>

      <View onLayout={registerField('companyName')}>
        <FloatingLabelInput
          label={t('orders.companyNamePlaceholder')}
          required
          value={form.companyName}
          onChangeText={v => setForm(f => ({ ...f, companyName: v }))}
          error={attempted && !form.companyName.trim() ? t('orders.requiredField') : undefined}
        />
      </View>

      <View onLayout={registerField('directorName')}>
        <FloatingLabelInput
          label={t('orders.directorNameLabel')}
          required
          value={form.directorName}
          onChangeText={v => setForm(f => ({ ...f, directorName: v }))}
          error={attempted && !form.directorName.trim() ? t('orders.requiredField') : undefined}
        />
      </View>

      <DateTimeField
        label={t('orders.orderDateLabel')}
        value={new Date(form.orderDate)}
        onChange={d => setForm(f => ({ ...f, orderDate: d.toISOString() }))}
        mode="date"
      />
    </View>
  );
}
