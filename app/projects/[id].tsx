import { useCallback, useMemo, useState } from 'react';
import {
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
import * as DocumentPicker from 'expo-document-picker';
import * as Linking from 'expo-linking';
import { useBottomSheet } from '../../components/BottomSheet';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Button, Card, Field, Input, Screen } from '../../components/ui';
import { Skeleton, SkeletonCard, SkeletonListCard } from '../../components/Skeleton';
import { MapPicker, type LatLng } from '../../components/MapPicker';
import {
  projectFilesApi,
  projectsApi,
  questionnairesApi,
  templatesApi,
} from '../../lib/services';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { useToast } from '../../lib/toast';
import { getStorageImageDisplayUrl } from '../../lib/imageUrl';
import { toErrorMessage } from '../../lib/logError';
import { scheduleDelete } from '../../lib/pendingDeletes';
import type { CrewMember, Project, ProjectFile, ProjectSigner, Questionnaire, Template } from '../../types/models';
import { SIGNER_ROLE_LABEL } from '../../types/models';
import { CrewList } from '../../components/CrewSection';
import { ProjectLogo } from '../../components/ProjectLogo';
import { UploadedFilesSection } from '../../components/UploadedFilesSection';
import { formatShortDateTime } from '../../lib/formatDate';
import { useSession } from '../../lib/session';

