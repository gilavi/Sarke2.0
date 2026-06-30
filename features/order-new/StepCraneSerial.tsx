import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import { useTheme } from '../../lib/theme';
import type { CombinedForm } from './orderFormSchema';
import type { OrderStyles } from './styles';

/**
 * Dedicated crane identification step — the crane's serial / registration
 * number (ამწის ნომერი) on its own focused screen, matching the inspection
 * identification steps (e.g. SlingsIdentificationStep). Model/load + the
 * inspection photo follow on the crane-specs step.
 */
export function StepCraneSerial({
  form, setForm, s,
}: {
  form: CombinedForm;
  setForm: React.Dispatch<React.SetStateAction<CombinedForm>>;
  s: OrderStyles;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.stepTitle}>{t('orders.craneSerialTitle')}</Text>
      <Text style={{ fontSize: 13, color: theme.colors.inkSoft, lineHeight: 18, marginTop: -4 }}>
        {t('orders.craneSerialHint')}
      </Text>

      <FloatingLabelInput
        label={t('orders.craneNumberLabel')}
        value={form.craneNumber}
        onChangeText={v => setForm(f => ({ ...f, craneNumber: v }))}
      />
    </View>
  );
}
