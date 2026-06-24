import { View, type LayoutChangeEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import type { CombinedForm } from './orderFormSchema';
import type { OrderStyles } from './styles';

export function Step3AlcoholControl({
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
      <Text style={s.stepTitle}>{t('orders.responsiblePerson')}</Text>

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

      <View onLayout={registerField('responsiblePersonName')}>
        <FloatingLabelInput
          label={t('orders.fullName')}
          required
          value={form.responsiblePersonName}
          onChangeText={v => setForm(f => ({ ...f, responsiblePersonName: v }))}
          error={attempted && !form.responsiblePersonName.trim() ? t('orders.requiredField') : undefined}
        />
      </View>

      <View onLayout={registerField('responsiblePersonPosition')}>
        <FloatingLabelInput
          label={t('orders.position')}
          required
          value={form.responsiblePersonPosition}
          onChangeText={v => setForm(f => ({ ...f, responsiblePersonPosition: v }))}
          error={attempted && !form.responsiblePersonPosition.trim() ? t('orders.requiredField') : undefined}
        />
      </View>

      <View onLayout={registerField('responsiblePersonPersonalId')}>
        <FloatingLabelInput
          label={t('orders.personalId11digits')}
          required
          value={form.responsiblePersonPersonalId}
          onChangeText={v => setForm(f => ({ ...f, responsiblePersonPersonalId: v }))}
          error={attempted && form.responsiblePersonPersonalId.trim().length !== 11 ? t('orders.requiredField') : undefined}
          keyboardType="numeric"
          maxLength={11}
        />
      </View>
    </View>
  );
}
