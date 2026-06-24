import { memo } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from './primitives/A11yText';
import { useTheme } from '../lib/theme';

export type RecordType = 'inspection' | 'incident' | 'briefing' | 'report';

export interface RecordTypePillProps {
  recordType: RecordType;
  /** Override displayed label; omit to use the canonical Georgian label. */
  label?: string;
}

export const RecordTypePill = memo(function RecordTypePill({
  recordType,
  label,
}: RecordTypePillProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const DEFAULT_LABELS: Record<RecordType, string> = {
    inspection: t('components.recordTypePillInspection'),
    incident:   t('components.recordTypePillIncident'),
    briefing:   t('components.recordTypePillBriefing'),
    report:     t('components.recordTypePillReport'),
  };

  const resolvedLabel = label ?? DEFAULT_LABELS[recordType];

  return (
    <Text style={[styles.label, { color: theme.colors.inkSoft }]}>
      {resolvedLabel}
    </Text>
  );
});

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
});
