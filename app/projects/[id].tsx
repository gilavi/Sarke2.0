import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
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
import { useActionSheet } from '@expo/react-native-action-sheet';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Button, Card, Field, Input, Screen } from '../../components/ui';
import {
  projectsApi,
  questionnairesApi,
  templatesApi,
} from '../../lib/services';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { useToast } from '../../lib/toast';
import { getStorageImageDataUrl } from '../../lib/imageUrl';
import { theme } from '../../lib/theme';
import type { Project, ProjectSigner, Questionnaire, Template } from '../../types/models';
import { SIGNER_ROLE_LABEL } from '../../types/models';

type SubTab = 'drafts' | 'completed';

export default function ProjectDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showActionSheetWithOptions } = useActionSheet();
  const toast = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [signers, setSigners] = useState<ProjectSigner[]>([]);
  const [signerPreviews, setSignerPreviews] = useState<Record<string, string>>({});
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [tab, setTab] = useState<SubTab>('drafts');
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [p, s, q, t] = await Promise.all([
      projectsApi.getById(id).catch(() => null),
      projectsApi.signers(id).catch(() => []),
      questionnairesApi.listByProject(id).catch(() => []),
      templatesApi.list().catch(() => []),
    ]);
    setProject(p);
    setSigners(s);
    setQuestionnaires(q);
    setTemplates(t);

    // Lazy-load sig thumbnails
    const previews: Record<string, string> = {};
    await Promise.all(
      s
        .filter(x => x.signature_png_url)
        .map(async x => {
          previews[x.id] = await getStorageImageDataUrl(
            STORAGE_BUCKETS.signatures,
            x.signature_png_url!,
          );
        }),
    );
    setSignerPreviews(previews);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const drafts = useMemo(
    () => questionnaires.filter(q => q.status === 'draft'),
    [questionnaires],
  );
  const completed = useMemo(
    () => questionnaires.filter(q => q.status === 'completed'),
    [questionnaires],
  );

  const startNewQuestionnaire = () => {
    const system = templates.filter(t => t.is_system);
    if (system.length === 0) {
      toast.error('შაბლონი არ არის');
      return;
    }
    const options = [...system.map(t => t.name), 'გაუქმება'];
    showActionSheetWithOptions(
      { title: 'აირჩიე შაბლონი', options, cancelButtonIndex: options.length - 1 },
      async idx => {
        if (idx == null || idx === options.length - 1 || !id) return;
        const t = system[idx];
        try {
          const q = (await questionnairesApi.create({
            projectId: id,
            templateId: t.id,
          }));
          router.push(`/questionnaire/${q.id}` as any);
        } catch (e: any) {
          toast.error(e?.message ?? 'შექმნა ვერ მოხერხდა');
        }
      },
    );
  };

  const deleteQuestionnaire = (q: Questionnaire) => {
    Alert.alert('წაშლა?', 'კითხვარი სამუდამოდ წაიშლება.', [
      { text: 'გაუქმება', style: 'cancel' },
      {
        text: 'წაშლა',
        style: 'destructive',
        onPress: async () => {
          try {
            await questionnairesApi.remove(q.id);
            setQuestionnaires(prev => prev.filter(x => x.id !== q.id));
            toast.success('წაიშალა');
          } catch (e: any) {
            toast.error(e?.message ?? 'ვერ წაიშალა');
          }
        },
      },
    ]);
  };

  const deleteSigner = (s: ProjectSigner) => {
    Alert.alert('წაშლა?', s.full_name, [
      { text: 'გაუქმება', style: 'cancel' },
      {
        text: 'წაშლა',
        style: 'destructive',
        onPress: async () => {
          try {
            await projectsApi.deleteSigner(s.id);
            setSigners(prev => prev.filter(x => x.id !== s.id));
            toast.success('წაიშალა');
          } catch (e: any) {
            toast.error(e?.message ?? 'ვერ წაიშალა');
          }
        },
      },
    ]);
  };

  const listToShow = tab === 'drafts' ? drafts : completed;

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerShown: true,
          // Static title gives context ("you're on a project page"). The
          // actual project name is the hero inside the first card, which is
          // more scannable than cramming it into a narrow header.
          title: 'პროექტი',
          headerRight: () => (
            <Pressable
              onPress={() => setEditing(true)}
              hitSlop={10}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              accessibilityLabel="რედაქტირება"
            >
              <Ionicons name="create-outline" size={18} color={theme.colors.accent} />
              <Text style={{ color: theme.colors.accent, fontWeight: '600', fontSize: 15 }}>
                რედაქტ.
              </Text>
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110, gap: 14 }}>
          {/* Hero meta */}
          <Card>
            <Text style={styles.eyebrow}>პროექტი</Text>
            <Text style={styles.projectName}>{project?.name ?? '—'}</Text>
            {project?.company_name ? (
              <View style={styles.metaRow}>
                <Ionicons name="business" size={14} color={theme.colors.inkSoft} />
                <Text style={styles.metaText}>{project.company_name}</Text>
              </View>
            ) : null}
            {project?.address ? (
              <View style={styles.metaRow}>
                <Ionicons name="location" size={14} color={theme.colors.inkSoft} />
                <Text style={styles.metaText}>{project.address}</Text>
              </View>
            ) : null}
          </Card>

          {/* Signer roster */}
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.eyebrow}>ხელმომწერები</Text>
              <Text style={{ color: theme.colors.inkSoft, fontSize: 12 }}>{signers.length}</Text>
            </View>
            <View style={{ gap: 8, marginTop: 10 }}>
              {signers.map(s => (
                <Swipeable
                  key={s.id}
                  renderRightActions={() => (
                    <Pressable onPress={() => deleteSigner(s)} style={styles.swipeDelete}>
                      <Ionicons name="trash" size={18} color={theme.colors.white} />
                    </Pressable>
                  )}
                  overshootRight={false}
                >
                  <Pressable
                    onPress={() =>
                      router.push(`/projects/${id}/signer?signerId=${s.id}` as any)
                    }
                    style={styles.signerRow}
                  >
                    <View style={styles.sigThumb}>
                      {signerPreviews[s.id] ? (
                        <Image
                          source={{ uri: signerPreviews[s.id] }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="contain"
                        />
                      ) : (
                        <Ionicons name="person" size={20} color={theme.colors.inkFaint} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.ink }}>
                        {s.full_name}
                      </Text>
                      <Text style={{ fontSize: 11, color: theme.colors.inkSoft, marginTop: 2 }}>
                        {SIGNER_ROLE_LABEL[s.role]}
                      </Text>
                      {!s.signature_png_url ? (
                        <View style={styles.missingChip}>
                          <Text style={{ color: theme.colors.warn, fontSize: 10, fontWeight: '700' }}>
                            ხელმოწერა არ არის
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
                  </Pressable>
                </Swipeable>
              ))}
              <Pressable
                onPress={() => router.push(`/projects/${id}/signer` as any)}
                style={styles.addSignerRow}
              >
                <Ionicons name="person-add" size={18} color={theme.colors.accent} />
                <Text style={{ color: theme.colors.accent, fontWeight: '600' }}>
                  + ხელმომწერის დამატება
                </Text>
              </Pressable>
            </View>
          </Card>

          {/* Questionnaires */}
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.eyebrow}>კითხვარები</Text>
              <Text style={{ color: theme.colors.inkSoft, fontSize: 12 }}>
                {questionnaires.length}
              </Text>
            </View>
            <View style={styles.segment}>
              <Segment
                active={tab === 'drafts'}
                label={`დრაფტები · ${drafts.length}`}
                onPress={() => setTab('drafts')}
              />
              <Segment
                active={tab === 'completed'}
                label={`დასრულდა · ${completed.length}`}
                onPress={() => setTab('completed')}
              />
            </View>
            <View style={{ gap: 8, marginTop: 10 }}>
              {listToShow.length === 0 ? (
                <Text style={{ color: theme.colors.inkSoft, fontSize: 13, paddingVertical: 12 }}>
                  ცარიელია
                </Text>
              ) : (
                listToShow.map(q => {
                  const template = templates.find(t => t.id === q.template_id);
                  return (
                    <Swipeable
                      key={q.id}
                      renderRightActions={() => (
                        <Pressable
                          onPress={() => deleteQuestionnaire(q)}
                          style={styles.swipeDelete}
                        >
                          <Ionicons name="trash" size={18} color={theme.colors.white} />
                        </Pressable>
                      )}
                      overshootRight={false}
                    >
                      <Pressable
                        onPress={() => router.push(`/questionnaire/${q.id}` as any)}
                        style={styles.qRow}
                      >
                        <Ionicons
                          name={q.status === 'completed' ? 'checkmark-circle' : 'document-text'}
                          size={20}
                          color={q.status === 'completed' ? theme.colors.accent : theme.colors.warn}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.ink }}>
                            {template?.name ?? 'კითხვარი'}
                          </Text>
                          <Text style={{ fontSize: 11, color: theme.colors.inkSoft, marginTop: 2 }}>
                            {new Date(q.created_at).toLocaleString('ka')}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
                      </Pressable>
                    </Swipeable>
                  );
                })
              )}
            </View>
          </Card>
        </ScrollView>

        <View style={styles.footer}>
          <Button title="+ ახალი კითხვარი" onPress={startNewQuestionnaire} />
        </View>
      </SafeAreaView>

      <EditProjectSheet
        visible={editing}
        project={project}
        onClose={() => setEditing(false)}
        onSaved={saved => {
          setProject(saved);
          setEditing(false);
          toast.success('შენახულია');
        }}
      />
    </Screen>
  );
}

