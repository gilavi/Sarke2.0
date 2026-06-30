import { View, type LayoutChangeEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import type { CombinedForm } from './orderFormSchema';
import type { OrderStyles } from './styles';

/**
 * Step 3 — labor-safety responsible person (doc #6). The source collects the
 * object address, activity field, and responsible-person name only (the
 * position is fixed "შრომის უსაფრთხოების სპეციალისტი"; no ID / certificate).
 */
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

      <View onLayout={registerField('objectAddress')}>
        <FloatingLabelInput
          label={t('orders.objectAddress')}
          required
          value={form.objectAddress}
          onChangeText={v => setForm(f => ({ ...f, objectAddress: v }))}
          error={attempted && !form.objectAddress.trim() ? t('orders.requiredField') : undefined}
        />
      </View>

      <View onLayout={registerField('activityField')}>
        <FloatingLabelInput
          label={t('orders.activityField')}
          required
          value={form.activityField}
          onChangeText={v => setForm(f => ({ ...f, activityField: v }))}
          error={attempted && !form.activityField.trim() ? t('orders.requiredField') : undefined}
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
    </View>
  );
}
