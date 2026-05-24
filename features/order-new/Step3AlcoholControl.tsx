import { View } from 'react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import type { CombinedForm } from './orderFormSchema';
import type { OrderStyles } from './styles';

export function Step3AlcoholControl({
  form, setForm, s,
}: {
  form: CombinedForm;
  setForm: React.Dispatch<React.SetStateAction<CombinedForm>>;
  s: OrderStyles;
}) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.stepTitle}>პასუხისმგებელი პირი</Text>

      <FloatingLabelInput
        label="ობიექტის სახელი და მისამართი"
        required
        value={form.facilityName}
        onChangeText={v => setForm(f => ({ ...f, facilityName: v }))}
        multiline
        numberOfLines={2}
      />

      <FloatingLabelInput
        label="სახელი, გვარი"
        required
        value={form.responsiblePersonName}
        onChangeText={v => setForm(f => ({ ...f, responsiblePersonName: v }))}
      />

      <FloatingLabelInput
        label="თანამდებობა"
        required
        value={form.responsiblePersonPosition}
        onChangeText={v => setForm(f => ({ ...f, responsiblePersonPosition: v }))}
      />

      <FloatingLabelInput
        label="პირადი ნომერი (11 ციფრი)"
        required
        value={form.responsiblePersonPersonalId}
        onChangeText={v => setForm(f => ({ ...f, responsiblePersonPersonalId: v }))}
        keyboardType="numeric"
        maxLength={11}
      />
    </View>
  );
}
