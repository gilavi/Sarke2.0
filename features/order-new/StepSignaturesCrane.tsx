import { useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import { CircleCheck, Pencil } from 'lucide-react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { SignatureCanvas } from '../../components/SignatureCanvas';
import type { OrderDocumentType } from '../../types/models';
import type { CombinedForm } from './orderFormSchema';
import type { OrderStyles } from './styles';

export function StepSignaturesCrane({
  form, setForm, theme, s, docType, attempted, registerField,
}: {
  form: CombinedForm;
  setForm: React.Dispatch<React.SetStateAction<CombinedForm>>;
  theme: any;
  s: OrderStyles;
  docType: OrderDocumentType | null;
  attempted: boolean;
  registerField: (key: string) => (e: LayoutChangeEvent) => void;
}) {
  const [directorCanvasOpen, setDirectorCanvasOpen] = useState(false);
  const [operatorCanvasOpen, setOperatorCanvasOpen] = useState(false);

  const isTechnical = docType === 'crane_technical_order';
  const operatorLabel = isTechnical ? 'ტექ. პასუხისმგებელი' : 'ამწის ოპერატორი';

  return (
    <View style={{ gap: 20 }}>
      <Text style={s.stepTitle}>ხელმოწერები</Text>

      {/* Director */}
      <View style={{ gap: 8 }} onLayout={registerField('directorSignature')}>
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
            style={[
              s.typeCard,
              { justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 20 },
              attempted && !form.directorSignature && { borderColor: theme.colors.danger },
            ]}
          >
            <Pencil size={22} color={theme.colors.accent} strokeWidth={1.5} />
            <Text style={[s.typeLabel, { textAlign: 'center', color: theme.colors.accent }]}>+ ხელმოწერა</Text>
          </Pressable>
        )}
        {attempted && !form.directorSignature && (
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.danger }}>
            ხელმოწერა სავალდებულოა
          </Text>
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

      {/* Operator / Specialist */}
      <View style={{ gap: 8 }} onLayout={registerField('operatorSignature')}>
        <Text style={s.sectionLabel}>{operatorLabel}</Text>
        <Text style={[s.summaryLabel, { width: 'auto' }]}>{form.craneOperatorName || operatorLabel}</Text>
        {form.operatorSignature ? (
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
            <Pressable onPress={() => setForm(f => ({ ...f, operatorSignature: null, operatorSignedAt: null }))}>
              <Text style={{ fontSize: 12, color: theme.colors.inkSoft, textDecorationLine: 'underline' }}>ხელახლა ხელმოწერა</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => setOperatorCanvasOpen(true)}
            style={[
              s.typeCard,
              { justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 20 },
              attempted && !form.operatorSignature && { borderColor: theme.colors.danger },
            ]}
          >
            <Pencil size={22} color={theme.colors.accent} strokeWidth={1.5} />
            <Text style={[s.typeLabel, { textAlign: 'center', color: theme.colors.accent }]}>+ ხელმოწერა</Text>
          </Pressable>
        )}
        {attempted && !form.operatorSignature && (
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.danger }}>
            ხელმოწერა სავალდებულოა
          </Text>
        )}
        <SignatureCanvas
          visible={operatorCanvasOpen}
          personName={form.craneOperatorName || operatorLabel}
          onCancel={() => setOperatorCanvasOpen(false)}
          onConfirm={(b64) => {
            setForm(f => ({ ...f, operatorSignature: b64, operatorSignedAt: new Date().toISOString() }));
            setOperatorCanvasOpen(false);
          }}
        />
      </View>
    </View>
  );
}
