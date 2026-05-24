// Incidents section of the project detail screen.

import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { SectionEmptyState } from '../../../components/EmptyState';
import { IncidentRow, ViewMoreRow } from '../../../components/projects/ProjectRowHelpers';
import { useTheme } from '../../../lib/theme';
import type { Incident } from '../../../types/models';
import { getStyles } from '../styles';

export function IncidentsSection({
  id,
  incidents,
}: {
  id: string | undefined;
  incidents: Incident[];
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const router = useRouter();

  const sorted = useMemo(
    () => [...incidents].sort((a, b) => +new Date(b.date_time) - +new Date(a.date_time)),
    [incidents],
  );
  const preview = useMemo(() => sorted.slice(0, 3), [sorted]);
  const overflow = useMemo(() => sorted.slice(3), [sorted]);

  return (
    <>
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="warning-outline" size={16} color={theme.colors.inkSoft} />
          <Text style={styles.sectionTitle}>ინციდენტები</Text>
          <Text style={styles.sectionCount}>{incidents.length}</Text>
        </View>
        <Pressable onPress={() => router.push(`/incidents/new?projectId=${id}` as any)} hitSlop={16}>
          <Text style={styles.sectionAddLink}>+ დამატება</Text>
        </Pressable>
      </View>

      {incidents.length === 0 ? (
        <SectionEmptyState type="incidents" />
      ) : (
        <View style={{ gap: 8, marginTop: 10 }}>
          {preview.map(inc => (
            <IncidentRow
              key={inc.id}
              incident={inc}
              onPress={() => router.push(`/incidents/${inc.id}` as any)}
            />
          ))}
          {overflow.length > 0 ? (
            <ViewMoreRow
              items={overflow.map(() => ({ ionicon: 'warning-outline' }))}
              total={overflow.length}
              onPress={() => router.push(`/projects/${id}/incidents` as any)}
            />
          ) : null}
        </View>
      )}
    </>
  );
}
