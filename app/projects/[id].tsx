import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { MapPreview } from '../../components/MapPreview';
import { useBottomSheet } from '../../components/BottomSheet';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Button, Field, Input } from '../../components/ui';
import { Skeleton, SkeletonCard, SkeletonListCard } from '../../components/Skeleton';
import { MapPicker, type LatLng } from '../../components/MapPicker';
import { UploadedFilesSection } from '../../components/UploadedFilesSection';
import {
  projectsApi,
  projectFilesApi,
  questionnairesApi,
  templatesApi,
} from '../../lib/services';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { useToast } from '../../lib/toast';
import { getStorageImageDisplayUrl } from '../../lib/imageUrl';
import { theme } from '../../lib/theme';
import { toErrorMessage } from '../../lib/logError';
import { friendlyError } from '../../lib/errorMap';
import { formatShortDateTime } from '../../lib/formatDate';
import type { CrewMember, Project, ProjectFile, ProjectSigner, Questionnaire, Template } from '../../types/models';
import { SIGNER_ROLE_LABEL } from '../../types/models';
import { CrewList, CrewMemberForm } from '../../components/CrewSection';
import { useSession } from '../../lib/session';
import { a11y } from '../../lib/accessibility';
import { TourGuide, type TourStep } from '../../components/TourGuide';

function projectInitials(name: string | undefined): string {
  if (!name) return '—';
  const trimmed = name.trim();
  if (!trimmed) return '—';
  // Array.from splits by code point so emoji / surrogate pairs aren't cut in half.
  return Array.from(trimmed).slice(0, 2).join('').toLocaleUpperCase('ka-GE');
}