function Segment({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.segmentItem, active && styles.segmentItemActive]}
    >
      <Text
        style={{
          color: active ? theme.colors.white : theme.colors.inkSoft,
          fontWeight: '600',
          fontSize: 12,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function EditProjectSheet({
  visible,
  project,
  onClose,
  onSaved,
}: {
  visible: boolean;
  project: Project | null;
  onClose: () => void;
  onSaved: (p: Project) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);

  // Sync when project changes / modal opens
  useFocusEffect(
    useCallback(() => {
      if (visible && project) {
        setName(project.name);
        setCompany(project.company_name ?? '');
        setAddress(project.address ?? '');
      }
    }, [visible, project]),
  );

  const save = async () => {
    if (!project || !name.trim()) return;
    setBusy(true);
    try {
      const saved = (await projectsApi.update(project.id, {
        name: name.trim(),
        company_name: company.trim() || null,
        address: address.trim() || null,
      }));
      onSaved(saved);
    } catch (e: any) {
      toast.error(e?.message ?? 'შენახვა ვერ მოხერხდა');
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
                რედაქტირება
              </Text>
              <Pressable onPress={onClose} hitSlop={10}>
                <Ionicons name="close" size={22} color={theme.colors.inkSoft} />
              </Pressable>
            </View>
            <View style={{ gap: 12, marginTop: 8 }}>
              <Field label="სახელი">
                <Input value={name} onChangeText={setName} />
              </Field>
              <Field label="კომპანია">
                <Input value={company} onChangeText={setCompany} />
              </Field>
              <Field label="მისამართი">
                <Input value={address} onChangeText={setAddress} />
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
  eyebrow: {
    fontSize: 11,
    color: theme.colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  projectName: { fontSize: 22, fontWeight: '800', color: theme.colors.ink, marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  metaText: { fontSize: 13, color: theme.colors.inkSoft, flexShrink: 1 },

  signerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    backgroundColor: theme.colors.subtleSurface,
    borderRadius: 10,
  },
  sigThumb: {
    width: 48,
    height: 36,
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    overflow: 'hidden',
  },
  missingChip: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.warnSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  addSignerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: theme.colors.accentSoft,
  },
  segment: {
    flexDirection: 'row',
    padding: 4,
    backgroundColor: theme.colors.subtleSurface,
    borderRadius: 999,
    marginTop: 10,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
  },
  segmentItemActive: { backgroundColor: theme.colors.accent },
  qRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    backgroundColor: theme.colors.subtleSurface,
    borderRadius: 10,
  },

  swipeDelete: {
    width: 72,
    backgroundColor: theme.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    borderRadius: 10,
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: theme.colors.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.hairline,
  },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    paddingTop: 10,
    paddingBottom: 28,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.hairline,
    alignSelf: 'center',
    marginBottom: 10,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center' },
});
