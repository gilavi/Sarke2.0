import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { useTheme } from '../../lib/theme';
import {
  countsByStatus,
  type BLEntry,
  type BLResultStatus,
} from '../../types/breathalyzerLog';
import { resultStatusIcon, resultStatusShortKey } from './resultMeta';

const ORDER: BLResultStatus[] = ['safe', 'warning', 'fail'];

/** Close-shift summary: total tested + monochrome safe/warning/fail counts. */
export function SummaryStats({ entries }: { entries: BLEntry[] }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const counts = useMemo(() => countsByStatus(entries), [entries]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        {t('breathalyzer.totalTested', { count: entries.length })}
      </Text>
      <View style={styles.row}>
        {ORDER.map(status => {
          const Icon = resultStatusIcon[status];
          return (
            <View key={status} style={styles.cell}>
              <Icon size={18} color={theme.colors.inkSoft} strokeWidth={1.5} />
              <Text style={styles.count}>{counts[status]}</Text>
              <Text style={styles.label}>{t(resultStatusShortKey[status])}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function getStyles(theme: any) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
      padding: 16,
      gap: 12,
    },
    title: { fontSize: 16, fontWeight: '700', color: theme.colors.ink },
    row: { flexDirection: 'row', gap: 10 },
    cell: {
      flex: 1,
      backgroundColor: theme.colors.subtleSurface,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      gap: 2,
    },
    count: { fontSize: 24, fontWeight: '800', color: theme.colors.ink },
    label: { fontSize: 10, fontWeight: '600', color: theme.colors.inkSoft },
  });
}
