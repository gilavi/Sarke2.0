// Pending-sync section (Home) — documents created/edited offline, waiting for
// the outbox to replay them. Rendered above the record widgets when anything
// is queued. Items disappear when a flush lands their rows (the flush's
// invalidateRecordLists call brings the real records into the lists); failed
// groups get retry/dismiss. Deliberately NOT merged into the list caches —
// invalidateRecordLists would race/wipe optimistic rows there.

import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { CloudUpload, TriangleAlert, RefreshCw, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from './primitives/A11yText';
import { IconButton } from './primitives/IconButton';
import { useTheme, type Theme } from '../lib/theme';
import { useOutbox } from '../lib/outbox';

export function PendingSyncSection() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const { pendingGroups, failedGroups, retryFailed, dismissFailed } = useOutbox();

  if (pendingGroups.length === 0 && failedGroups.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <CloudUpload size={16} color={theme.colors.inkSoft} strokeWidth={1.5} />
        <Text style={styles.title}>{t('components.pendingSyncTitle')}</Text>
      </View>
      <View style={styles.card}>
        {pendingGroups.map((g) => (
          <View key={g.groupId} style={styles.row}>
            <CloudUpload size={18} color={theme.colors.inkSoft} strokeWidth={1.5} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {g.displayTitle || t('components.pendingSyncItem')}
              </Text>
              <Text style={styles.rowSub}>{t('components.pendingSyncItem')}</Text>
            </View>
          </View>
        ))}
        {failedGroups.map((g) => (
          <View key={`failed-${g.groupId}`} style={styles.row}>
            <TriangleAlert size={18} color={theme.colors.danger} strokeWidth={1.5} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {g.displayTitle || t('components.pendingSyncItem')}
              </Text>
              <Text style={[styles.rowSub, { color: theme.colors.danger }]}>
                {t('components.pendingSyncFailed')}
              </Text>
            </View>
            <IconButton
              icon={RefreshCw}
              a11yLabel={t('components.pendingSyncRetry')}
              variant="outline"
              size="sm"
              onPress={() => {
                void retryFailed();
              }}
            />
            <IconButton
              icon={X}
              a11yLabel={t('components.pendingSyncDismiss')}
              variant="outline"
              size="sm"
              onPress={() => {
                void dismissFailed(g.groupId);
              }}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: { paddingHorizontal: 20, paddingTop: 20, gap: 8 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    title: { fontSize: 13, fontWeight: '700', color: theme.colors.inkSoft },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
    rowTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.ink },
    rowSub: { fontSize: 12, color: theme.colors.inkFaint, marginTop: 2 },
  });
}
