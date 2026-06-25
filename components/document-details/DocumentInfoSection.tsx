// DocumentInfoSection — the read-only "Information" key/value list.
//
// Design note / intentional divergence from the reference mockup: the reference
// shows Project + Expert as *editable* rows that open a picker. In our data
// model the Expert is always the authoring user (there is no per-document expert
// and no expert picker), and the incident/report update APIs deliberately omit
// project_id, so re-assigning a saved document's project isn't supported. These
// rows are therefore display-only. See components/document-details/AGENTS.md.
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../primitives/A11yText';
import { useTheme, type Theme } from '../../lib/theme';
import type { DocumentInfoRow } from './types';

interface Props {
  rows: DocumentInfoRow[];
}

export function DocumentInfoSection({ rows }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View>
      <Text style={styles.label}>{t('details.info.heading')}</Text>
      <View style={styles.list}>
        {rows.map((r, i) => (
          <View key={`${r.label}-${i}`} style={[styles.row, i > 0 && styles.divider]}>
            <Text style={styles.k} numberOfLines={1}>
              {r.label}
            </Text>
            <Text style={styles.v} numberOfLines={1}>
              {r.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.inkFaint,
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    list: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.hairline,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.hairline },
    k: { fontSize: 14, color: theme.colors.inkFaint },
    v: { flex: 1, fontSize: 14, fontWeight: '600', color: theme.colors.ink, textAlign: 'right' },
  });
}
