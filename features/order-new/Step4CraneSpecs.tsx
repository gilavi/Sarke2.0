import { View } from 'react-native';
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
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.stepTitle}>ამწის მონაცემები</Text>

      <FloatingLabelInput
        label="მოდელი / ტიპი"
        value={form.craneModel}
        onChangeText={v => setForm(f => ({ ...f, craneModel: v }))}
      />

      <FloatingLabelInput
        label="ამწის ნომერი"
        value={form.craneNumber}
        onChangeText={v => setForm(f => ({ ...f, craneNumber: v }))}
      />

      <FloatingLabelInput
        label="მაქს. ასაწევი ტვირთი (ტ.)"
        value={form.craneMaxLoad}
        onChangeText={v => setForm(f => ({ ...f, craneMaxLoad: v }))}
        keyboardType="decimal-pad"
      />

      <Text style={s.sectionLabel}>ამწის შემოწმ. სერთიფ.</Text>
      <QualDoc
        photoPath={form.craneInspCertPhoto}
        onAdd={onPickPhoto}
        onDelete={onDeletePhoto}
        label="ამწის შემოწმების სერთიფიკატი"
      />
    </View>
  );
}
