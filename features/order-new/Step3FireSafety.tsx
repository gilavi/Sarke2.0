import { View } from 'react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import type { CombinedForm } from './orderFormSchema';
import type { OrderStyles } from './styles';

export function Step3FireSafety({
  form, setForm, s,
}: {
  form: CombinedForm;
  setForm: React.Dispatch<React.SetStateAction<CombinedForm>>;
  s: OrderStyles;
}) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.stepTitle}>დანიშნული პირი</Text>

      <FloatingLabelInput
        label="სახელი, გვარი"
        required
        value={form.appointedName}
        onChangeText={v => setForm(f => ({ ...f, appointedName: v }))}
      />
      <FloatingLabelInput
        label="ტელეფონის ნომერი"
        required
        value={form.appointedPhone}
        onChangeText={v => setForm(f => ({ ...f, appointedPhone: v }))}
        keyboardType="phone-pad"
      />

      <Text style={s.sectionLabel}>ობიექტი</Text>

      <FloatingLabelInput
        label="ობიექტის დასახელება"
        required
        value={form.objectName}
        onChangeText={v => setForm(f => ({ ...f, objectName: v }))}
      />
      <FloatingLabelInput
        label="ობიექტის მისამართი"
        value={form.objectAddress}
        onChangeText={v => setForm(f => ({ ...f, objectAddress: v }))}
      />
    </View>
  );
}
