import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Card } from '../../components/ui';
import { projectsApi } from '../../lib/services';
import { theme } from '../../lib/theme';
import type { Project } from '../../types/models';

export default function ProjectsScreen() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setProjects(await projectsApi.list());
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>პროექტები</Text>
        <Pressable onPress={() => router.push('/projects/new')} hitSlop={10}>
          <Ionicons name="add-circle" size={30} color={theme.colors.accent} />
        </Pressable>
      </View>
      <FlatList
        data={projects}
        keyExtractor={p => p.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={
          !loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 60, gap: 10 }}>
              <Ionicons name="folder-open" size={56} color={theme.colors.accent} style={{ opacity: 0.6 }} />
              <Text style={{ fontSize: 20, fontWeight: '700', color: theme.colors.ink }}>
                პროექტი არ არის
              </Text>
              <Text style={{ color: theme.colors.inkSoft, textAlign: 'center' }}>
                დააჭირე + ღილაკს ახალი პროექტის{'\n'}შესაქმნელად.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({ pathname: '/projects/[id]', params: { id: item.id } })
            }
          >
            <Card padding={14}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={styles.iconBox}>
                  <Ionicons name="folder" size={22} color={theme.colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.ink }}>
                    {item.name}
                  </Text>
                  {item.company_name ? (
                    <Text style={{ fontSize: 12, color: theme.colors.inkSoft, marginTop: 2 }}>
                      {item.company_name}
                    </Text>
                  ) : null}
                  {item.address ? (
                    <Text style={{ fontSize: 11, color: theme.colors.inkFaint, marginTop: 1 }}>
                      {item.address}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.inkFaint} />
              </View>
            </Card>
          </Pressable>
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
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  title: { fontSize: 22, fontWeight: '700', color: theme.colors.ink },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
