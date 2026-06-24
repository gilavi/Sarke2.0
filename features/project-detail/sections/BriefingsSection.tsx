// Briefings section of the project detail screen.
// Completed-only — drafts live in the global Drafts screen (More tab) — and the
// rows carry no status chrome (shared `BriefingRow`).

import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { Megaphone } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { SectionEmptyState } from '../../../components/EmptyState';
import { ViewMoreRow } from '../../../components/projects/ProjectRowHelpers';
import { SkeletonRow } from '../../../components/Skeleton';
import { BriefingRow } from '../../records';
import { useTheme } from '../../../lib/theme';
import type { Briefing } from '../../../types/models';
import { getStyles } from '../styles';

export function BriefingsSection({
  id,
  briefings,
  loading = false,
}: {
  id: string | undefined;
  briefings: Briefing[];
  loading?: boolean;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const router = useRouter();

  const completed = useMemo(
    () =>
      briefings
        .filter((b) => b.status === 'completed')
        .sort((a, b) => +new Date(b.dateTime) - +new Date(a.dateTime)),
    [briefings],
  );
  const preview = useMemo(() => completed.slice(0, 3), [completed]);
  const overflow = useMemo(() => completed.slice(3), [completed]);

  return (
    <>
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Megaphone size={16} color={theme.colors.inkSoft} strokeWidth={1.5} />
          <Text style={styles.sectionTitle}>{t('projects.briefingsSectionTitle')}</Text>
          <Text style={styles.sectionCount}>{completed.length}</Text>
        </View>
        <Pressable
          onPress={() => id && router.push(`/briefings/new?projectId=${id}` as any)}
          hitSlop={16}
        >
          <Text style={styles.sectionAddLink}>{t('projects.addBriefing')}</Text>
        </Pressable>
      </View>

      {loading && completed.length === 0 ? (
        <View style={{ gap: 8, marginTop: 10 }}>
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : completed.length === 0 ? (
        <SectionEmptyState type="briefings" />
      ) : (
        <View style={{ marginTop: 4 }}>
          {preview.map((b, i) => (
            <BriefingRow
              key={b.id}
              briefing={b}
              showBorder={i < preview.length - 1 || overflow.length > 0}
              onPress={() => router.push(`/briefings/${b.id}` as any)}
            />
          ))}
          {overflow.length > 0 ? (
            <ViewMoreRow
              items={overflow.map(() => ({ category: null }))}
              total={overflow.length}
              onPress={() => router.push(`/projects/${id}/briefings` as any)}
            />
          ) : null}
        </View>
      )}
    </>
  );
}
