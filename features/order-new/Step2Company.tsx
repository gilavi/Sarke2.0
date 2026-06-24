import { View, type LayoutChangeEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import { DateTimeField } from '../../components/DateTimeField';
import type { CombinedForm } from './orderFormSchema';
import type { OrderStyles } from './styles';

export function Step2Company({
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
      <Text style={s.stepTitle}>{t('orders.orderInfo')}</Text>

      <View onLayout={registerField('orderNumber')}>
        <FloatingLabelInput
          label={t('orders.orderNumberPlaceholder')}
          required
          value={form.orderNumber}
          onChangeText={v => setForm(f => ({ ...f, orderNumber: v }))}
          error={attempted && !form.orderNumber.trim() ? t('orders.requiredField') : undefined}
        />
      </View>

      <View onLayout={registerField('city')}>
        <FloatingLabelInput
          label={t('orders.cityLabel')}
          required
          value={form.city}
          onChangeText={v => setForm(f => ({ ...f, city: v }))}
          error={attempted && !form.city.trim() ? t('orders.requiredField') : undefined}
        />
      </View>

      <DateTimeField
        label={t('orders.orderDateLabel')}
        value={new Date(form.orderDate)}
        onChange={d => setForm(f => ({ ...f, orderDate: d.toISOString() }))}
        mode="date"
      />

      <Text style={s.sectionLabel}>{t('orders.companyInfoLabel')}</Text>

      <View onLayout={registerField('companyName')}>
        <FloatingLabelInput
          label={t('orders.companyNamePlaceholder')}
          required
          value={form.companyName}
          onChangeText={v => setForm(f => ({ ...f, companyName: v }))}
          error={attempted && !form.companyName.trim() ? t('orders.requiredField') : undefined}
        />
      </View>

      <FloatingLabelInput
        label={t('orders.identificationCode')}
        value={form.identificationCode}
        onChangeText={v => setForm(f => ({ ...f, identificationCode: v }))}
        keyboardType="numeric"
        maxLength={9}
      />

      <FloatingLabelInput
        label={t('orders.legalAddress')}
        value={form.legalAddress}
        onChangeText={v => setForm(f => ({ ...f, legalAddress: v }))}
      />

      <View onLayout={registerField('directorName')}>
        <FloatingLabelInput
          label={t('orders.directorNameLabel')}
          required
          value={form.directorName}
          onChangeText={v => setForm(f => ({ ...f, directorName: v }))}
          error={attempted && !form.directorName.trim() ? t('orders.requiredField') : undefined}
        />
      </View>
    </View>
  );
}
