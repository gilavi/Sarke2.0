import { View, type LayoutChangeEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import type { CombinedForm } from './orderFormSchema';
import type { OrderStyles } from './styles';

/**
 * Step 3 — scaffolding-supervision responsible person (name, position, phone).
 * No ID/certificate fields (the source order only collects these three).
 */
export function Step3Scaffold({
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
      <Text style={s.stepTitle}>{t('orders.scaffoldSupervisorTitle')}</Text>

      <View onLayout={registerField('appointedName')}>
        <FloatingLabelInput
          label={t('orders.fullName')}
          required
          value={form.appointedName}
          onChangeText={v => setForm(f => ({ ...f, appointedName: v }))}
          error={attempted && !form.appointedName.trim() ? t('orders.requiredField') : undefined}
        />
      </View>

      <FloatingLabelInput
        label={t('orders.jobTitle')}
        value={form.appointedPosition}
        onChangeText={v => setForm(f => ({ ...f, appointedPosition: v }))}
      />

      <FloatingLabelInput
        label={t('orders.contactPhone')}
        value={form.appointedPhone}
        onChangeText={v => setForm(f => ({ ...f, appointedPhone: v }))}
        keyboardType="phone-pad"
      />
    </View>
  );
}
