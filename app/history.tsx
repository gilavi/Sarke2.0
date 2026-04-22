import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Chip, Screen } from '../components/ui';
import { projectsApi, questionnairesApi, templatesApi } from '../lib/services';
import { shareStoredPdf } from '../lib/sharePdf';
import { theme } from '../lib/theme';
import type { Project, Questionnaire, Template } from '../types/models';

type Filter = 'all' | 'drafts' | 'completed';

export default function HistoryScreen() {
  const router = useRouter();
  const [qs, setQs] = useState<Questionnaire[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState<Filter>('all');

  const load = useCallback(async () => {
    // 200 is plenty for any individual expert — full-history pagination can
    // come later. 500 was loading ~15x more data than ever displayed.
    const [allQ, allT, allP] = await Promise.all([
      questionnairesApi.recent(200).catch(() => []),
      templatesApi.list().catch(() => []),
      projectsApi.list().catch(() => []),
    ]);
    setQs(allQ);
    setTemplates(allT);
    setProjects(allP);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const filtered =
    filter === 'all' ? qs : qs.filter(q => (filter === 'drafts' ? q.status === 'draft' : q.status === 'completed'));

  const openPdf = async (q: Questionnaire) => {
    if (!q.pdf_url) return;
    try {
      await shareStoredPdf(q.pdf_url);
    } catch {}
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'ისტორია' }} />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <View style={{ padding: 16 }}>
          <View style={styles.segment}>
            {(['all', 'drafts', 'completed'] as const).map(f => (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={[styles.segmentItem, filter === f && styles.segmentItemActive]}
              >
                <Text
                  style={{ color: filter === f ? theme.colors.white : theme.colors.inkSoft, fontWeight: '600' }}
                >
                  {f === 'all' ? 'ყველა' : f === 'drafts' ? 'დრაფტები' : 'დასრულდა'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <FlatList
          data={filtered}
          keyExtractor={q => q.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20, gap: 10 }}
          renderItem={({ item }) => {
            const t = templates.find(t => t.id === item.template_id);
            const p = projects.find(p => p.id === item.project_id);
            return (
              <Pressable
                onPress={() =>
                  item.status === 'draft'
                    ? router.push(`/questionnaire/${item.id}` as any)
                    : openPdf(item)
                }
              >
                <Card padding={12}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View
                      style={[
                        styles.icon,
                        {
                          backgroundColor:
                            item.status === 'completed' ? theme.colors.accentSoft : theme.colors.warnSoft,
                        },
                      ]}
                    >
                      <Ionicons
                        name={item.status === 'completed' ? 'checkmark-circle' : 'document-text'}
                        size={20}
                        color={item.status === 'completed' ? theme.colors.accent : theme.colors.warn}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '600', color: theme.colors.ink }}>
                        {t?.name ?? 'კითხვარი'}
                      </Text>
                      {p ? (
                        <Text style={{ fontSize: 11, color: theme.colors.inkSoft }}>{p.name}</Text>
                      ) : null}
                      <Text style={{ fontSize: 10, color: theme.colors.inkFaint }}>
                        {new Date(item.created_at).toLocaleString('ka')}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
                  </View>
                </Card>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Text style={{ color: theme.colors.inkSoft }}>ცარიელია</Text>
            </View>
          }
        />
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    padding: 4,
    backgroundColor: theme.colors.subtleSurface,
    borderRadius: 999,
  },
  segmentItem: { flex: 1, paddingVertical: 8, borderRadius: 999, alignItems: 'center' },
  segmentItemActive: { backgroundColor: theme.colors.accent },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
