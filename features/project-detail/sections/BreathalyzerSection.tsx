// Breathalyzer logs section of the project detail screen.

import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { BookOpen, ChevronRight, CircleX } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { SectionEmptyState } from '../../../components/EmptyState';
import { ViewMoreRow } from '../../../components/projects/ProjectRowHelpers';
import { SkeletonRow } from '../../../components/Skeleton';
import { useTheme } from '../../../lib/theme';
import { a11y } from '../../../lib/accessibility';
import { countsByStatus, formatBlDate } from '../../../types/breathalyzerLog';
import type { BreathalizerLog } from '../../../types/breathalyzerLog';
import { getStyles } from '../styles';

export function BreathalyzerSection({
  id,
  breathalyzerLogs,
  loading = false,
}: {
  id: string | undefined;
  breathalyzerLogs: BreathalizerLog[];
  loading?: boolean;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const router = useRouter();

  return (
    <>
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <BookOpen size={16} color={theme.colors.inkSoft} strokeWidth={1.5} />
          <Text style={styles.sectionTitle}>{t('projects.logsTitle')}</Text>
          <Text style={styles.sectionCount}>{breathalyzerLogs.length}</Text>
        </View>
        <Pressable
          onPress={() => id && router.push(`/projects/${id}/logs/breathalyzer` as any)}
          hitSlop={16}
          {...a11y(t('projects.breathalyzerA11yLabel'), t('projects.breathalyzerA11yHint'), 'button')}
        >
          <Text style={styles.sectionAddLink}>{t('projects.addBreathalyzer')}</Text>
        </Pressable>
      </View>

      {loading && breathalyzerLogs.length === 0 ? (
        <View style={{ gap: 8, marginTop: 10 }}>
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : breathalyzerLogs.length === 0 ? (
        <SectionEmptyState type="documents" subtitle={t('projects.breathalyzerEmptySubtitle')} />
      ) : (
        <View style={{ marginTop: 4 }}>
          {breathalyzerLogs.slice(0, 3).map((log, i, arr) => {
            const logCounts = countsByStatus(log.entries);
            const hasFail = logCounts.fail > 0;
            const showBorder = i < arr.length - 1 || breathalyzerLogs.length > 3;
            return (
              <Pressable
                key={log.id}
                onPress={() =>
                  router.push(`/projects/${id}/logs/breathalyzer?logId=${log.id}` as any)
                }
                style={[styles.listRow, showBorder && styles.listRowBorder]}
                {...a11y(t('projects.breathalyzerRowA11yLabel'), t('projects.breathalyzerRowA11yHint'), 'button')}
              >
                <View style={[styles.statusIcon, { backgroundColor: theme.colors.subtleSurface }]}>
                  <BookOpen size={14} color={theme.colors.inkSoft} strokeWidth={1.5} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listRowTitle}>
                    {formatBlDate(log.date)}
                  </Text>
                  <Text style={styles.listRowSubtitle}>
                    {t('projects.breathalyzerPersonsTested', { count: log.entries.length })}
                    {log.status === 'closed' ? t('projects.breathalyzerStatusClosed') : t('projects.breathalyzerStatusOngoing')}
                  </Text>
                </View>
                {hasFail ? (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: theme.colors.surface,
                    borderRadius: 8,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  }}>
                    <CircleX size={12} color={theme.colors.inkSoft} strokeWidth={1.5} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.ink }}>
                      {logCounts.fail}
                    </Text>
                  </View>
                ) : null}
                <ChevronRight size={18} color={theme.colors.borderStrong} strokeWidth={1.5} />
              </Pressable>
            );
          })}
          {breathalyzerLogs.length > 3 ? (
            <ViewMoreRow
              items={breathalyzerLogs.slice(3).map(() => ({ category: null }))}
              total={breathalyzerLogs.length - 3}
              onPress={() => router.push(`/projects/${id}/logs/breathalyzer` as any)}
            />
          ) : null}
        </View>
      )}
    </>
  );
}
