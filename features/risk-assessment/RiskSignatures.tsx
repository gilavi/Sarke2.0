import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { CircleCheck, Pencil } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import { SignatureCanvas } from '../../components/SignatureCanvas';
import type { RADocType, RASignatory } from '../../types/riskAssessment';
import { RA_SIGNATORIES } from './riskAssessmentSchema';
import type { RAStyles } from './styles';

type SigMap = Record<string, RASignatory>;

export function RiskSignatures({
  docType, signatories, setSignatories, s, theme,
}: {
  docType: RADocType;
  signatories: SigMap;
  setSignatories: (next: SigMap) => void;
  s: RAStyles;
  theme: any;
}) {
  const { t } = useTranslation();
  const [openRole, setOpenRole] = useState<string | null>(null);

  const update = (role: string, patch: Partial<RASignatory>) => {
    const prev = signatories[role] ?? { name: '', position: '', signature: null, date: null };
    setSignatories({ ...signatories, [role]: { ...prev, ...patch } });
  };

  return (
    <View style={{ gap: 12 }}>
      <Text style={s.sectionLabel}>{t('orders.signatures')}</Text>
      {RA_SIGNATORIES[docType].map((cfg) => {
        const sig = signatories[cfg.role];
        return (
          <View key={cfg.role} style={[s.card, { gap: 8 }]}>
            <Text style={s.cardIndex}>{t(cfg.labelKey)}</Text>
            <FloatingLabelInput
              label={t('orders.fullName')}
              value={sig?.name ?? ''}
              onChangeText={(v) => update(cfg.role, { name: v })}
            />
            {cfg.withPosition ? (
              <FloatingLabelInput
                label={t('risk.position')}
                value={sig?.position ?? ''}
                onChangeText={(v) => update(cfg.role, { position: v })}
              />
            ) : null}
            {sig?.signature ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <CircleCheck size={20} color={theme.colors.semantic.success} strokeWidth={1.5} />
                <Text style={{ color: theme.colors.semantic.success, fontWeight: '600', fontSize: 13 }}>
                  {t('orders.signatureAdded')}
                </Text>
                <Pressable onPress={() => update(cfg.role, { signature: null, date: null })}>
                  <Text style={{ color: theme.colors.inkSoft, textDecorationLine: 'underline', fontSize: 12 }}>
                    {t('orders.resignature')}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => setOpenRole(cfg.role)}
                style={[s.addBtn, { paddingVertical: 12 }]}
              >
                <Pencil size={18} color={theme.colors.accent} strokeWidth={1.5} />
                <Text style={s.addBtnText}>{t('orders.addSignature')}</Text>
              </Pressable>
            )}
            <SignatureCanvas
              visible={openRole === cfg.role}
              personName={sig?.name || t(cfg.labelKey)}
              onCancel={() => setOpenRole(null)}
              onConfirm={(b64) => {
                update(cfg.role, { signature: b64, date: new Date().toISOString() });
                setOpenRole(null);
              }}
            />
          </View>
        );
      })}
    </View>
  );
}
