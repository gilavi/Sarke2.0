import { useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import { CircleCheck, Pencil } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { SignatureCanvas } from '../../components/SignatureCanvas';
import type { CombinedForm } from './orderFormSchema';
import type { OrderStyles } from './styles';

export function StepSignaturesFireSafety({
  form, setForm, theme, s, attempted, registerField,
}: {
  form: CombinedForm;
  setForm: React.Dispatch<React.SetStateAction<CombinedForm>>;
  theme: any;
  s: OrderStyles;
  attempted: boolean;
  registerField: (key: string) => (e: LayoutChangeEvent) => void;
}) {
  const { t } = useTranslation();
  const [directorCanvasOpen, setDirectorCanvasOpen] = useState(false);
  const [appointedCanvasOpen, setAppointedCanvasOpen] = useState(false);

  return (
    <View style={{ gap: 20 }}>
      <Text style={s.stepTitle}>{t('orders.signatures')}</Text>

      {/* Director */}
      <View style={{ gap: 8 }} onLayout={registerField('directorSignature')}>
        <Text style={s.sectionLabel}>{t('orders.directorLabel')}</Text>
        <Text style={[s.summaryLabel, { width: 'auto' }]}>{form.directorName || t('orders.directorLabel')}</Text>
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
            <Text style={{ fontSize: 13, color: theme.colors.semantic.success, fontWeight: '600' }}>{t('orders.signatureAdded')}</Text>
            <Pressable onPress={() => setForm(f => ({ ...f, directorSignature: null, directorSignedAt: null }))}>
              <Text style={{ fontSize: 12, color: theme.colors.inkSoft, textDecorationLine: 'underline' }}>{t('orders.resignature')}</Text>
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
            <Text style={[s.typeLabel, { textAlign: 'center', color: theme.colors.accent }]}>{t('orders.addSignature')}</Text>
          </Pressable>
        )}
        {attempted && !form.directorSignature && (
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.danger }}>
            {t('orders.signatureRequired')}
          </Text>
        )}
        <SignatureCanvas
          visible={directorCanvasOpen}
          personName={form.directorName || t('orders.directorLabel')}
          onCancel={() => setDirectorCanvasOpen(false)}
          onConfirm={(b64) => {
            setForm(f => ({ ...f, directorSignature: b64, directorSignedAt: new Date().toISOString() }));
            setDirectorCanvasOpen(false);
          }}
        />
      </View>

      {/* Appointed */}
      <View style={{ gap: 8 }} onLayout={registerField('appointedSignature')}>
        <Text style={s.sectionLabel}>{t('orders.responsiblePerson')}</Text>
        <Text style={[s.summaryLabel, { width: 'auto' }]}>{form.appointedName || t('orders.appointedPerson')}</Text>
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
            <Text style={{ fontSize: 13, color: theme.colors.semantic.success, fontWeight: '600' }}>{t('orders.signatureAdded')}</Text>
            <Pressable onPress={() => setForm(f => ({ ...f, appointedSignature: null, appointedSignedAt: null }))}>
              <Text style={{ fontSize: 12, color: theme.colors.inkSoft, textDecorationLine: 'underline' }}>{t('orders.resignature')}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => setAppointedCanvasOpen(true)}
            style={[
              s.typeCard,
              { justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 20 },
              attempted && !form.appointedSignature && { borderColor: theme.colors.danger },
            ]}
          >
            <Pencil size={22} color={theme.colors.accent} strokeWidth={1.5} />
            <Text style={[s.typeLabel, { textAlign: 'center', color: theme.colors.accent }]}>{t('orders.addSignature')}</Text>
          </Pressable>
        )}
        {attempted && !form.appointedSignature && (
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.danger }}>
            {t('orders.signatureRequired')}
          </Text>
        )}
        <SignatureCanvas
          visible={appointedCanvasOpen}
          personName={form.appointedName || t('orders.appointedPerson')}
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
