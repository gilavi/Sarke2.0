import { memo } from 'react';
import { StyleSheet } from 'react-native';
import { A11yText as Text } from './primitives/A11yText';
import { useTheme } from '../lib/theme';

export type RecordType = 'inspection' | 'incident' | 'briefing' | 'report';

export interface RecordTypePillProps {
  recordType: RecordType;
  /** Override displayed label; omit to use the canonical Georgian label. */
  label?: string;
}

const DEFAULT_LABELS: Record<RecordType, string> = {
  inspection: 'შემოწმება',
  incident:   'ინციდენტი',
  briefing:   'ინსტრუქტაჟი',
  report:     'რეპორტი',
};


export const RecordTypePill = memo(function RecordTypePill({
  recordType,
  label,
}: RecordTypePillProps) {
  const { theme } = useTheme();
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
