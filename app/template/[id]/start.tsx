import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Field, Input, Screen } from '../../../components/ui';
import { projectsApi, questionnairesApi, templatesApi } from '../../../lib/services';
import { useToast } from '../../../lib/toast';
import { theme } from '../../../lib/theme';
import type { Project, Questionnaire, Template } from '../../../types/models';

export default function StartTemplateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [template, setTemplate] = useState<Template | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [showingCreate, setShowingCreate] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    const [t, ps] = await Promise.all([
      templatesApi.getById(id).catch(() => null),
      projectsApi.list().catch(() => []),
    ]);
    setTemplate(t);
    setProjects(ps);
    setSelected(prev => prev ?? ps[0]?.id ?? null);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const start = async () => {
    if (!template || !selected) return;
    setBusy(true);
    try {
      const q = (await questionnairesApi.create({
        projectId: selected,
        templateId: template.id,
      }));
      router.replace(`/questionnaire/${q.id}` as any);
    } catch (e: any) {
      toast.error(e?.message ?? 'კითხვარი ვერ შეიქმნა');
    } finally {
      setBusy(false);
    }
  };

  const onCreated = (p: Project) => {
    setProjects(prev => [p, ...prev.filter(x => x.id !== p.id)]);
    setSelected(p.id);
    setShowingCreate(false);
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'ახალი კითხვარი', presentation: 'modal' }} />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={{ gap: 4 }}>
            <Text style={styles.eyebrow}>შაბლონი</Text>
            <Text style={styles.templateName}>{template?.name ?? '—'}</Text>
          </View>

          <View style={{ gap: 4, marginTop: 20 }}>
            <Text style={styles.eyebrow}>აირჩიე პროექტი</Text>
          </View>

          <Pressable onPress={() => setShowingCreate(true)} style={styles.newTile}>
            <View style={styles.newIcon}>
              <Ionicons name="add" size={22} color={theme.colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: theme.colors.ink }}>
                ახალი პროექტი
              </Text>
              <Text style={{ fontSize: 12, color: theme.colors.inkSoft, marginTop: 2 }}>
                შექმნი ახლავე
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.inkFaint} />
          </Pressable>

          {projects.length > 0 ? (
            <View style={{ gap: 10 }}>
              {projects.map(p => {
                const isSelected = selected === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => setSelected(p.id)}
                    style={[styles.projectRow, isSelected && styles.projectRowSelected]}
                  >
                    <View style={[styles.radio, isSelected && styles.radioOn]}>
                      {isSelected ? (
                        <Ionicons name="checkmark" size={16} color={theme.colors.white} />
                      ) : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: theme.colors.ink }}>
                        {p.name}
                      </Text>
                      {p.company_name ? (
                        <Text
                          numberOfLines={1}
                          style={{ fontSize: 12, color: theme.colors.inkSoft, marginTop: 2 }}
                        >
                          {p.company_name}
                        </Text>
                      ) : null}
                      {p.address ? (
                        <Text
                          numberOfLines={1}
                          style={{ fontSize: 11, color: theme.colors.inkFaint, marginTop: 1 }}
                        >
                          {p.address}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={{ color: theme.colors.inkSoft, fontSize: 13, textAlign: 'center', marginTop: 20 }}>
              ჯერ არცერთი პროექტი არ გაქვს.{'\n'}დაიწყე ახლის შექმნით.
            </Text>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="დაიწყე კითხვარი"
            onPress={start}
            loading={busy}
            disabled={!selected}
          />
        </View>
      </SafeAreaView>

      <CreateProjectSheet
        visible={showingCreate}
        onClose={() => setShowingCreate(false)}
        onCreated={onCreated}
      />
    </Screen>
  );
}

function CreateProjectSheet({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (p: Project) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const p = (await projectsApi.create({
        name: name.trim(),
        companyName: company.trim() || null,
        address: address.trim() || null,
      }));
      toast.success('პროექტი შეიქმნა');
      setName('');
      setCompany('');
      setAddress('');
      onCreated(p);
    } catch (e: any) {
      toast.error(e?.message ?? 'ვერ შეიქმნა');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: theme.colors.ink, flex: 1 }}>
                ახალი პროექტი
              </Text>
              <Pressable onPress={onClose} hitSlop={10}>
                <Ionicons name="close" size={24} color={theme.colors.inkSoft} />
              </Pressable>
            </View>
            <View style={{ gap: 12, marginTop: 8 }}>
              <Field label="სახელი">
                <Input
                  value={name}
                  onChangeText={setName}
                  placeholder="მაგ. ვაკე-საბურთალოს ობიექტი"
                  autoFocus
                />
              </Field>
              <Field label="კომპანია">
                <Input value={company} onChangeText={setCompany} placeholder="შემკვეთი" />
              </Field>
              <Field label="მისამართი">
                <Input value={address} onChangeText={setAddress} placeholder="ობიექტის მისამართი" />
              </Field>
            </View>
            <Button
              title="შენახვა"
              onPress={save}
              loading={busy}
              disabled={!name.trim()}
              style={{ marginTop: 14 }}
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 24, gap: 12 },
  eyebrow: {
    fontSize: 11,
    color: theme.colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  templateName: { fontSize: 20, fontWeight: '800', color: theme.colors.ink, marginTop: 4 },
  newTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  newIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: theme.colors.card,
    borderWidth: 2,
    borderColor: theme.colors.hairline,
  },
  projectRowSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentSoft,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
  },
  radioOn: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.hairline,
    backgroundColor: theme.colors.card,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    paddingTop: 10,
    paddingBottom: 44,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.hairline,
    alignSelf: 'center',
    marginBottom: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
