import { View, Pressable } from 'react-native';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import { a11y } from '../../lib/accessibility';
import type { PpeEntry } from '../../types/riskAssessment';
import type { RAStyles } from './styles';

export function PpeRowCard({
  entry, index, onChange, onRemove, s, theme,
}: {
  entry: PpeEntry;
  index: number;
  onChange: (patch: Partial<PpeEntry>) => void;
  onRemove: () => void;
  s: RAStyles;
  theme: any;
}) {
  const { t } = useTranslation();
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <Text style={s.cardIndex}>{t('risk.positionN', { n: index + 1 })}</Text>
        <Pressable onPress={onRemove} hitSlop={10} style={s.removeBtn} {...a11y(t('common.delete'), undefined, 'button')}>
          <X size={16} color={theme.colors.inkSoft} strokeWidth={1.5} />
        </Pressable>
      </View>
      <FloatingLabelInput label={t('risk.position')} value={entry.position} onChangeText={(v) => onChange({ position: v })} />
      <FloatingLabelInput label={t('risk.activities')} value={entry.activities} onChangeText={(v) => onChange({ activities: v })} multiline />
      <FloatingLabelInput label={t('risk.hazardsCol')} value={entry.hazards} onChangeText={(v) => onChange({ hazards: v })} multiline />
      <FloatingLabelInput label={t('risk.bodyParts')} value={entry.bodyParts} onChangeText={(v) => onChange({ bodyParts: v })} />
      <FloatingLabelInput label={t('risk.ppe')} value={entry.ppe} onChangeText={(v) => onChange({ ppe: v })} multiline />
    </View>
  );
}
