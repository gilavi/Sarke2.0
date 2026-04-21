import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Chip, Screen, SectionHeader } from '../../components/ui';
import {
  projectsApi,
  questionnairesApi,
  templatesApi,
} from '../../lib/services';
import { theme } from '../../lib/theme';
import type { Project, ProjectSigner, Questionnaire, Template } from '../../types/models';
import { SIGNER_ROLE_LABEL } from '../../types/models';

export default function ProjectDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [signers, setSigners] = useState<ProjectSigner[]>([]);
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  const project = useMemo(() => projects.find(p => p.id === id), [projects, id]);

  const load = useCallback(async () => {
    if (!id) return;
    const [ps, s, q, t] = await Promise.all([
      projectsApi.list().catch(() => []),
      projectsApi.signers(id).catch(() => []),
      questionnairesApi.listByProject(id).catch(() => []),
      templatesApi.list().catch(() => []),
    ]);
    setProjects(ps);
    setSigners(s);
    setQuestionnaires(q);
    setTemplates(t);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const chooseTemplate = () => {
    const systemT = templates.filter(t => t.is_system);
    const options = systemT.map(t => ({ text: t.name, onPress: () => startWith(t) }));
    Alert.alert('აირჩიე შაბლონი', '', [...options, { text: 'გაუქმება', style: 'cancel' }]);
  };

  const startWith = async (template: Template) => {
    if (!id) return;
    try {
      const q = (await questionnairesApi.create({ projectId: id, templateId: template.id })) as unknown as Questionnaire;
      router.push({ pathname: '/questionnaire/[id]', params: { id: q.id } });
    } catch (e: any) {
      Alert.alert('შეცდომა', e?.message ?? '');
    }
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerShown: true,
          title: project?.name ?? 'პროექტი',
          headerStyle: { backgroundColor: theme.colors.background },
        }}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
          <Card>
            <Text style={styles.kvKey}>კომპანია</Text>
            <Text style={styles.kvVal}>{project?.company_name ?? '—'}</Text>
            <View style={{ height: 10 }} />
            <Text style={styles.kvKey}>მისამართი</Text>
            <Text style={styles.kvVal}>{project?.address ?? '—'}</Text>
          </Card>

          <SectionHeader title="ხელმომწერები" />
          <View style={{ gap: 8 }}>
            {signers.map(s => (
              <Card key={s.id} padding={12}>
                <Text style={{ fontSize: 11, color: theme.colors.inkSoft }}>
                  {SIGNER_ROLE_LABEL[s.role]}
                </Text>
                <Text style={{ fontWeight: '600', color: theme.colors.ink }}>{s.full_name}</Text>
              </Card>
            ))}
          </View>
          <Pressable
            onPress={() =>
              router.push({ pathname: '/projects/[id]/signer', params: { id: id! } })
            }
          >
            <View style={styles.addRow}>
              <Ionicons name="person-add" size={18} color={theme.colors.accent} />
              <Text style={{ color: theme.colors.accent, fontWeight: '600' }}>
                ხელმომწერის დამატება
              </Text>
            </View>
          </Pressable>

          <SectionHeader title="კითხვარები" />
          <View style={{ gap: 8 }}>
            {questionnaires.map(q => {
              const t = templates.find(t => t.id === q.template_id);
              return (
                <Pressable
                  key={q.id}
                  onPress={() =>
                    router.push({ pathname: '/questionnaire/[id]', params: { id: q.id } })
                  }
                >
                  <Card padding={12}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '600', color: theme.colors.ink }}>
                          {t?.name ?? 'კითხვარი'}
                        </Text>
                        <Text style={{ fontSize: 11, color: theme.colors.inkSoft, marginTop: 2 }}>
                          {new Date(q.created_at).toLocaleString('ka')}
                        </Text>
                      </View>
                      <Chip
                        tint={q.status === 'completed' ? theme.colors.accent : theme.colors.warn}
                        bg={q.status === 'completed' ? theme.colors.accentSoft : theme.colors.warnSoft}
                      >
                        {q.status === 'completed' ? 'დასრულდა' : 'დრაფტი'}
                      </Chip>
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </View>

          <Button
            title="ახალი კითხვარი"
            onPress={chooseTemplate}
            variant="secondary"
            style={{ marginTop: 8 }}
          />
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kvKey: { fontSize: 11, color: theme.colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.5 },
  kvVal: { fontSize: 15, color: theme.colors.ink, marginTop: 2 },
  addRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.accentSoft,
    borderRadius: 12,
  },
});
