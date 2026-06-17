import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { CircleCheck, Pencil } from 'lucide-react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { SignatureCanvas } from '../../components/SignatureCanvas';
import type { CombinedForm } from './orderFormSchema';
import type { OrderStyles } from './styles';

export function StepSignaturesFireSafety({
  form, setForm, theme, s,
}: {
  form: CombinedForm;
  setForm: React.Dispatch<React.SetStateAction<CombinedForm>>;
  theme: any;
  s: OrderStyles;
}) {
  const [directorCanvasOpen, setDirectorCanvasOpen] = useState(false);
  const [appointedCanvasOpen, setAppointedCanvasOpen] = useState(false);

  return (
    <View style={{ gap: 20 }}>
      <Text style={s.stepTitle}>ხელმოწერები</Text>

      {/* Director */}
      <View style={{ gap: 8 }}>
        <Text style={s.sectionLabel}>დირექტორი</Text>
        <Text style={[s.summaryLabel, { width: 'auto' }]}>{form.directorName || 'დირექტორი'}</Text>
        {form.directorSignature ? (
          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.colors.borderGreen ?? theme.colors.border,
            alignItems: 'center',
            padding: 12,
            gap: 8,
          }}>
            <CircleCheck size={28} color={theme.colors.semantic.success} strokeWidth={1.5} />
            <Text style={{ fontSize: 13, color: theme.colors.semantic.success, fontWeight: '600' }}>ხელმოწერა დადებულია</Text>
            <Pressable onPress={() => setForm(f => ({ ...f, directorSignature: null, directorSignedAt: null }))}>
              <Text style={{ fontSize: 12, color: theme.colors.inkSoft, textDecorationLine: 'underline' }}>ხელახლა ხელმოწერა</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => setDirectorCanvasOpen(true)}
            style={[s.typeCard, { justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 20 }]}
          >
            <Pencil size={22} color={theme.colors.accent} strokeWidth={1.5} />
            <Text style={[s.typeLabel, { textAlign: 'center', color: theme.colors.accent }]}>+ ხელმოწერა</Text>
          </Pressable>
        )}
        <SignatureCanvas
          visible={directorCanvasOpen}
          personName={form.directorName || 'დირექტორი'}
          onCancel={() => setDirectorCanvasOpen(false)}
          onConfirm={(b64) => {
            setForm(f => ({ ...f, directorSignature: b64, directorSignedAt: new Date().toISOString() }));
            setDirectorCanvasOpen(false);
          }}
        />
      </View>

      {/* Appointed */}
      <View style={{ gap: 8 }}>
        <Text style={s.sectionLabel}>პასუხისმგებელი პირი</Text>
        <Text style={[s.summaryLabel, { width: 'auto' }]}>{form.appointedName || 'დანიშნული პირი'}</Text>
        {form.appointedSignature ? (
          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.colors.borderGreen ?? theme.colors.border,
            alignItems: 'center',
            padding: 12,
            gap: 8,
          }}>
            <CircleCheck size={28} color={theme.colors.semantic.success} strokeWidth={1.5} />
            <Text style={{ fontSize: 13, color: theme.colors.semantic.success, fontWeight: '600' }}>ხელმოწერა დადებულია</Text>
            <Pressable onPress={() => setForm(f => ({ ...f, appointedSignature: null, appointedSignedAt: null }))}>
              <Text style={{ fontSize: 12, color: theme.colors.inkSoft, textDecorationLine: 'underline' }}>ხელახლა ხელმოწერა</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => setAppointedCanvasOpen(true)}
            style={[s.typeCard, { justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 20 }]}
          >
            <Pencil size={22} color={theme.colors.accent} strokeWidth={1.5} />
            <Text style={[s.typeLabel, { textAlign: 'center', color: theme.colors.accent }]}>+ ხელმოწერა</Text>
          </Pressable>
        )}
        <SignatureCanvas
          visible={appointedCanvasOpen}
          personName={form.appointedName || 'დანიშნული პირი'}
          onCancel={() => setAppointedCanvasOpen(false)}
          onConfirm={(b64) => {
            setForm(f => ({ ...f, appointedSignature: b64, appointedSignedAt: new Date().toISOString() }));
            setAppointedCanvasOpen(false);
          }}
        />
      </View>
    </View>
  );
}
