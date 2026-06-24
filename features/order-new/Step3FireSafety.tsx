import { View, type LayoutChangeEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import type { CombinedForm } from './orderFormSchema';
import type { OrderStyles } from './styles';

export function Step3FireSafety({
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
      <Text style={s.stepTitle}>{t('orders.appointedPerson')}</Text>

      <View onLayout={registerField('appointedName')}>
        <FloatingLabelInput
          label={t('orders.fullName')}
          required
          value={form.appointedName}
          onChangeText={v => setForm(f => ({ ...f, appointedName: v }))}
          error={attempted && !form.appointedName.trim() ? t('orders.requiredField') : undefined}
        />
      </View>
      <View onLayout={registerField('appointedPhone')}>
        <FloatingLabelInput
          label={t('orders.phoneNumber')}
          required
          value={form.appointedPhone}
          onChangeText={v => setForm(f => ({ ...f, appointedPhone: v }))}
          error={attempted && !form.appointedPhone.trim() ? t('orders.requiredField') : undefined}
          keyboardType="phone-pad"
        />
      </View>

      <Text style={s.sectionLabel}>{t('orders.objectSection')}</Text>

      <View onLayout={registerField('objectName')}>
        <FloatingLabelInput
          label={t('orders.objectNameLabel')}
          required
          value={form.objectName}
          onChangeText={v => setForm(f => ({ ...f, objectName: v }))}
          error={attempted && !form.objectName.trim() ? t('orders.requiredField') : undefined}
        />
      </View>
      <FloatingLabelInput
        label={t('orders.objectAddressLabel')}
        value={form.objectAddress}
        onChangeText={v => setForm(f => ({ ...f, objectAddress: v }))}
      />
    </View>
  );
}
