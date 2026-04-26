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
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useBottomSheet } from '../../components/BottomSheet';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Button, Card, Field, Input, Screen } from '../../components/ui';
import { Skeleton, SkeletonCard, SkeletonListCard } from '../../components/Skeleton';
import { MapPicker, type LatLng } from '../../components/MapPicker';
import {
  projectsApi,
  questionnairesApi,
  templatesApi,
} from '../../lib/services';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { useToast } from '../../lib/toast';
import { getStorageImageDisplayUrl } from '../../lib/imageUrl';
import { projectAvatar } from '../../lib/projectAvatar';
import { theme } from '../../lib/theme';
import { toErrorMessage } from '../../lib/logError';
import type { CrewMember, Project, ProjectSigner, Questionnaire, Template } from '../../types/models';
import { SIGNER_ROLE_LABEL } from '../../types/models';
import { CrewList } from '../../components/CrewSection';
import { useSession } from '../../lib/session';
import { a11y } from '../../lib/accessibility';

export default function ProjectDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const showActionSheetWithOptions = useBottomSheet();
  const toast = useToast();
  const session = useSession();

  const [project, setProject] = useState<Project | null>(null);
  const [signers, setSigners] = useState<ProjectSigner[]>([]);
  const [signerPreviews, setSignerPreviews] = useState<Record<string, string>>({});
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [otherProjects, setOtherProjects] = useState<Project[]>([]);
  const [editing, setEditing] = useState(false);
  // Flips true after the first fetch finishes. Drives the skeleton → content
  // swap; refocus doesn't re-show skeletons once we have data.
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [p, s, q, t, all] = await Promise.all([
      projectsApi.getById(id).catch(() => null),
      projectsApi.signers(id).catch(() => []),
      questionnairesApi.listByProject(id).catch(() => []),
      templatesApi.list().catch(() => []),
      projectsApi.list().catch(() => []),
    ]);
    setProject(p);
    setSigners(s);
    setQuestionnaires(q);
    setTemplates(t);
    setOtherProjects(all.filter(x => x.id !== id));

    // Lazy-load sig thumbnails
    const previews: Record<string, string> = {};
    await Promise.all(
      s
        .filter(x => x.signature_png_url)
        .map(async x => {
          previews[x.id] = await getStorageImageDisplayUrl(
            STORAGE_BUCKETS.signatures,
            x.signature_png_url!,
          );
        }),
    );
    setSignerPreviews(previews);
    setLoaded(true);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Inspector row (logged-in expert) — derived from auth, never persisted
  // into projects.crew. The crew list itself is just the manual entries.
  const inspector = useMemo(() => {
    if (session.state.status !== 'signedIn') return null;
    const u = session.state.user;
    const fallback = session.state.session.user.email ?? 'ინსპექტორი';
    const name = u
      ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || fallback
      : fallback;
    return { name, role: 'ინსპექტორი' };
  }, [session.state]);

  const persistCrew = useCallback(
    async (next: CrewMember[]) => {
      if (!project) return;
      // Optimistic — patch local state, then persist. Roll back on failure
      // so the user sees what's actually stored.
      const prev = project;
      setProject({ ...project, crew: next });
      try {
        const saved = await projectsApi.update(project.id, { crew: next });
        setProject(saved);
      } catch (e) {
        setProject(prev);
        toast.error(toErrorMessage(e, 'მონაწილე ვერ შეინახა'));
      }
    },
    [project, toast],
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
          router.push(`/inspections/${q.id}/wizard` as any);
        } catch (e) {
          toast.error(toErrorMessage(e, 'შექმნა ვერ მოხერხდა'));
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
          } catch (e) {
            toast.error(toErrorMessage(e, 'ვერ წაიშალა'));
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
          } catch (e) {
            toast.error(toErrorMessage(e, 'ვერ წაიშალა'));
          }
        },
      },
    ]);
  };

  if (!loaded && !project) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'პროექტი' }} />
        <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
            <SkeletonCard>
              <Skeleton width={80} height={10} />
              <View style={{ height: 8 }} />
              <Skeleton width={'70%'} height={22} />
              <View style={{ height: 10 }} />
              <Skeleton width={'45%'} height={13} />
              <View style={{ height: 4 }} />
              <Skeleton width={'55%'} height={13} />
            </SkeletonCard>
            <SkeletonListCard rows={2} />
            <SkeletonListCard rows={3} />
          </ScrollView>
        </SafeAreaView>
      </Screen>
    );
  }

  const stats = [
    { label: 'მონაწილეები', count: (project?.crew?.length ?? 0) + (inspector ? 1 : 0), icon: 'people' as const },
    { label: 'კითხვარები', count: questionnaires.length, icon: 'clipboard' as const },
    { label: 'დრაფტები', count: drafts.length, icon: 'pencil' as const },
    { label: 'ხელმოწერები', count: signers.length, icon: 'create' as const },
  ];

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'პროექტი',
          headerTitleStyle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#F5F5F0' },
          headerTintColor: '#1F2937',
          headerRight: () => (
            <Pressable
              onPress={() => setEditing(true)}
              hitSlop={10}
              style={{ padding: 4 }}
              {...a11y('რედაქტირება', 'პროექტის დეტალების შეცვლა', 'button')}
            >
              <Ionicons name="create-outline" size={22} color="#059669" />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 16 }}>
          {/* ── Hero Card ── */}
          <View style={styles.heroCard}>
            <Text style={styles.heroName}>{project?.name ?? '—'}</Text>
            {project?.company_name ? (
              <View style={styles.heroMetaRow}>
                <Ionicons name="business-outline" size={14} color="#6B7280" />
                <Text style={styles.heroMetaText}>{project.company_name}</Text>
              </View>
            ) : null}
            {project?.address ? (
              <View style={styles.heroMetaRow}>
                <Ionicons name="location-outline" size={14} color="#6B7280" />
                <Text style={styles.heroMetaText}>{project.address}</Text>
              </View>
            ) : null}
            {project?.latitude != null && project?.longitude != null ? (
              <View style={styles.mapWrap}>
                <MapView
                  provider={PROVIDER_DEFAULT}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                  initialRegion={{
                    latitude: project.latitude,
                    longitude: project.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                >
                  <Marker
                    coordinate={{ latitude: project.latitude, longitude: project.longitude }}
                    pinColor="#059669"
                  />
                </MapView>
              </View>
            ) : null}
          </View>

          {/* ── Stats Row ── */}
          <View style={styles.statsRow}>
            {stats.map(s => (
              <View key={s.label} style={styles.statCard}>
                <Ionicons name={s.icon} size={18} color="#059669" />
                <Text style={styles.statCount}>{s.count}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* ── Signatures ── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>ხელმოწერები</Text>
              {signers.length > 0 ? (
                <View style={styles.badgeGreen}>
                  <Text style={styles.badgeGreenText}>{signers.length}</Text>
                </View>
              ) : null}
            </View>
            {signers.length === 0 ? (
              <EmptyState text="ჯერ არ არის ხელმომწერები" />
            ) : (
              <View style={{ gap: 10, marginTop: 10 }}>
                {signers.map(s => (
                  <Swipeable
                    key={s.id}
                    renderRightActions={() => (
                      <Pressable onPress={() => deleteSigner(s)} style={styles.swipeDelete} {...a11y('ხელმომწერის წაშლა', 'ამ ხელმომწერის წაშლა სიიდან', 'button')}>
                        <Ionicons name="trash" size={18} color="#FFFFFF" />
                      </Pressable>
                    )}
                    overshootRight={false}
                  >
                    <Pressable
                      onPress={() => router.push(`/projects/${id}/signer?signerId=${s.id}` as any)}
                      style={styles.listRow}
                      {...a11y(s.full_name, 'ხელმომწერის დეტალების ნახვა', 'button')}
                    >
                      <View style={styles.sigThumb}>
                        {signerPreviews[s.id] ? (
                          <SafeSigImage uri={signerPreviews[s.id]} />
                        ) : (
                          <Ionicons name="person" size={20} color="#9CA3AF" />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.listRowTitle}>{s.full_name}</Text>
                        <Text style={styles.listRowSubtitle}>{SIGNER_ROLE_LABEL[s.role]}</Text>
                        {!s.signature_png_url ? (
                          <View style={styles.missingChip}>
                            <Text style={styles.missingChipText}>ხელმოწერა არ არის</Text>
                          </View>
                        ) : null}
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
                    </Pressable>
                  </Swipeable>
                ))}
              </View>
            )}
            <Pressable
              onPress={() => router.push(`/projects/${id}/signer` as any)}
              style={styles.addBtn}
              {...a11y('ხელმომწერის დამატება', 'ახალი ხელმომწერის დამატება პროექტზე', 'button')}
            >
              <Ionicons name="person-add" size={18} color="#059669" />
              <Text style={styles.addBtnText}>+ ხელმომწერის დამატება</Text>
            </Pressable>
          </View>

          {/* ── Participants ── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>მონაწილეები</Text>
              <View style={styles.badgeGreen}>
                <Text style={styles.badgeGreenText}>
                  {(project?.crew?.length ?? 0) + (inspector ? 1 : 0)}
                </Text>
              </View>
            </View>
            <View style={{ marginTop: 10 }}>
              <CrewList
                inspector={inspector}
                crew={project?.crew ?? []}
                onChange={persistCrew}
              />
            </View>
          </View>

          {/* ── Questionnaires ── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>კითხვარები</Text>
              <View style={styles.badgeGreen}>
                <Text style={styles.badgeGreenText}>{questionnaires.length}</Text>
              </View>
            </View>

            <Pressable onPress={startNewQuestionnaire} style={styles.addBtn} {...a11y('ახალი კითხვარი', 'ახალი კითხვარის დაწყება', 'button')}>
              <Ionicons name="add-circle" size={18} color="#059669" />
              <Text style={styles.addBtnText}>+ ახალი კითხვარი</Text>
            </Pressable>

            {/* Drafts */}
            <View style={{ marginTop: 14 }}>
              <View style={styles.subSectionHeader}>
                <View style={[styles.subDot, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="pencil" size={11} color="#92400E" />
                </View>
                <Text style={styles.subSectionLabel}>დრაფტები</Text>
                <Text style={styles.subSectionCount}>{drafts.length}</Text>
              </View>
              {drafts.length === 0 ? (
                <EmptyState text="ჯერ არ არის დრაფტები" />
              ) : (
                <View style={{ gap: 8, marginTop: 8 }}>
                  {drafts.map(q => {
                    const tpl = templates.find(t => t.id === q.template_id);
                    return (
                      <Swipeable
                        key={q.id}
                        renderRightActions={() => (
                          <Pressable onPress={() => deleteQuestionnaire(q)} style={styles.swipeDelete} {...a11y('კითხვარის წაშლა', 'დრაფტის წაშლა', 'button')}>
                            <Ionicons name="trash" size={18} color="#FFFFFF" />
                          </Pressable>
                        )}
                        overshootRight={false}
                      >
                        <Pressable
                          onPress={() => router.push(`/inspections/${q.id}/wizard` as any)}
                          style={styles.listRow}
                          {...a11y(tpl?.name ?? 'კითხვარი', 'დრაფტის გასაგრძელებლად დააჭირეთ', 'button')}
                        >
                          <View style={[styles.statusIcon, { backgroundColor: '#FEF3C7' }]}>
                            <Ionicons name="pencil" size={14} color="#92400E" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.listRowTitle}>{tpl?.name ?? 'კითხვარი'}</Text>
                            <Text style={styles.listRowSubtitle}>
                              {new Date(q.created_at).toLocaleString('ka')}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
                        </Pressable>
                      </Swipeable>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={styles.sectionDivider} />

            {/* Completed */}
            <View style={{ marginTop: 14 }}>
              <View style={styles.subSectionHeader}>
                <View style={[styles.subDot, { backgroundColor: '#D1FAE5' }]}>
                  <Ionicons name="checkmark" size={11} color="#065F46" />
                </View>
                <Text style={styles.subSectionLabel}>დასრულებული</Text>
                <Text style={styles.subSectionCount}>{completed.length}</Text>
              </View>
              {completed.length === 0 ? (
                <EmptyState text="ჯერ არ არის დასრულებული" />
              ) : (
                <View style={{ gap: 8, marginTop: 8 }}>
                  {completed.map(q => {
                    const tpl = templates.find(t => t.id === q.template_id);
                    return (
                      <Swipeable
                        key={q.id}
                        renderRightActions={() => (
                          <Pressable onPress={() => deleteQuestionnaire(q)} style={styles.swipeDelete} {...a11y('კითხვარის წაშლა', 'დასრულებული კითხვარის წაშლა', 'button')}>
                            <Ionicons name="trash" size={18} color="#FFFFFF" />
                          </Pressable>
                        )}
                        overshootRight={false}
                      >
                        <Pressable
                          onPress={() => router.push(`/inspections/${q.id}` as any)}
                          style={styles.listRow}
                          {...a11y(tpl?.name ?? 'კითხვარი', 'დასრულებული კითხვარის ნახვა', 'button')}
                        >
                          <View style={[styles.statusIcon, { backgroundColor: '#D1FAE5' }]}>
                            <Ionicons name="checkmark-circle" size={14} color="#065F46" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.listRowTitle}>{tpl?.name ?? 'კითხვარი'}</Text>
                            <Text style={styles.listRowSubtitle}>
                              {new Date(q.created_at).toLocaleString('ka')}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
                        </Pressable>
                      </Swipeable>
                    );
                  })}
                </View>
              )}
            </View>
          </View>

          {/* ── Other Projects ── */}
          {otherProjects.length > 0 ? (
            <View style={{ marginTop: 8, gap: 8 }}>
              <Text style={styles.otherHeader}>სხვა პროექტები</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingRight: 8 }}
              >
                {otherProjects.slice(0, 10).map(op => {
                  const av = projectAvatar(op.id);
                  return (
                    <Pressable
                      key={op.id}
                      onPress={() => router.push(`/projects/${op.id}` as any)}
                      style={styles.otherChip}
                      {...a11y(op.name, 'სხვა პროექტზე გადასვლა', 'button')}
                    >
                      <View style={[styles.otherChipIcon, { backgroundColor: av.color + '22' }]}>
                        <Text style={{ fontSize: 14 }}>{av.emoji}</Text>
                      </View>
                      <Text style={styles.otherChipText} numberOfLines={1}>
                        {op.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}
        </ScrollView>
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

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="document-text-outline" size={28} color="#D1D5DB" />
      <Text style={styles.emptyStateText}>{text}</Text>
    </View>
  );
}

function SafeSigImage({ uri }: { uri: string }) {
  const [err, setErr] = useState(false);
  if (err) return <Ionicons name="person" size={20} color="#9CA3AF" />;
  return (
    <Image
      source={{ uri }}
      style={{ width: '100%', height: '100%' }}
      resizeMode="contain"
      onError={() => setErr(true)}
    />
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
  const [pin, setPin] = useState<LatLng | null>(null);
  const [busy, setBusy] = useState(false);

  // Sync when project changes / modal opens
  useFocusEffect(
    useCallback(() => {
      if (visible && project) {
        setName(project.name);
        setCompany(project.company_name ?? '');
        setAddress(project.address ?? '');
        setPin(
          project.latitude != null && project.longitude != null
            ? { latitude: project.latitude, longitude: project.longitude }
            : null,
        );
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
        latitude: pin?.latitude ?? null,
        longitude: pin?.longitude ?? null,
      }));
      onSaved(saved);
    } catch (e) {
      toast.error(toErrorMessage(e, 'შენახვა ვერ მოხერხდა'));
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
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#1F2937', flex: 1 }}>
                რედაქტირება
              </Text>
              <Pressable onPress={onClose} hitSlop={10} {...a11y('დახურვა', 'რედაქტირების ფანჯრის დახურვა', 'button')}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </Pressable>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingTop: 8, paddingBottom: 8 }}
              style={{ maxHeight: '78%' }}
            >
              <Field label="სახელი">
                <Input value={name} onChangeText={setName} />
              </Field>
              <Field label="კომპანია">
                <Input value={company} onChangeText={setCompany} />
              </Field>
              <Field label="მისამართი">
                <MapPicker
                  value={pin}
                  onChange={setPin}
                  address={address}
                  onAddressChange={setAddress}
                />
              </Field>
            </ScrollView>
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
  // ── Hero ──
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  heroMetaText: {
    fontSize: 14,
    color: '#6B7280',
    flexShrink: 1,
  },
  mapWrap: {
    marginTop: 12,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  // ── Stats ──
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statCount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginTop: 2,
  },

  // ── Section Cards ──
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  badgeGreen: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeGreenText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginTop: 14,
  },

  // ── List Rows ──
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  listRowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  listRowSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  sigThumb: {
    width: 44,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  missingChip: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  missingChipText: {
    color: '#92400E',
    fontSize: 10,
    fontWeight: '700',
  },

  // ── Sub-sections ──
  subSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subSectionLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subSectionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  statusIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Actions ──
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#059669',
    marginTop: 12,
  },
  addBtnText: {
    color: '#059669',
    fontWeight: '600',
    fontSize: 14,
  },

  // ── Empty State ──
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  // ── Swipe ──
  swipeDelete: {
    width: 72,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    borderRadius: 12,
  },

  // ── Modal ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#F5F5F0',
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
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // ── Other Projects ──
  otherHeader: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  otherChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  otherChipIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otherChipText: {
    fontSize: 12,
    color: '#6B7280',
    flexShrink: 1,
  },
});