export default function ProjectDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const showActionSheetWithOptions = useBottomSheet();
  const toast = useToast();
  const session = useSession();
  const insets = useSafeAreaInsets();

  const [project, setProject] = useState<Project | null>(null);
  const [signers, setSigners] = useState<ProjectSigner[]>([]);
  const [signerPreviews, setSignerPreviews] = useState<Record<string, string>>({});
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [filesBusy, setFilesBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  // Flips true after the first fetch finishes. Drives the skeleton → content
  // swap; refocus doesn't re-show skeletons once we have data.
  const [loaded, setLoaded] = useState(false);

  // Project screen onboarding tour
  const heroRef = useRef<View>(null);
  const participantsRef = useRef<View>(null);
  const filesRef = useRef<View>(null);
  const questionnairesRef = useRef<View>(null);
  const fabRef = useRef<View>(null);
  const tourSteps: TourStep[] = useMemo(
    () => [
      {
        targetRef: heroRef,
        title: 'პროექტის ინფო',
        body: 'შეეხე ბარათს რედაქტირებისთვის',
        position: 'bottom',
      },
      {
        targetRef: participantsRef,
        title: 'მონაწილეები',
        body: 'დაამატე გუნდი სანამ შემოწმებას დაიწყებ',
        position: 'bottom',
      },
      {
        targetRef: filesRef,
        title: 'ფაილები',
        body: 'აქ შეგიძლია დაურთო პროექტის დოკუმენტები',
        position: 'bottom',
      },
      {
        targetRef: questionnairesRef,
        title: 'კითხვარები',
        body: 'შენი შემოწმებების ისტორია',
        position: 'top',
      },
      {
        targetRef: fabRef,
        title: 'ახალი შემოწმება',
        body: 'დააჭირე და დაიწყე ახალი შემოწმება',
        position: 'top',
      },
    ],
    [],
  );

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
        toast.error(friendlyError(e, 'მონაწილე ვერ შეინახა'));
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
      { title: 'აირჩიეთ შაბლონი', options, cancelButtonIndex: options.length - 1 },
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
          toast.error(friendlyError(e, 'შექმნა ვერ მოხერხდა'));
        }
      },
    );
  };

  const deleteQuestionnaire = (q: Questionnaire) => {
    Alert.alert('წაშლა?', 'ინსპექცია სამუდამოდ წაიშლება.', [
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
            toast.error(friendlyError(e, 'ვერ წაიშალა'));
          }
        },
      },
    ]);
  };

  const openAddParticipant = () => {
    if (!project) return;
    const options = ['მონაწილე', 'ხელმომწერა', 'გაუქმება'];
    showActionSheetWithOptions(
      { title: 'დამატება', options, cancelButtonIndex: options.length - 1 },
      idx => {
        if (idx == null || idx === options.length - 1) return;
        if (idx === 1) {
          router.push(`/projects/${id}/signer` as any);
          return;
        }
        // Add crew member via shared form
        showActionSheetWithOptions(
          {
            content: ({ dismiss }) => (
              <CrewMemberForm
                onSave={member => {
                  void persistCrew([...(project.crew ?? []), member]);
                  dismiss();
                }}
                onCancel={dismiss}
              />
            ),
          },
        );
      },
    );
  };

  const uploadFile = async () => {
    if (!id) return;
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.85,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      setFilesBusy(true);
      const created = await projectFilesApi.upload({
        projectId: id,
        fileUri: asset.uri,
        name: asset.fileName ?? `file-${Date.now()}`,
        mimeType: asset.mimeType ?? null,
        sizeBytes: asset.fileSize ?? null,
      });
      setFiles(prev => [created, ...prev]);
      toast.success('აიტვირთა');
    } catch (e) {
      toast.error(friendlyError(e, 'ატვირთვა ვერ მოხერხდა'));
    } finally {
      setFilesBusy(false);
    }
  };

  const openFile = async (f: ProjectFile) => {
    try {
      const url = await projectFilesApi.signedUrl(f);
      await Linking.openURL(url);
    } catch {
      toast.error('ფაილი ვერ გაიხსნა');
    }
  };

  const deleteFile = (f: ProjectFile) => {
    Alert.alert('წაშლა?', f.name, [
      { text: 'გაუქმება', style: 'cancel' },
      {
        text: 'წაშლა',
        style: 'destructive',
        onPress: async () => {
          try {
            await projectFilesApi.remove(f);
            setFiles(prev => prev.filter(x => x.id !== f.id));
            toast.success('წაიშალა');
          } catch (e) {
            toast.error(friendlyError(e, 'ვერ წაიშალა'));
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
            toast.error(friendlyError(e, 'ვერ წაიშალა'));
          }
        },
      },
    ]);
  };

  if (!loaded && !project) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <Stack.Screen options={{ headerShown: true, title: 'პროექტი', headerBackTitle: 'პროექტები' }} />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 14 }}>
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
      </View>
    );
  }

  return (
    <TourGuide tourId="project_screen_v1" steps={tourSteps}>
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'პროექტი',
          headerBackTitle: 'პროექტები',
          headerTitleStyle: { fontSize: 18, fontWeight: '700', color: theme.colors.ink },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.accent,
        }}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          // Reserve room for the absolutely-positioned FAB (height 56 + bottom 28 + safe area)
          paddingBottom: insets.bottom + 110,
          gap: 16,
        }}
      >
          {/* ── Hero / Project Details Card ── */}
          <View ref={heroRef} collapsable={false} style={styles.heroCard}>
            <Pressable
              onPress={() => setEditing(true)}
              hitSlop={10}
              style={styles.heroEditBtn}
              {...a11y('რედაქტირება', 'პროექტის დეტალების შეცვლა', 'button')}
            >
              <Ionicons name="create-outline" size={20} color={theme.colors.accent} />
            </Pressable>

            <View style={styles.heroRow}>
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoText}>{projectInitials(project?.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroName}>{project?.name ?? '—'}</Text>
                {project?.company_name ? (
                  <View style={styles.heroMetaRow}>
                    <Ionicons name="business-outline" size={14} color={theme.colors.inkSoft} />
                    <Text style={styles.heroMetaText}>{project.company_name}</Text>
                  </View>
                ) : null}
                {project?.address ? (
                  <View style={styles.heroMetaRow}>
                    <Ionicons name="location-outline" size={14} color={theme.colors.inkSoft} />
                    <Text style={styles.heroMetaText}>{project.address}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {project?.latitude != null && project?.longitude != null ? (
              <MapPreview
                latitude={project.latitude}
                longitude={project.longitude}
                pinColor={theme.colors.accent}
                style={styles.mapWrap}
              />
            ) : null}

            {/* Uploaded files — bottom of project details, after map */}
            <View ref={filesRef} collapsable={false} style={{ marginTop: 14 }}>
              <UploadedFilesSection
                files={files}
                busy={filesBusy}
                onUpload={uploadFile}
                onOpen={openFile}
                onDelete={deleteFile}
              />
            </View>
          </View>

          {/* ── Participants (merged: crew + signers) ── */}
          <View ref={participantsRef} collapsable={false} style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>მონაწილეები</Text>
              <View style={styles.badgeGreen}>
                <Text style={styles.badgeGreenText}>
                  {(project?.crew?.length ?? 0) + (inspector ? 1 : 0) + signers.length}
                </Text>
              </View>
            </View>
            <View style={{ marginTop: 10 }}>
              <CrewList
                inspector={inspector}
                crew={project?.crew ?? []}
                onChange={persistCrew}
                hideAdd
              />
            </View>

            {signers.length > 0 ? (
              <View style={{ gap: 10, marginTop: 12 }}>
                {signers.map(s => (
                  <Swipeable
                    key={s.id}
                    renderRightActions={() => (
                      <Pressable onPress={() => deleteSigner(s)} style={styles.swipeDelete} {...a11y('ხელმომწერის წაშლა', 'ამ ხელმომწერის წაშლა სიიდან', 'button')}>
                        <Ionicons name="trash" size={18} color={theme.colors.white} />
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
                          <Ionicons name="person" size={20} color={theme.colors.inkFaint} />
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
                      <Ionicons name="chevron-forward" size={18} color={theme.colors.borderStrong} />
                    </Pressable>
                  </Swipeable>
                ))}
              </View>
            ) : null}

            <Pressable
              onPress={openAddParticipant}
              style={styles.addBtn}
              {...a11y('დამატება', 'მონაწილის ან ხელმომწერის დამატება', 'button')}
            >
              <Ionicons name="person-add" size={18} color={theme.colors.accent} />
              <Text style={styles.addBtnText}>+ დამატება</Text>
            </Pressable>
          </View>

          {/* ── Questionnaires ── */}
          <View ref={questionnairesRef} collapsable={false} style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>კითხვარები</Text>
              <View style={styles.badgeGreen}>
                <Text style={styles.badgeGreenText}>{questionnaires.length}</Text>
              </View>
            </View>

            {drafts.length > 0 ? (
              <>
                <View style={{ marginTop: 10 }}>
                  <View style={styles.subSectionHeader}>
                    <View style={[styles.subDot, { backgroundColor: theme.colors.semantic.warningSoft }]}>
                      <Ionicons name="pencil" size={11} color={'#92400E'} />
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
                            <Pressable onPress={() => deleteQuestionnaire(q)} style={styles.swipeDelete} {...a11y('ინსპექციას წაშლა', 'დრაფტის წაშლა', 'button')}>
                              <Ionicons name="trash" size={18} color={theme.colors.white} />
                            </Pressable>
                          )}
                          overshootRight={false}
                        >
                          <Pressable
                            onPress={() => router.push(`/inspections/${q.id}/wizard` as any)}
                            style={styles.listRow}
                            {...a11y(tpl?.name ?? 'ინსპექცია', 'დრაფტის გასაგრძელებლად დააჭირეთ', 'button')}
                          >
                            <View style={[styles.statusIcon, { backgroundColor: theme.colors.semantic.warningSoft }]}>
                              <Ionicons name="pencil" size={14} color={'#92400E'} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.listRowTitle}>{tpl?.name ?? 'ინსპექცია'}</Text>
                              <Text style={styles.listRowSubtitle}>
                                {formatShortDateTime(q.created_at)}
                              </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={theme.colors.borderStrong} />
                          </Pressable>
                        </Swipeable>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.sectionDivider} />
              </>
            ) : null}

            {/* Completed */}
            <View style={{ marginTop: 14 }}>
              <View style={styles.subSectionHeader}>
                <View style={[styles.subDot, { backgroundColor: theme.colors.semantic.successSoft }]}>
                  <Ionicons name="checkmark" size={11} color={theme.colors.primary[700]} />
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
                          <Pressable onPress={() => deleteQuestionnaire(q)} style={styles.swipeDelete} {...a11y('ინსპექციას წაშლა', 'დასრულებული ინსპექციას წაშლა', 'button')}>
                            <Ionicons name="trash" size={18} color={theme.colors.white} />
                          </Pressable>
                        )}
                        overshootRight={false}
                      >
                        <Pressable
                          onPress={() => router.push(`/inspections/${q.id}` as any)}
                          style={styles.listRow}
                          {...a11y(tpl?.name ?? 'ინსპექცია', 'დასრულებული ინსპექციას ნახვა', 'button')}
                        >
                          <View style={[styles.statusIcon, { backgroundColor: theme.colors.semantic.successSoft }]}>
                            <Ionicons name="checkmark-circle" size={14} color={theme.colors.primary[700]} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.listRowTitle}>{tpl?.name ?? 'ინსპექცია'}</Text>
                            <Text style={styles.listRowSubtitle}>
                              {formatShortDateTime(q.created_at)}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color={theme.colors.borderStrong} />
                        </Pressable>
                      </Swipeable>
                    );
                  })}
                </View>
              )}
            </View>
          </View>

        </ScrollView>

        {/* ── FAB: new questionnaire ── */}
        <Pressable
          ref={fabRef}
          onPress={startNewQuestionnaire}
          style={({ pressed }) => [
            styles.fab,
            { bottom: insets.bottom + 20 },
            pressed && { opacity: 0.85 },
          ]}
          {...a11y('ახალი ინსპექცია', 'ახალი ინსპექციას დაწყება', 'button')}
        >
          <Ionicons name="add" size={30} color={theme.colors.white} />
        </Pressable>

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
    </View>
    </TourGuide>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="document-text-outline" size={28} color={theme.colors.borderStrong} />
      <Text style={styles.emptyStateText}>{text}</Text>
    </View>
  );
}

