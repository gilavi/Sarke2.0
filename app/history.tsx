import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { A11yText as Text } from '../components/primitives/A11yText';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Card, Screen } from '../components/ui';
import { Skeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { inspectionsApi } from '../lib/services';
import { InspectionTypeAvatar } from '../components/InspectionTypeAvatar';
import { useToast } from '../lib/toast';
import { useTheme } from '../lib/theme';

import { friendlyError } from '../lib/errorMap';
import { a11y } from '../lib/accessibility';
import {
  useRecentInspections,
  useTemplates,
  useProjects,
  useCertificateCounts,
  qk,
} from '../lib/apiHooks';
import { useQueryClient } from '@tanstack/react-query';
import type { Inspection, Project, Template } from '../types/models';
import { useTranslation } from 'react-i18next';

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
  t,
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
  t: (key: string, opts?: any) => string;
}) {
  if (item.kind === 'header') {
    return <Text style={styles.sectionTitle}>{item.label}</Text>;
  }
  const { q } = item;
  const tpl = templates.find(x => x.id === q.template_id);
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
        <Pressable onPress={() => onDelete(q)} style={styles.swipeDelete} {...a11y(t('common.delete'), 'შემოწმების აქტის წაშლა', 'button')}>
          <Ionicons name="trash" size={18} color={theme.colors.white} />
          <Text style={{ color: theme.colors.white, fontSize: 11, fontWeight: '700' }}>
            {t('common.delete')}
          </Text>
        </Pressable>
      )}
      overshootRight={false}
    >
      <Pressable
        onPress={() => {
          if (q.status === 'completed') {
            router.push(`/inspections/${q.id}` as any);
          } else if (tpl?.category === 'bobcat') {
            router.push(`/inspections/bobcat/${q.id}` as any);
          } else if (tpl?.category === 'excavator') {
            router.push(`/inspections/excavator/${q.id}` as any);
          } else if (tpl?.category === 'general_equipment') {
            router.push(`/inspections/general-equipment/${q.id}` as any);
          } else {
            router.push(`/inspections/${q.id}/wizard` as any);
          }
        }}
        style={({ pressed }) => pressed ? { opacity: 0.7 } : undefined}
        {...a11y(
          `${tpl?.name ?? t('common.inspection')} — ${p?.name ?? ''}`.trim(),
          q.status === 'completed' ? 'დასრულებული შემოწმების აქტის ნახვა' : 'დრაფტის გაგრძელება',
          'button'
        )}
      >
        <Card padding={12}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <InspectionTypeAvatar
              category={tpl?.category}
              size={44}
              status={q.status === 'completed' ? 'completed' : 'draft'}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', color: theme.colors.ink }}>
                {tpl?.name ?? t('common.inspection')}
              </Text>
              {p ? (
                <Text style={{ fontSize: 11, color: theme.colors.inkSoft }}>{p.name}</Text>
              ) : null}
              <Text style={{ fontSize: 10, color: theme.colors.inkFaint }}>
                {new Date(q.created_at).toLocaleString(t('common.localeTag'))}
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
  const { t } = useTranslation();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const router = useRouter();
  const toast = useToast();
  const { data: qs = [], isLoading: qsLoading } = useRecentInspections(200);
  const { data: templates = [], isLoading: tplsLoading } = useTemplates();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const completedIds = useMemo(() => qs.filter(i => i.status === 'completed').map(i => i.id), [qs]);
  const { data: certCounts = {}, isLoading: countsLoading } = useCertificateCounts(completedIds);
  const loaded = !qsLoading && !tplsLoading && !projectsLoading && !countsLoading;
  const swipeRefs = useRef<Map<string, SwipeableMethods>>(new Map());
  const openSwipeId = useRef<string | null>(null);

  const items = useMemo<ListItem[]>(() => {
    const drafts = qs.filter(q => q.status === 'draft');
    const completed = qs.filter(q => q.status === 'completed');
    const out: ListItem[] = [];
    if (drafts.length > 0) {
      out.push({ kind: 'header', label: t('history.draftsSection') });
      drafts.forEach(q => out.push({ kind: 'row', q }));
    }
    if (completed.length > 0) {
      out.push({ kind: 'header', label: t('history.completedSection') });
      completed.forEach(q => out.push({ kind: 'row', q }));
    }
    return out;
  }, [qs]);

  const queryClient = useQueryClient();

  const onDelete = useCallback((q: Inspection) => {
    Alert.alert(t('history.deleteTitle'), t('history.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await inspectionsApi.remove(q.id);
            queryClient.invalidateQueries({ queryKey: qk.inspections.recent(200) });
            toast.success(t('history.deleted'));
          } catch (e) {
            toast.error(friendlyError(e, t('history.deleteError')));
          }
        },
      },
    ]);
  }, [toast, t, queryClient]);

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
      t={t}
    />
  ), [templates, projects, certCounts, onDelete, router, theme, styles, t]);

  return (
    <Screen edgeToEdge edges={[]}>
      <Stack.Screen options={{ headerShown: true, title: t('history.title') }} />
      <FlatList
          data={items}
          keyExtractor={(item) => (item.kind === 'header' ? `h-${item.label}` : item.q.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32, gap: 8 }}
          renderItem={renderItem}
          initialNumToRender={10}
          windowSize={7}
          removeClippedSubviews
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
                title={t('history.emptyTitle')}
                subtitle={t('history.emptyHint')}
                action={{
                  label: t('history.startInspection'),
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
    borderRadius: 16,
  },
  certBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.accent,
  },
});
}
