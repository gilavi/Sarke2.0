import { View } from 'react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import type { CombinedForm } from './orderFormSchema';
import type { OrderStyles } from './styles';

export function Step3FireSafetyEnterprise({
  form, setForm, s, attempted,
}: {
  form: CombinedForm;
  setForm: React.Dispatch<React.SetStateAction<CombinedForm>>;
  s: OrderStyles;
  attempted: boolean;
}) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.stepTitle}>დანიშნული პირი</Text>

      <FloatingLabelInput
        label="სახელი, გვარი"
        required
        value={form.appointedName}
        onChangeText={v => setForm(f => ({ ...f, appointedName: v }))}
        error={attempted && !form.appointedName.trim() ? 'სავალდებულო ველი' : undefined}
      />
      <FloatingLabelInput
        label="თანამდებობა"
        required
        value={form.appointedPosition}
        onChangeText={v => setForm(f => ({ ...f, appointedPosition: v }))}
        error={attempted && !form.appointedPosition.trim() ? 'სავალდებულო ველი' : undefined}
      />
      <FloatingLabelInput
        label="პირადი ნომერი"
        required
        value={form.appointedIdNumber}
        onChangeText={v => setForm(f => ({ ...f, appointedIdNumber: v }))}
        error={attempted && !form.appointedIdNumber.trim() ? 'სავალდებულო ველი' : undefined}
        keyboardType="numeric"
        maxLength={11}
      />
      <FloatingLabelInput
        label="ტელეფონის ნომერი"
        required
        value={form.appointedPhone}
        onChangeText={v => setForm(f => ({ ...f, appointedPhone: v }))}
        error={attempted && !form.appointedPhone.trim() ? 'სავალდებულო ველი' : undefined}
        keyboardType="phone-pad"
      />

      <Text style={s.sectionLabel}>ობიექტი</Text>

      <FloatingLabelInput
        label="ობიექტის დასახელება"
        required
        value={form.objectName}
        onChangeText={v => setForm(f => ({ ...f, objectName: v }))}
        error={attempted && !form.objectName.trim() ? 'სავალდებულო ველი' : undefined}
      />
      <FloatingLabelInput
        label="ობიექტის მისამართი"
        value={form.objectAddress}
        onChangeText={v => setForm(f => ({ ...f, objectAddress: v }))}
      />
    </View>
  );
}
