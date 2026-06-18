import { View } from 'react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import { DateTimeField } from '../../components/DateTimeField';
import type { CombinedForm } from './orderFormSchema';
import type { OrderStyles } from './styles';

export function Step3LaborSafety({
  form, setForm, s, attempted,
}: {
  form: CombinedForm;
  setForm: React.Dispatch<React.SetStateAction<CombinedForm>>;
  s: OrderStyles;
  attempted: boolean;
}) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.stepTitle}>სპეციალისტი</Text>

      <FloatingLabelInput
        label="ობიექტის სახელი და მისამართი"
        required
        value={form.facilityName}
        onChangeText={v => setForm(f => ({ ...f, facilityName: v }))}
        error={attempted && !form.facilityName.trim() ? 'სავალდებულო ველი' : undefined}
        multiline
        numberOfLines={2}
      />

      <FloatingLabelInput
        label="სპეციალისტი (სახელი გვარი)"
        required
        value={form.specialistName}
        onChangeText={v => setForm(f => ({ ...f, specialistName: v }))}
        error={attempted && !form.specialistName.trim() ? 'სავალდებულო ველი' : undefined}
      />

      <FloatingLabelInput
        label="პირადი ნომერი (11 ციფრი)"
        required
        value={form.specialistPersonalId}
        onChangeText={v => setForm(f => ({ ...f, specialistPersonalId: v }))}
        error={attempted && form.specialistPersonalId.trim().length !== 11 ? 'სავალდებულო ველი' : undefined}
        keyboardType="numeric"
        maxLength={11}
      />

      <FloatingLabelInput
        label="სერტიფიკატის ნომერი"
        required
        value={form.certificateNumber}
        onChangeText={v => setForm(f => ({ ...f, certificateNumber: v }))}
        error={attempted && !form.certificateNumber.trim() ? 'სავალდებულო ველი' : undefined}
      />

      <DateTimeField
        label="სერტიფიკატის გაცემის თარიღი"
        value={new Date(form.certificateDate)}
        onChange={d => setForm(f => ({ ...f, certificateDate: d.toISOString() }))}
        mode="date"
      />
    </View>
  );
}
