import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import { QualDoc } from '../../components/inspection-parts';
import type { CombinedForm } from './orderFormSchema';
import type { OrderStyles } from './styles';

export function Step4CraneSpecs({
  form, setForm, s, onPickPhoto, onDeletePhoto,
}: {
  form: CombinedForm;
  setForm: React.Dispatch<React.SetStateAction<CombinedForm>>;
  s: OrderStyles;
  onPickPhoto: () => void;
  onDeletePhoto: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.stepTitle}>{t('orders.craneData')}</Text>

      <FloatingLabelInput
        label={t('orders.craneModelType')}
        value={form.craneModel}
        onChangeText={v => setForm(f => ({ ...f, craneModel: v }))}
      />

      <FloatingLabelInput
        label={t('orders.craneNumberLabel')}
        value={form.craneNumber}
        onChangeText={v => setForm(f => ({ ...f, craneNumber: v }))}
      />

      <FloatingLabelInput
        label={t('orders.craneMaxLoadLabel')}
        value={form.craneMaxLoad}
        onChangeText={v => setForm(f => ({ ...f, craneMaxLoad: v }))}
        keyboardType="decimal-pad"
      />

      <Text style={s.sectionLabel}>{t('orders.craneInspCert')}</Text>
      <QualDoc
        photoPath={form.craneInspCertPhoto}
        onAdd={onPickPhoto}
        onDelete={onDeletePhoto}
        label={t('orders.craneInspCertFull')}
      />
    </View>
  );
}
