import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Card, Screen } from '../components/ui';
import { Skeleton } from '../components/Skeleton';
import {
  certificatesApi,
  inspectionsApi,
  projectsApi,
  templatesApi,
} from '../lib/services';
import { useToast } from '../lib/toast';
import { theme } from '../lib/theme';
import type { Inspection, Project, Template } from '../types/models';

type ListItem =
  | { kind: 'header'; label: string }
  | { kind: 'row'; q: Inspection };

export default function HistoryScreen() {
  const router = useRouter();
  const toast = useToast();
  const [qs, setQs] = useState<Inspection[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  // inspection_id → number of attached certificate PDFs; used for the
  // per-row count badge so users can see "this inspection has 2 PDFs".
  const [certCounts, setCertCounts] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);

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

  const drafts = qs.filter(q => q.status === 'draft');
  const completed = qs.filter(q => q.status === 'completed');

  const items: ListItem[] = [];
  if (drafts.length > 0) {
    items.push({ kind: 'header', label: 'დრაფტები' });
    drafts.forEach(q => items.push({ kind: 'row', q }));
  }
  if (completed.length > 0) {
    items.push({ kind: 'header', label: 'დასრულებული' });
    completed.forEach(q => items.push({ kind: 'row', q }));
  }

  const onDelete = (q: Inspection) => {
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
          } catch (e: any) {
            toast.error(e?.message ?? 'ვერ წაიშალა');
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'ისტორია' }} />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <FlatList
          data={items}
          keyExtractor={(item, i) => (item.kind === 'header' ? `h-${i}` : item.q.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20, gap: 8 }}
          renderItem={({ item }) => {
            if (item.kind === 'header') {
              return (
                <Text style={styles.sectionTitle}>{item.label}</Text>
              );
            }
            const { q } = item;
            const t = templates.find(t => t.id === q.template_id);
            const p = projects.find(p => p.id === q.project_id);
            return (
              <Swipeable
                renderRightActions={() => (
                  <Pressable onPress={() => onDelete(q)} style={styles.swipeDelete}>
                    <Ionicons name="trash" size={18} color={theme.colors.white} />
                    <Text style={{ color: theme.colors.white, fontSize: 11, fontWeight: '700' }}>
                      წაშლა
                    </Text>
                  </Pressable>
                )}
                overshootRight={false}
              >
                <Pressable
                  // Draft → resume wizard; completed → inspection detail.
                  onPress={() =>
                    q.status === 'completed'
                      ? router.push(`/inspections/${q.id}` as any)
                      : router.push(`/inspections/${q.id}/wizard` as any)
                  }
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
                          name={q.status === 'completed' ? 'checkmark-circle' : 'document-text'}
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
          }}
          ListEmptyComponent={
            !loaded ? (
              <View style={{ gap: 10 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i} padding={12}>
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
              <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                <Text style={{ color: theme.colors.inkSoft }}>ცარიელია</Text>
              </View>
            )
          }
        />
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
