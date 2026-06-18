import { View } from 'react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import { DateTimeField } from '../../components/DateTimeField';
import type { CombinedForm } from './orderFormSchema';
import type { OrderStyles } from './styles';

export function Step2Company({
  form, setForm, s, attempted,
}: {
  form: CombinedForm;
  setForm: React.Dispatch<React.SetStateAction<CombinedForm>>;
  s: OrderStyles;
  attempted: boolean;
}) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.stepTitle}>ბრძანების ინფო</Text>

      <FloatingLabelInput
        label="ბრძანების ნომერი (მაგ. 05/2024)"
        required
        value={form.orderNumber}
        onChangeText={v => setForm(f => ({ ...f, orderNumber: v }))}
        error={attempted && !form.orderNumber.trim() ? 'სავალდებულო ველი' : undefined}
      />

      <FloatingLabelInput
        label="ქალაქი"
        required
        value={form.city}
        onChangeText={v => setForm(f => ({ ...f, city: v }))}
        error={attempted && !form.city.trim() ? 'სავალდებულო ველი' : undefined}
      />

      <DateTimeField
        label="ბრძანების თარიღი"
        value={new Date(form.orderDate)}
        onChange={d => setForm(f => ({ ...f, orderDate: d.toISOString() }))}
        mode="date"
      />

      <Text style={s.sectionLabel}>კომპანიის ინფო</Text>

      <FloatingLabelInput
        label="კომპანიის დასახელება (შპს / სს ...)"
        required
        value={form.companyName}
        onChangeText={v => setForm(f => ({ ...f, companyName: v }))}
        error={attempted && !form.companyName.trim() ? 'სავალდებულო ველი' : undefined}
      />

      <FloatingLabelInput
        label="საიდენტიფიკაციო კოდი"
        value={form.identificationCode}
        onChangeText={v => setForm(f => ({ ...f, identificationCode: v }))}
        keyboardType="numeric"
        maxLength={9}
      />

      <FloatingLabelInput
        label="იურიდიული მისამართი"
        value={form.legalAddress}
        onChangeText={v => setForm(f => ({ ...f, legalAddress: v }))}
      />

      <FloatingLabelInput
        label="დირექტორი (სახელი გვარი)"
        required
        value={form.directorName}
        onChangeText={v => setForm(f => ({ ...f, directorName: v }))}
        error={attempted && !form.directorName.trim() ? 'სავალდებულო ველი' : undefined}
      />
    </View>
  );
}
