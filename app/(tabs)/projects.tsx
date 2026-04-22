import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { projectAvatar } from '../../lib/projectAvatar';
import { Button, Card } from '../../components/ui';
import { projectsApi } from '../../lib/services';
import { useToast } from '../../lib/toast';
import { theme } from '../../lib/theme';
import type { Project } from '../../types/models';

type Stats = Record<string, { drafts: number; completed: number }>;

export default function ProjectsScreen() {
  const router = useRouter();
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    try {
      const [ps, s] = await Promise.all([
        projectsApi.list(),
        projectsApi.stats().catch(() => ({}) as Stats),
      ]);
      setProjects(ps);
      setStats(s);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return projects;
    const q = query.toLowerCase();
    return projects.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        (p.company_name ?? '').toLowerCase().includes(q) ||
        (p.address ?? '').toLowerCase().includes(q),
    );
  }, [projects, query]);

  const onDelete = (project: Project) => {
    Alert.alert(
      'წაშლა?',
      `"${project.name}" — ეს მოცილდება ყველა კითხვარსაც. გსურს გაგრძელება?`,
      [
        { text: 'გაუქმება', style: 'cancel' },
        {
          text: 'წაშლა',
          style: 'destructive',
          onPress: async () => {
            try {
              await projectsApi.remove(project.id);
              setProjects(prev => prev.filter(p => p.id !== project.id));
              toast.success('წაიშალა');
            } catch (e: any) {
              toast.error(e?.message ?? 'ვერ წაიშალა');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>პროექტები</Text>
        <Text style={styles.subtitle}>
          {projects.length > 0 ? `${projects.length} სულ` : ''}
        </Text>
      </View>
      {projects.length > 0 ? (
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={theme.colors.inkSoft} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="ძებნა..."
            placeholderTextColor={theme.colors.inkFaint}
            style={styles.searchInput}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={theme.colors.inkFaint} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={p => p.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 10 }}
        renderItem={({ item }) => (
          <ProjectRow
            project={item}
            stats={stats[item.id]}
            onOpen={() => router.push(`/projects/${item.id}` as any)}
            onDelete={() => onDelete(item)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={theme.colors.accent}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <View style={styles.emptyIllustration}>
                <Ionicons name="folder-open" size={56} color={theme.colors.accent} />
              </View>
              <Text style={styles.emptyTitle}>
                {query ? 'ვერაფერი მოიძებნა' : 'ჯერ პროექტი არ არის'}
              </Text>
              <Text style={styles.emptyBody}>
                {query
                  ? 'სცადე სხვა საძიებო სიტყვა.'
                  : 'შექმენი პირველი პროექტი და დაიწყე შემოწმებები.'}
              </Text>
              {!query ? (
                <Button
                  title="+ ახალი პროექტი"
                  onPress={() => router.push('/projects/new')}
                  style={{ marginTop: 14, width: 240 }}
                />
              ) : null}
            </View>
          ) : null
        }
      />

      <Pressable
        onPress={() => router.push('/projects/new')}
        style={[styles.fab, theme.shadow.button]}
      >
        <Ionicons name="add" size={28} color={theme.colors.white} />
      </Pressable>
    </SafeAreaView>
  );
}

function ProjectRow({
  project,
  stats,
  onOpen,
  onDelete,
}: {
  project: Project;
  stats?: { drafts: number; completed: number };
  onOpen: () => void;
  onDelete: () => void;
}) {
  const renderRightActions = () => (
    <Pressable onPress={onDelete} style={styles.swipeDelete}>
      <Ionicons name="trash" size={20} color={theme.colors.white} />
      <Text style={{ color: theme.colors.white, fontWeight: '600', fontSize: 12 }}>წაშლა</Text>
    </Pressable>
  );

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
      <Pressable onPress={onOpen}>
        <Card padding={14}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[styles.iconBox, { backgroundColor: projectAvatar(project.id).color + '22' }]}>
              <Text style={{ fontSize: 22 }}>{projectAvatar(project.id).emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {project.name}
              </Text>
              {project.company_name ? (
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {project.company_name}
                  {project.address ? ` · ${project.address}` : ''}
                </Text>
              ) : project.address ? (
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {project.address}
                </Text>
              ) : null}
              {stats && (stats.drafts > 0 || stats.completed > 0) ? (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                  {stats.drafts > 0 ? (
                    <View style={[styles.counter, { backgroundColor: theme.colors.warnSoft }]}>
                      <Ionicons name="pencil" size={11} color={theme.colors.warn} />
                      <Text style={{ color: theme.colors.warn, fontSize: 11, fontWeight: '700' }}>
                        {stats.drafts} დრაფტი
                      </Text>
                    </View>
                  ) : null}
                  {stats.completed > 0 ? (
                    <View style={[styles.counter, { backgroundColor: theme.colors.accentSoft }]}>
                      <Ionicons name="checkmark" size={11} color={theme.colors.accent} />
                      <Text style={{ color: theme.colors.accent, fontSize: 11, fontWeight: '700' }}>
                        {stats.completed} დასრულდა
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.inkFaint} />
          </View>
        </Card>
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  title: { fontSize: 28, fontWeight: '800', color: theme.colors.ink },
  subtitle: { fontSize: 12, color: theme.colors.inkSoft, paddingBottom: 4 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.card,
    marginHorizontal: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
  },
  searchInput: { flex: 1, color: theme.colors.ink, fontSize: 15, padding: 0 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.ink },
  rowMeta: { fontSize: 12, color: theme.colors.inkSoft, marginTop: 2 },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  swipeDelete: {
    width: 96,
    backgroundColor: theme.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginLeft: 8,
    borderRadius: theme.radius.lg,
  },
  empty: {
    alignItems: 'center',
    padding: 40,
    paddingTop: 80,
  },
  emptyIllustration: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.ink, marginBottom: 6 },
  emptyBody: {
    fontSize: 14,
    color: theme.colors.inkSoft,
    textAlign: 'center',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
