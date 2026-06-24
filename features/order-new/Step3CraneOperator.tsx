import { View, type LayoutChangeEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import { DateTimeField } from '../../components/DateTimeField';
import { QualDoc } from '../../components/inspection-parts';
import type { CombinedForm } from './orderFormSchema';
import type { OrderStyles } from './styles';

export function Step3CraneOperator({
  form, setForm, s, attempted, registerField, onPickPhoto, onDeletePhoto,
  positionLabel,
  positionField = 'craneOperatorPosition',
  stepTitle,
}: {
  form: CombinedForm;
  setForm: React.Dispatch<React.SetStateAction<CombinedForm>>;
  s: OrderStyles;
  attempted: boolean;
  registerField: (key: string) => (e: LayoutChangeEvent) => void;
  onPickPhoto: () => void;
  onDeletePhoto: () => void;
  positionLabel?: string;
  positionField?: 'craneOperatorPosition' | 'craneOperatorQualification';
  stepTitle?: string;
}) {
  const { t } = useTranslation();
  const resolvedPositionLabel = positionLabel ?? t('orders.workPosition');
  const resolvedStepTitle = stepTitle ?? t('orders.operatorTitle');
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.stepTitle}>{resolvedStepTitle}</Text>

      <View onLayout={registerField('craneOperatorName')}>
        <FloatingLabelInput
          label={t('orders.fullName')}
          required
          value={form.craneOperatorName}
          onChangeText={v => setForm(f => ({ ...f, craneOperatorName: v }))}
          error={attempted && !form.craneOperatorName.trim() ? t('orders.requiredField') : undefined}
        />
      </View>

      <View onLayout={registerField('craneOperatorPersonalId')}>
        <FloatingLabelInput
          label={t('orders.idNumber11digits')}
          required
          value={form.craneOperatorPersonalId}
          onChangeText={v => setForm(f => ({ ...f, craneOperatorPersonalId: v }))}
          error={attempted && form.craneOperatorPersonalId.trim().length !== 11 ? t('orders.requiredField') : undefined}
          keyboardType="numeric"
          maxLength={11}
        />
      </View>

      <FloatingLabelInput
        label={resolvedPositionLabel}
        value={form[positionField]}
        onChangeText={v => setForm(f => ({ ...f, [positionField]: v }))}
      />

      <View onLayout={registerField('craneOperatorCertNumber')}>
        <FloatingLabelInput
          label={t('orders.certNumberLabel')}
          required
          value={form.craneOperatorCertNumber}
          onChangeText={v => setForm(f => ({ ...f, craneOperatorCertNumber: v }))}
          error={attempted && !form.craneOperatorCertNumber.trim() ? t('orders.requiredField') : undefined}
        />
      </View>

      <DateTimeField
        label={t('orders.certExpiry')}
        value={new Date(form.craneOperatorCertExpiry)}
        onChange={d => setForm(f => ({ ...f, craneOperatorCertExpiry: d.toISOString() }))}
        mode="date"
      />

      <FloatingLabelInput
        label={t('orders.contactPhone')}
        value={form.craneOperatorPhone}
        onChangeText={v => setForm(f => ({ ...f, craneOperatorPhone: v }))}
        keyboardType="phone-pad"
      />

      <Text style={s.sectionLabel}>{t('orders.certPhoto')}</Text>
      <QualDoc
        photoPath={form.craneOperatorCertPhoto}
        onAdd={onPickPhoto}
        onDelete={onDeletePhoto}
        label={t('orders.certPhoto')}
      />
    </View>
  );
}