const BRAND_GREEN = '#1D9E75';

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
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [editing, setEditing] = useState(false);
  // Flips true after the first fetch finishes. Drives the skeleton → content
  // swap; refocus doesn't re-show skeletons once we have data.
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [p, s, q, t, f] = await Promise.all([
      projectsApi.getById(id).catch(() => null),
      projectsApi.signers(id).catch(() => []),
      questionnairesApi.listByProject(id).catch(() => []),
      templatesApi.list().catch(() => []),
      projectFilesApi.list(id).catch(() => [] as ProjectFile[]),
    ]);
    setProject(p);
    setSigners(s);
    setQuestionnaires(q);
    setTemplates(t);
    setFiles(f);

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

  const pickAndUploadFile = useCallback(async () => {
    if (!id) return;
    try {
      const res = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      setUploadingFile(true);
      const created = await projectFilesApi.upload({
        projectId: id,
        fileUri: asset.uri,
        name: asset.name ?? 'file',
        mimeType: asset.mimeType ?? null,
        sizeBytes: asset.size ?? null,
      });
      setFiles(prev => [created, ...prev]);
      toast.success('ფაილი ატვირთულია');
    } catch (e) {
      toast.error(toErrorMessage(e, 'ატვირთვა ვერ მოხერხდა'));
    } finally {
      setUploadingFile(false);
    }
  }, [id, toast]);

  const openFile = useCallback(
    async (f: ProjectFile) => {
      try {
        const url = await projectFilesApi.signedUrl(f);
        await Linking.openURL(url);
      } catch (e) {
        toast.error(toErrorMessage(e, 'ფაილის გახსნა ვერ მოხერხდა'));
      }
    },
    [toast],
  );

  const deleteFile = useCallback(
    (f: ProjectFile) => {
      setFiles(prev => prev.filter(x => x.id !== f.id));
      scheduleDelete({
        message: `${f.name} — წაიშალა`,
        toast,
        onUndo: () => setFiles(prev => [f, ...prev.filter(x => x.id !== f.id)]),
        onExecute: async () => {
          try {
            await projectFilesApi.remove(f);
          } catch (e) {
            setFiles(prev => [f, ...prev.filter(x => x.id !== f.id)]);
            toast.error(toErrorMessage(e, 'წაშლა ვერ მოხერხდა'));
          }
        },
      });
    },
    [toast],
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
    setQuestionnaires(prev => prev.filter(x => x.id !== q.id));
    scheduleDelete({
      message: 'კითხვარი წაიშალა',
      toast,
      onUndo: () => setQuestionnaires(prev => [q, ...prev.filter(x => x.id !== q.id)]),
      onExecute: async () => {
        try {
          await questionnairesApi.remove(q.id);
        } catch (e) {
          setQuestionnaires(prev => [q, ...prev.filter(x => x.id !== q.id)]);
          toast.error(toErrorMessage(e, 'ვერ წაიშალა'));
        }
      },
    });
  };

  const deleteSigner = (s: ProjectSigner) => {
    setSigners(prev => prev.filter(x => x.id !== s.id));
    scheduleDelete({
      message: `${s.full_name} — წაიშალა`,
      toast,
      onUndo: () => setSigners(prev => [s, ...prev.filter(x => x.id !== s.id)]),
      onExecute: async () => {
        try {
          await projectsApi.deleteSigner(s.id);
        } catch (e) {
          setSigners(prev => [s, ...prev.filter(x => x.id !== s.id)]);
          toast.error(toErrorMessage(e, 'ვერ წაიშალა'));
        }
      },
    });
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

  const participantsCount =
    signers.length + (project?.crew?.length ?? 0) + (inspector ? 1 : 0);

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
        }}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 16 }}>
          {/* ── Project Card ── */}
          <View style={styles.heroCard}>
            <View style={styles.heroRow}>
              <ProjectLogo uri={project?.logo_url} name={project?.name} size={48} />
              <View style={{ flex: 1, gap: 6 }}>
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
              </View>
              <Pressable
                onPress={() => setEditing(true)}
                hitSlop={10}
                style={styles.heroEditBtn}
                accessibilityLabel="რედაქტირება"
              >
                <Ionicons name="create-outline" size={20} color={BRAND_GREEN} />
              </Pressable>
            </View>
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
                    pinColor={BRAND_GREEN}
                  />
                </MapView>
              </View>
            ) : null}
            <View style={{ marginTop: 14 }}>
              <UploadedFilesSection
                files={files}
                busy={uploadingFile}
                onUpload={pickAndUploadFile}
                onOpen={openFile}
                onDelete={deleteFile}
              />
            </View>
          </View>

          {/* ── Participants (signers + crew merged) ── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>მონაწილეები</Text>
              {participantsCount > 0 ? (
                <View style={styles.badgeGreen}>
                  <Text style={styles.badgeGreenText}>{participantsCount}</Text>
                </View>
              ) : null}
            </View>

            {signers.length > 0 ? (
              <View style={{ gap: 10, marginTop: 10 }}>
                {signers.map(s => (
                  <Swipeable
                    key={s.id}
                    renderRightActions={() => (
                      <Pressable onPress={() => deleteSigner(s)} style={styles.swipeDelete}>
                        <Ionicons name="trash" size={18} color="#FFFFFF" />
                      </Pressable>
                    )}
                    overshootRight={false}
                  >
                    <Pressable
                      onPress={() => router.push(`/projects/${id}/signer?signerId=${s.id}` as any)}
                      style={styles.listRow}
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
            ) : null}

            <Pressable
              onPress={() => router.push(`/projects/${id}/signer` as any)}
              style={styles.addBtn}
            >
              <Ionicons name="person-add" size={18} color={BRAND_GREEN} />
              <Text style={styles.addBtnText}>+ ხელმომწერის დამატება</Text>
            </Pressable>

            <View style={{ marginTop: 14 }}>
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

            {drafts.length > 0 ? (
              <View style={{ marginTop: 14 }}>
                <View style={styles.subSectionHeader}>
                  <View style={[styles.subDot, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="pencil" size={11} color="#92400E" />
                  </View>
                  <Text style={styles.subSectionLabel}>დრაფტები</Text>
                  <Text style={styles.subSectionCount}>{drafts.length}</Text>
                </View>
                <View style={{ gap: 8, marginTop: 8 }}>
                  {drafts.map(q => {
                    const tpl = templates.find(t => t.id === q.template_id);
                    return (
                      <Swipeable
                        key={q.id}
                        renderRightActions={() => (
                          <Pressable onPress={() => deleteQuestionnaire(q)} style={styles.swipeDelete}>
                            <Ionicons name="trash" size={18} color="#FFFFFF" />
                          </Pressable>
                        )}
                        overshootRight={false}
                      >
                        <Pressable
                          onPress={() => router.push(`/inspections/${q.id}/wizard` as any)}
                          style={styles.listRow}
                        >
                          <View style={[styles.statusIcon, { backgroundColor: '#FEF3C7' }]}>
                            <Ionicons name="pencil" size={14} color="#92400E" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.listRowTitle}>{tpl?.name ?? 'კითხვარი'}</Text>
                            <Text style={styles.listRowSubtitle}>
                              {formatShortDateTime(q.created_at)}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
                        </Pressable>
                      </Swipeable>
                    );
                  })}
                </View>
                <View style={styles.sectionDivider} />
              </View>
            ) : null}

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
                          <Pressable onPress={() => deleteQuestionnaire(q)} style={styles.swipeDelete}>
                            <Ionicons name="trash" size={18} color="#FFFFFF" />
                          </Pressable>
                        )}
                        overshootRight={false}
                      >
                        <Pressable
                          onPress={() => router.push(`/inspections/${q.id}` as any)}
                          style={styles.listRow}
                        >
                          <View style={[styles.statusIcon, { backgroundColor: '#D1FAE5' }]}>
                            <Ionicons name="checkmark-circle" size={14} color="#065F46" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.listRowTitle}>{tpl?.name ?? 'კითხვარი'}</Text>
                            <Text style={styles.listRowSubtitle}>
                              {formatShortDateTime(q.created_at)}
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
        </ScrollView>

        {/* ── FAB ── */}
        <Pressable
          onPress={startNewQuestionnaire}
          style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
          accessibilityLabel="ახალი კითხვარი"
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </Pressable>
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
              <Pressable onPress={onClose} hitSlop={10}>
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
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  heroName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroMetaText: {
    fontSize: 14,
    color: '#6B7280',
    flexShrink: 1,
  },
  heroEditBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
  },
  mapWrap: {
    marginTop: 14,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    borderColor: BRAND_GREEN,
    marginTop: 12,
  },
  addBtnText: {
    color: BRAND_GREEN,
    fontWeight: '600',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
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

});
