import { View } from 'react-native';
import { Pressable } from 'react-native';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import { Selector } from '../../components/ui/Selector';
import { a11y } from '../../lib/accessibility';
import {
  riskScore,
  riskCategory,
  RA_CATEGORY_LABEL,
  RA_CATEGORY_COLOR,
  RA_CATEGORY_BG,
  type RiskHazardEntry,
} from '../../types/riskAssessment';
import { RA_SCORE_OPTIONS } from './riskAssessmentSchema';
import type { RAStyles } from './styles';

function RiskBadge({ score, s }: { score: number; s: RAStyles }) {
  const cat = riskCategory(score);
  if (!cat) {
    return (
      <View style={[s.riskBadge, { backgroundColor: '#F3F4F6' }]}>
        <Text style={[s.riskBadgeNum, { color: '#9CA3AF' }]}>—</Text>
      </View>
    );
  }
  return (
    <View style={[s.riskBadge, { backgroundColor: RA_CATEGORY_BG[cat] }]}>
      <Text style={[s.riskBadgeNum, { color: RA_CATEGORY_COLOR[cat] }]}>{score}</Text>
      <Text style={[s.riskBadgeLabel, { color: RA_CATEGORY_COLOR[cat] }]}>{RA_CATEGORY_LABEL[cat]}</Text>
    </View>
  );
}

export function RiskHazardRowCard({
  entry, index, onChange, onRemove, s, theme,
}: {
  entry: RiskHazardEntry;
  index: number;
  onChange: (patch: Partial<RiskHazardEntry>) => void;
  onRemove: () => void;
  s: RAStyles;
  theme: any;
}) {
  const { t } = useTranslation();
  const ScorePicker = ({ value, onPick, label }: { value: number; onPick: (n: number) => void; label: string }) => (
    <View style={s.scoreCol}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Selector
        presentation="chips"
        value={value ? String(value) : null}
        onChange={(v) => onPick(Number(v))}
        options={RA_SCORE_OPTIONS}
      />
    </View>
  );

  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <Text style={s.cardIndex}>{t('risk.hazardN', { n: index + 1 })}</Text>
        <Pressable onPress={onRemove} hitSlop={10} style={s.removeBtn} {...a11y(t('common.delete'), undefined, 'button')}>
          <X size={16} color={theme.colors.inkSoft} strokeWidth={1.5} />
        </Pressable>
      </View>

      <FloatingLabelInput label={t('risk.hazard')} value={entry.hazard} onChangeText={(v) => onChange({ hazard: v })} multiline />
      <FloatingLabelInput label={t('risk.persons')} value={entry.persons} onChangeText={(v) => onChange({ persons: v })} />
      <FloatingLabelInput label={t('risk.injuryType')} value={entry.injuryType} onChangeText={(v) => onChange({ injuryType: v })} />
      <FloatingLabelInput label={t('risk.existingControls')} value={entry.existingControls} onChangeText={(v) => onChange({ existingControls: v })} multiline />

      <Text style={s.fieldLabel}>{t('risk.initialRisk')}</Text>
      <View style={s.scoreRow}>
        <ScorePicker label={t('risk.probability')} value={entry.probability} onPick={(n) => onChange({ probability: n })} />
        <ScorePicker label={t('risk.severity')} value={entry.severity} onPick={(n) => onChange({ severity: n })} />
        <RiskBadge score={riskScore(entry.probability, entry.severity)} s={s} />
      </View>

      <FloatingLabelInput label={t('risk.additionalControls')} value={entry.additionalControls} onChangeText={(v) => onChange({ additionalControls: v })} multiline />

      <Text style={s.fieldLabel}>{t('risk.residualRisk')}</Text>
      <View style={s.scoreRow}>
        <ScorePicker label={t('risk.probability')} value={entry.residualProbability} onPick={(n) => onChange({ residualProbability: n })} />
        <ScorePicker label={t('risk.severity')} value={entry.residualSeverity} onPick={(n) => onChange({ residualSeverity: n })} />
        <RiskBadge score={riskScore(entry.residualProbability, entry.residualSeverity)} s={s} />
      </View>

      <FloatingLabelInput label={t('risk.measures')} value={entry.measures} onChangeText={(v) => onChange({ measures: v })} multiline />
      <FloatingLabelInput label={t('risk.responsible')} value={entry.responsible} onChangeText={(v) => onChange({ responsible: v })} />
    </View>
  );
}