function SafeSigImage({ uri }: { uri: string }) {
  const [err, setErr] = useState(false);
  if (err) return <Ionicons name="person" size={20} color={theme.colors.inkFaint} />;
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
      toast.error(friendlyError(e, 'შენახვა ვერ მოხერხდა'));
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
              <Pressable onPress={onClose} hitSlop={10} {...a11y('დახურვა', 'რედაქტირების ფანჯრის დახურვა', 'button')}>
                <Ionicons name="close" size={22} color={theme.colors.inkSoft} />
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
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    shadowColor: theme.colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroEditBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.accentSoft,
    zIndex: 5,
  },
  mapWrap: {
    marginTop: 14,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  logoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: '800',
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.ink,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  heroMetaText: {
    fontSize: 14,
    color: theme.colors.inkSoft,
    flexShrink: 1,
  },

  // ── FAB ──
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },

  // ── Section Cards ──
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: theme.colors.ink,
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
    color: theme.colors.ink,
  },
  badgeGreen: {
    backgroundColor: theme.colors.semantic.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeGreenText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary[700],
  },
  sectionDivider: {
    height: 1,
    backgroundColor: theme.colors.surfaceSecondary,
    marginTop: 14,
  },

  // ── List Rows ──
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 12,
  },
  listRowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.ink,
  },
  listRowSubtitle: {
    fontSize: 12,
    color: theme.colors.inkSoft,
    marginTop: 2,
  },
  sigThumb: {
    width: 44,
    height: 44,
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  missingChip: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.semantic.warningSoft,
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
    color: theme.colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subSectionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.inkFaint,
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
    borderColor: theme.colors.accent,
    marginTop: 12,
  },
  addBtnText: {
    color: theme.colors.accent,
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
    color: theme.colors.inkFaint,
    fontWeight: '500',
  },

  // ── Swipe ──
  swipeDelete: {
    width: 72,
    backgroundColor: theme.colors.danger,
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
    backgroundColor: theme.colors.borderStrong,
    alignSelf: 'center',
    marginBottom: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

});
