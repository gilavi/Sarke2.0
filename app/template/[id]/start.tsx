import { useCallback, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Card, Field, Input, Screen } from '../../../components/ui';
import { projectsApi, questionnairesApi, templatesApi } from '../../../lib/services';
import { theme } from '../../../lib/theme';
import type { Project, Questionnaire, Template } from '../../../types/models';

export default function StartTemplateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [template, setTemplate] = useState<Template | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const [all, ps] = await Promise.all([
          templatesApi.list().catch(() => []),
          projectsApi.list().catch(() => []),
        ]);
        setTemplate(all.find(t => t.id === id) ?? null);
        setProjects(ps);
        if (!selected && ps.length > 0) setSelected(ps[0].id);
      })();
    }, [id]),
  );

  const start = async () => {
    if (!template) return;
    setBusy(true);
    try {
      let projectId = selected;
      if (creatingNew) {
        const p = (await projectsApi.create({
          name: newName,
          companyName: newCompany || null,
          address: newAddress || null,
        })) as unknown as Project;
        projectId = p.id;
      }
      if (!projectId) return;
      const q = (await questionnairesApi.create({ projectId, templateId: template.id })) as unknown as Questionnaire;
      router.replace(`/questionnaire/${q.id}` as any);
    } catch (e: any) {
      Alert.alert('შეცდომა', e?.message ?? '');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: template?.name ?? 'დაწყება' }} />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
          <Text style={{ color: theme.colors.inkSoft }}>აირჩიე პროექტი ან შექმენი ახალი.</Text>

          {!creatingNew ? (
            <View style={{ gap: 8 }}>
              {projects.length === 0 ? (
                <Text style={{ color: theme.colors.inkSoft }}>არცერთი პროექტი არ არის.</Text>
              ) : null}
              {projects.map(p => (
                <Card
                  key={p.id}
                  padding={12}
                  style={
                    selected === p.id
                      ? { borderColor: theme.colors.accent, borderWidth: 2 }
                      : undefined
                  }
                >
                  <Text onPress={() => setSelected(p.id)} style={{ fontWeight: '600' }}>
                    {p.name}
                  </Text>
                </Card>
              ))}
              <Button
                title="+ ახალი პროექტი"
                variant="secondary"
                onPress={() => setCreatingNew(true)}
              />
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              <Field label="სახელი">
                <Input value={newName} onChangeText={setNewName} />
              </Field>
              <Field label="კომპანია">
                <Input value={newCompany} onChangeText={setNewCompany} />
              </Field>
              <Field label="მისამართი">
                <Input value={newAddress} onChangeText={setNewAddress} />
              </Field>
              <Button
                title="გაუქმება"
                variant="secondary"
                onPress={() => setCreatingNew(false)}
              />
            </View>
          )}

          <Button
            title="დაიწყე კითხვარი"
            onPress={start}
            loading={busy}
            disabled={creatingNew ? !newName.trim() : !selected}
          />
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
