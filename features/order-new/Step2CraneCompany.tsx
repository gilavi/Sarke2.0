import { View, type LayoutChangeEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import { DateTimeField } from '../../components/DateTimeField';
import type { CombinedForm } from './orderFormSchema';
import type { OrderStyles } from './styles';

export function Step2CraneCompany({
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
      <Text style={s.stepTitle}>{t('orders.companyInfo')}</Text>

      <View onLayout={registerField('orderNumber')}>
        <FloatingLabelInput
          label={t('orders.orderNumber')}
          required
          value={form.orderNumber}
          onChangeText={v => setForm(f => ({ ...f, orderNumber: v }))}
          error={attempted && !form.orderNumber.trim() ? t('errors.requiredField') : undefined}
        />
      </View>

      <DateTimeField
        label={t('orders.orderDate')}
        value={new Date(form.orderDate)}
        onChange={d => setForm(f => ({ ...f, orderDate: d.toISOString() }))}
        mode="date"
      />

      <View onLayout={registerField('companyName')}>
        <FloatingLabelInput
          label={t('orders.companyName')}
          required
          value={form.companyName}
          onChangeText={v => setForm(f => ({ ...f, companyName: v }))}
          error={attempted && !form.companyName.trim() ? t('errors.requiredField') : undefined}
        />
      </View>

      <FloatingLabelInput
        label={t('orders.objectAddress')}
        value={form.objectAddress}
        onChangeText={v => setForm(f => ({ ...f, objectAddress: v }))}
      />

      <View onLayout={registerField('directorName')}>
        <FloatingLabelInput
          label={t('orders.directorName')}
          required
          value={form.directorName}
          onChangeText={v => setForm(f => ({ ...f, directorName: v }))}
          error={attempted && !form.directorName.trim() ? t('errors.requiredField') : undefined}
        />
      </View>
    </View>
  );
}
