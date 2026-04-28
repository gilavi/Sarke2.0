import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { A11yText as Text } from '../components/primitives/A11yText';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Card, Screen } from '../components/ui';
import { Skeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import {
  certificatesApi,
  inspectionsApi,
  projectsApi,
  templatesApi,
} from '../lib/services';
import { useToast } from '../lib/toast';
import { useTheme } from '../lib/theme';

import { toErrorMessage } from '../lib/logError';
import { friendlyError } from '../lib/errorMap';
import { a11y } from '../lib/accessibility';
import type { Inspection, Project, Template } from '../types/models';

type ListItem =
  | { kind: 'header'; label: string }
  | { kind: 'row'; q: Inspection };

const MemoizedHistoryItem = memo(function HistoryItem({
  item,
  templates,
  projects,
  certCounts,
  swipeRefs,
  openSwipeId,
  onDelete,
  router,
  theme,
  styles,
}: {
  item: ListItem;
  templates: Template[];
  projects: Project[];
  certCounts: Record<string, number>;
  swipeRefs: React.RefObject<Map<string, SwipeableMethods>>;
  openSwipeId: React.RefObject<string | null>;
  onDelete: (q: Inspection) => void;
  router: ReturnType<typeof useRouter>;
  theme: any;
  styles: any;
}) {
  if (item.kind === 'header') {
    return <Text style={styles.sectionTitle}>{item.label}</Text>;
  }
  const { q } = item;
  const t = templates.find(t => t.id === q.template_id);
  const p = projects.find(p => p.id === q.project_id);
  return (
    <Swipeable
      ref={((ref: SwipeableMethods | null) => {
        if (ref) swipeRefs.current.set(q.id, ref);
        else swipeRefs.current.delete(q.id);
      }) as any}
      onSwipeableWillOpen={() => {
        const prev = openSwipeId.current;
        if (prev && prev !== q.id) {
          swipeRefs.current.get(prev)?.close();
        }
        openSwipeId.current = q.id;
      }}
      onSwipeableClose={() => {
        if (openSwipeId.current === q.id) openSwipeId.current = null;
      }}
      renderRightActions={() => (
        <Pressable onPress={() => onDelete(q)} style={styles.swipeDelete} {...a11y('წაშლა', 'ინსპექციის წაშლა', 'button')}>
          <Ionicons name="trash" size={18} color={theme.colors.white} />
          <Text style={{ color: theme.colors.white, fontSize: 11, fontWeight: '700' }}>
            წაშლა
          </Text>
        </Pressable>
      )}
      overshootRight={false}
    >
      <Pressable
        onPress={() =>
          q.status === 'completed'
            ? router.push(`/inspections/${q.id}` as any)
            : router.push(`/inspections/${q.id}/wizard` as any)
        }
        {...a11y(
          `${t?.name ?? 'ინსპექცია'} — ${p?.name ?? ''}`.trim(),
          q.status === 'completed' ? 'დასრულებული ინსპექციის ნახვა' : 'დრაფტის გაგრძელება',
          'button'
        )}
      >
        <Card padding={12}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={[
                styles.icon,
                {
                  backgroundColor:
                    q.status === 'completed' ? theme.colors.accentSoft : theme.colors.warnSoft,
                },
              ]}
            >
              <Ionicons
                name={q.status === 'completed' ? 'checkmark-circle' : 'pencil'}
                size={20}
                color={q.status === 'completed' ? theme.colors.accent : theme.colors.warn}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', color: theme.colors.ink }}>
                {t?.name ?? 'ინსპექცია'}
              </Text>
              {p ? (
                <Text style={{ fontSize: 11, color: theme.colors.inkSoft }}>{p.name}</Text>
              ) : null}
              <Text style={{ fontSize: 10, color: theme.colors.inkFaint }}>
                {new Date(q.created_at).toLocaleString('ka')}
              </Text>
            </View>
            {certCounts[q.id] ? (
              <View style={styles.certBadge}>
                <Ionicons
                  name="document-text"
                  size={11}
                  color={theme.colors.accent}
                />
                <Text style={styles.certBadgeText}>{certCounts[q.id]}</Text>
              </View>
            ) : null}
            <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
          </View>
        </Card>
      </Pressable>
    </Swipeable>
  );
});

export default function HistoryScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const router = useRouter();
  const toast = useToast();
  const [qs, setQs] = useState<Inspection[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  // inspection_id → number of attached certificate PDFs; used for the
  // per-row count badge so users can see "this inspection has 2 PDFs".
  const [certCounts, setCertCounts] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);
  const swipeRefs = useRef<Map<string, SwipeableMethods>>(new Map());
  const openSwipeId = useRef<string | null>(null);

  const load = useCallback(async () => {
    const [allQ, allT, allP] = await Promise.all([
      inspectionsApi.recent(200).catch(() => []),
      templatesApi.list().catch(() => []),
      projectsApi.list().catch(() => []),
    ]);
    setQs(allQ);
    setTemplates(allT);
    setProjects(allP);
    // Only bother fetching cert counts for completed inspections — drafts
    // can't have certs by definition.
    const completedIds = allQ.filter(i => i.status === 'completed').map(i => i.id);
    if (completedIds.length > 0) {
      const counts = await certificatesApi
        .countsByInspection(completedIds)
        .catch(() => ({} as Record<string, number>));
      setCertCounts(counts);
    } else {
      setCertCounts({});
    }
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const items = useMemo<ListItem[]>(() => {
    const drafts = qs.filter(q => q.status === 'draft');
    const completed = qs.filter(q => q.status === 'completed');
    const out: ListItem[] = [];
    if (drafts.length > 0) {
      out.push({ kind: 'header', label: 'დრაფტები' });
      drafts.forEach(q => out.push({ kind: 'row', q }));
    }
    if (completed.length > 0) {
      out.push({ kind: 'header', label: 'დასრულებული' });
      completed.forEach(q => out.push({ kind: 'row', q }));
    }
    return out;
  }, [qs]);

  const onDelete = useCallback((q: Inspection) => {
    Alert.alert('წაშლა?', 'ინსპექცია სამუდამოდ წაიშლება.', [
      { text: 'გაუქმება', style: 'cancel' },
      {
        text: 'წაშლა',
        style: 'destructive',
        onPress: async () => {
          try {
            await inspectionsApi.remove(q.id);
            setQs(prev => prev.filter(x => x.id !== q.id));
            toast.success('წაიშალა');
          } catch (e) {
            toast.error(friendlyError(e, 'ვერ წაიშალა'));
          }
        },
      },
    ]);
  }, [toast]);

  const renderItem = useCallback(({ item }: { item: ListItem }) => (
    <MemoizedHistoryItem
      item={item}
      templates={templates}
      projects={projects}
      certCounts={certCounts}
      swipeRefs={swipeRefs}
      openSwipeId={openSwipeId}
      onDelete={onDelete}
      router={router}
      theme={theme}
      styles={styles}
    />
  ), [templates, projects, certCounts, onDelete, router, theme, styles]);

  return (
    <Screen edgeToEdge edges={[]}>
      <Stack.Screen options={{ headerShown: true, title: 'ისტორია', headerBackTitle: 'მეტი' }} />
      <FlatList
          data={items}
          keyExtractor={(item, i) => (item.kind === 'header' ? `h-${i}` : item.q.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32, gap: 8 }}
          renderItem={renderItem}
          ListEmptyComponent={
            !loaded ? (
              <View style={{ gap: 10 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Card key={`skeleton-${i}`} padding={12}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Skeleton width={40} height={40} radius={10} />
                      <View style={{ flex: 1, gap: 8 }}>
                        <Skeleton width={'65%'} height={14} />
                        <Skeleton width={'40%'} height={11} />
                      </View>
                      <Skeleton width={18} height={18} radius={9} />
                    </View>
                  </Card>
                ))}
              </View>
            ) : (
              <EmptyState
                type="history"
                title="ისტორია ცარიელია"
                subtitle="დასრულებული ინსპექციები გამოჩნდება აქ"
                action={{
                  label: 'ინსპექციის დაწყება',
                  icon: 'play-circle-outline',
                  onPress: () => router.push('/(tabs)/home'),
                }}
              />
            )
          }
        />
    </Screen>
  );
}

function getstyles(theme: any) {
  return StyleSheet.create({
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 2,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeDelete: {
    width: 86,
    backgroundColor: theme.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginLeft: 8,
    borderRadius: 12,
  },
  certBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: theme.colors.accentSoft,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  certBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.accent,
  },
});
}
