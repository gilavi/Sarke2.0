import { View } from 'react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import { DateTimeField } from '../../components/DateTimeField';
import { QualDoc } from '../../components/inspection-parts';
import type { CombinedForm } from './orderFormSchema';
import type { OrderStyles } from './styles';

export function Step3CraneOperator({
  form, setForm, s, attempted, onPickPhoto, onDeletePhoto,
  positionLabel = 'სამუშაო პოზიცია',
  positionField = 'craneOperatorPosition',
  stepTitle = 'ოპერატორი',
}: {
  form: CombinedForm;
  setForm: React.Dispatch<React.SetStateAction<CombinedForm>>;
  s: OrderStyles;
  attempted: boolean;
  onPickPhoto: () => void;
  onDeletePhoto: () => void;
  positionLabel?: string;
  positionField?: 'craneOperatorPosition' | 'craneOperatorQualification';
  stepTitle?: string;
}) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.stepTitle}>{stepTitle}</Text>

      <FloatingLabelInput
        label="სახელი, გვარი"
        required
        value={form.craneOperatorName}
        onChangeText={v => setForm(f => ({ ...f, craneOperatorName: v }))}
        error={attempted && !form.craneOperatorName.trim() ? 'სავალდებულო ველი' : undefined}
      />

      <FloatingLabelInput
        label="პირადობის ნომერი (11 ციფრი)"
        required
        value={form.craneOperatorPersonalId}
        onChangeText={v => setForm(f => ({ ...f, craneOperatorPersonalId: v }))}
        error={attempted && form.craneOperatorPersonalId.trim().length !== 11 ? 'სავალდებულო ველი' : undefined}
        keyboardType="numeric"
        maxLength={11}
      />

      <FloatingLabelInput
        label={positionLabel}
        value={form[positionField]}
        onChangeText={v => setForm(f => ({ ...f, [positionField]: v }))}
      />

      <FloatingLabelInput
        label="სერტიფიკატის ნომერი"
        required
        value={form.craneOperatorCertNumber}
        onChangeText={v => setForm(f => ({ ...f, craneOperatorCertNumber: v }))}
        error={attempted && !form.craneOperatorCertNumber.trim() ? 'სავალდებულო ველი' : undefined}
      />

      <DateTimeField
        label="სერტ. მოქმედების ვადა"
        value={new Date(form.craneOperatorCertExpiry)}
        onChange={d => setForm(f => ({ ...f, craneOperatorCertExpiry: d.toISOString() }))}
        mode="date"
      />

      <FloatingLabelInput
        label="საკ. ტელეფონი"
        value={form.craneOperatorPhone}
        onChangeText={v => setForm(f => ({ ...f, craneOperatorPhone: v }))}
        keyboardType="phone-pad"
      />

      <Text style={s.sectionLabel}>სერტიფიკატის ფოტო</Text>
      <QualDoc
        photoPath={form.craneOperatorCertPhoto}
        onAdd={onPickPhoto}
        onDelete={onDeletePhoto}
        label="სერტიფიკატის ფოტო"
      />
    </View>
  );
}
