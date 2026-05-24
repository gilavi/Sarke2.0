import { View } from 'react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import { DateTimeField } from '../../components/DateTimeField';
import type { CombinedForm } from './orderFormSchema';
import type { OrderStyles } from './styles';

export function Step2CraneCompany({
  form, setForm, s,
}: {
  form: CombinedForm;
  setForm: React.Dispatch<React.SetStateAction<CombinedForm>>;
  s: OrderStyles;
}) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.stepTitle}>კომპანიის ინფო</Text>

      <FloatingLabelInput
        label="ბრძანების ნომერი"
        required
        value={form.orderNumber}
        onChangeText={v => setForm(f => ({ ...f, orderNumber: v }))}
      />

      <DateTimeField
        label="ბრძანების თარიღი"
        value={new Date(form.orderDate)}
        onChange={d => setForm(f => ({ ...f, orderDate: d.toISOString() }))}
        mode="date"
      />

      <FloatingLabelInput
        label="კომპანიის დასახელება"
        required
        value={form.companyName}
        onChangeText={v => setForm(f => ({ ...f, companyName: v }))}
      />

      <FloatingLabelInput
        label="ობიექტის მისამართი"
        value={form.objectAddress}
        onChangeText={v => setForm(f => ({ ...f, objectAddress: v }))}
      />

      <FloatingLabelInput
        label="დირექტორი (სახელი გვარი)"
        required
        value={form.directorName}
        onChangeText={v => setForm(f => ({ ...f, directorName: v }))}
      />
    </View>
  );
}
