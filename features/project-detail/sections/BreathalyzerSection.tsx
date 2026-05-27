// Breathalyzer logs section of the project detail screen.

import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { SectionEmptyState } from '../../../components/EmptyState';
import { ViewMoreRow } from '../../../components/projects/ProjectRowHelpers';
import { SkeletonRow } from '../../../components/Skeleton';
import { useTheme } from '../../../lib/theme';
import { a11y } from '../../../lib/accessibility';
import { BL_RESULT_COLORS, countsByStatus, formatBlDate } from '../../../types/breathalyzerLog';
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
  const styles = useMemo(() => getStyles(theme), [theme]);
  const router = useRouter();

  return (
    <>
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="journal-outline" size={16} color={theme.colors.inkSoft} />
          <Text style={styles.sectionTitle}>ჟურნალები</Text>
          <Text style={styles.sectionCount}>{breathalyzerLogs.length}</Text>
        </View>
        <Pressable
          onPress={() => id && router.push(`/projects/${id}/logs/breathalyzer` as any)}
          hitSlop={16}
          {...a11y('ალკოტესტი', 'ალკოტესტის ჟურნალის გახსნა', 'button')}
        >
          <Text style={styles.sectionAddLink}>+ ალკოტესტი</Text>
        </Pressable>
      </View>

      {loading && breathalyzerLogs.length === 0 ? (
        <View style={{ gap: 8, marginTop: 10 }}>
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : breathalyzerLogs.length === 0 ? (
        <SectionEmptyState type="documents" subtitle="ალკოტესტი ჩაწერილი არ არის" />
      ) : (
        <View style={{ gap: 8, marginTop: 10 }}>
          {breathalyzerLogs.slice(0, 3).map(log => {
            const logCounts = countsByStatus(log.entries);
            const hasFail = logCounts.fail > 0;
            return (
              <Pressable
                key={log.id}
                onPress={() =>
                  router.push(`/projects/${id}/logs/breathalyzer?logId=${log.id}` as any)
                }
                style={styles.listRow}
                {...a11y('ალკოტესტის ჟურნალი', 'დეტალების სანახავად დააჭირეთ', 'button')}
              >
                <View style={[styles.statusIcon, {
                  backgroundColor: log.status === 'closed'
                    ? theme.colors.semantic.successSoft
                    : theme.colors.semantic.warningSoft,
                }]}>
                  <Ionicons
                    name={log.status === 'closed' ? 'journal' : 'journal-outline'}
                    size={14}
                    color={log.status === 'closed'
                      ? theme.colors.semantic.success
                      : theme.colors.certTint}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listRowTitle}>
                    {formatBlDate(log.date)}
                  </Text>
                  <Text style={styles.listRowSubtitle}>
                    {log.entries.length} პირი ტესტირებული
                    {log.status === 'closed' ? ' · დასრულებული' : ' · მიმდინარე'}
                  </Text>
                </View>
                {hasFail ? (
                  <View style={{
                    backgroundColor: BL_RESULT_COLORS.fail.bg,
                    borderRadius: 8,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderWidth: 1,
                    borderColor: BL_RESULT_COLORS.fail.border,
                  }}>
                    <Text style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: BL_RESULT_COLORS.fail.text,
                    }}>
                      ⚠ {logCounts.fail} FAIL
                    </Text>
                  </View>
                ) : null}
                <Ionicons name="chevron-forward" size={18} color={theme.colors.borderStrong} />
              </Pressable>
            );
          })}
          {breathalyzerLogs.length > 3 ? (
            <ViewMoreRow
              items={breathalyzerLogs.slice(3).map(() => ({ ionicon: 'journal-outline' }))}
              total={breathalyzerLogs.length - 3}
              onPress={() => router.push(`/projects/${id}/logs/breathalyzer` as any)}
            />
          ) : null}
        </View>
      )}
    </>
  );
}
