import React from 'react';
import { View } from 'react-native';
import { TriangleAlert } from 'lucide-react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { Selector } from '../../components/ui/Selector';
import { incidentColors } from '../../lib/statusColors';
import type { IncidentType } from '../../types/models';
import { INCIDENT_TYPE_FULL_LABEL } from '../../types/models';
import type { IncidentStyles } from './styles';

// ─── Step 1 - type selection ──────────────────────────────────────────────────

export const Step1Type = React.memo(function Step1Type({
  type, setType, theme, isDark, s, attempted, t,
}: {
  type: IncidentType | null;
  setType: (v: IncidentType) => void;
  theme: any;
  isDark: boolean;
  s: IncidentStyles;
  attempted: boolean;
  t: (key: string) => string;
}) {
  const types: IncidentType[] = ['minor', 'severe', 'fatal', 'mass', 'nearmiss'];
  const needsNotice = type === 'severe' || type === 'fatal';
  const showError = attempted && type === null;

  return (
    <View style={{ gap: 12 }}>
      <Text style={s.stepTitle}>{t('incidents.step1Title')}</Text>

      {/* Canonical Selector: bordered "type cards" with a leading severity dot and
          a check on the selected one (severity stays color-coded; chrome is monochrome). */}
      <Selector
        presentation="rows"
        indicator="check"
        error={showError}
        value={type}
        onChange={(v) => setType(v as IncidentType)}
        options={types.map(type => ({
          value: type,
          label: INCIDENT_TYPE_FULL_LABEL[type],
          leading: <View style={[s.typeCardDot, { backgroundColor: incidentColors(isDark)[type].border }]} />,
        }))}
      />

      {showError && (
        <Text style={s.requiredError}>{t('incidents.selectTypeError')}</Text>
      )}

      {needsNotice && (
        <View style={s.warningBanner}>
          <TriangleAlert size={18} color={theme.colors.danger} strokeWidth={1.5} />
          <Text style={s.warningBannerText}>
            {t('incidents.labourNoticeWarning')}
          </Text>
        </View>
      )}
    </View>
  );
});
