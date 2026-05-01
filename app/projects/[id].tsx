import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { SheetLayout } from '../../components/SheetLayout';
import { FormField } from '../../components/FormField';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { MapPreview } from '../../components/MapPreview';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
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
  incidentsApi,
  reportsApi,
} from '../../lib/services';
import {
  useProject,
  useInspectionsByProject,
  useTemplates,
  useProjectFiles,
  useIncidentsByProject,
  useBriefingsByProject,
  useReportsByProject,
} from '../../lib/apiHooks';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { useToast } from '../../lib/toast';
import { getStorageImageDisplayUrl } from '../../lib/imageUrl';
import { useTheme } from '../../lib/theme';

import { toErrorMessage } from '../../lib/logError';
import { friendlyError } from '../../lib/errorMap';
import { formatShortDateTime } from '../../lib/formatDate';
import type { Briefing, CrewMember, Incident, IncidentType, Project, ProjectFile, Questionnaire, Report, Template } from '../../types/models';
import { INCIDENT_TYPE_LABEL } from '../../types/models';
import { briefingsApi } from '../../lib/briefingsApi';
import { RoleSlotList } from '../../components/RoleSlotList';
import { ProjectAvatar } from '../../components/ProjectAvatar';
import { pickProjectLogo } from '../../lib/projectLogo';
import { useSession } from '../../lib/session';
import { a11y } from '../../lib/accessibility';
import { TourGuide, type TourStep } from '../../components/TourGuide';
import { useTranslation } from 'react-i18next';

export default function ProjectDetail() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const showActionSheetWithOptions = useBottomSheet();
  const toast = useToast();
  const session = useSession();
  const insets = useSafeAreaInsets();

  const [project, setProject] = useState<Project | null>(null);
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [filesBusy, setFilesBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  // React Query hooks provide cached data instantly + background refetch.
  // We sync their results into local state so existing mutations (crew edit,
  // file upload, etc.) continue to work via setProject / setFiles.
  const projectQ = useProject(id);
  const questionnairesQ = useInspectionsByProject(id);
  const templatesQ = useTemplates();
  const filesQ = useProjectFiles(id);
  const incidentsQ = useIncidentsByProject(id);
  const briefingsQ = useBriefingsByProject(id);
  const reportsQ = useReportsByProject(id);

  useEffect(() => {
    if (projectQ.data !== undefined) setProject(projectQ.data);
  }, [projectQ.data]);
  useEffect(() => {
    if (questionnairesQ.data !== undefined) setQuestionnaires(questionnairesQ.data);
  }, [questionnairesQ.data]);
  useEffect(() => {
    if (templatesQ.data !== undefined) setTemplates(templatesQ.data);
  }, [templatesQ.data]);
  useEffect(() => {
    if (filesQ.data !== undefined) setFiles(filesQ.data);
  }, [filesQ.data]);
  useEffect(() => {
    if (incidentsQ.data !== undefined) setIncidents(incidentsQ.data);
  }, [incidentsQ.data]);
  useEffect(() => {
    if (briefingsQ.data !== undefined) setBriefings(briefingsQ.data);
  }, [briefingsQ.data]);
  useEffect(() => {
    if (reportsQ.data !== undefined) setReports(reportsQ.data);
  }, [reportsQ.data]);
  useEffect(() => {
    const anyLoading = projectQ.isLoading || questionnairesQ.isLoading || templatesQ.isLoading
      || filesQ.isLoading || incidentsQ.isLoading || briefingsQ.isLoading || reportsQ.isLoading;
    if (!anyLoading) setLoaded(true);
  }, [projectQ.isLoading, questionnairesQ.isLoading, templatesQ.isLoading, filesQ.isLoading,
      incidentsQ.isLoading, briefingsQ.isLoading, reportsQ.isLoading]);

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
        title: t('projects.tourProjectInfo'),
        body: t('projects.tourProjectInfoBody'),
        position: 'bottom',
      },
      {
        targetRef: participantsRef,
        title: t('projects.tourCrew'),
        body: t('projects.tourCrewBody'),
        position: 'bottom',
      },
      {
        targetRef: filesRef,
        title: t('projects.tourFiles'),
        body: t('projects.tourFilesBody'),
        position: 'bottom',
      },
      {
        targetRef: questionnairesRef,
        title: t('projects.tourHistory'),
        body: t('projects.tourHistoryBody'),
        position: 'top',
      },
      {
        targetRef: fabRef,
        title: t('projects.tourNewInspection'),
        body: t('projects.tourNewInspectionBody'),
        position: 'top',
      },
    ],
    [t],
  );

  // Data now flows through React Query — cached, deduplicated, and
  // background-refreshed. No more useFocusEffect hammering Supabase
  // on every tab switch.

  // Inspector row (logged-in expert) — derived from auth, never persisted
  // into projects.crew. The crew list itself is just the manual entries.
  const inspector = useMemo(() => {
    if (session.state.status !== 'signedIn') return null;
    const u = session.state.user;
    const fallback = session.state.session.user.email ?? t('projects.inspectorFallback');
    const name = u
      ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || fallback
      : fallback;
    return {
      name,
      role: t('projects.inspectorFallback'),
      signaturePath: u?.saved_signature_url ?? null,
    };
  }, [session.state, t]);

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
        toast.error(friendlyError(e, t('projects.memberSaveError')));
      }
    },
    [project, toast],
  );

  // ── Section previews (max 3, sorted by date desc) ──
  const questionnairesSorted = useMemo(
    () =>
      [...questionnaires].sort(
        (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
      ),
    [questionnaires],
  );
  const questionnairesPreview = useMemo(
    () => questionnairesSorted.slice(0, 3),
    [questionnairesSorted],
  );
  const incidentsSorted = useMemo(
    () =>
      [...incidents].sort(
        (a, b) => +new Date(b.date_time) - +new Date(a.date_time),
      ),
    [incidents],
  );
  const incidentsPreview = useMemo(
    () => incidentsSorted.slice(0, 3),
    [incidentsSorted],
  );
  const briefingsSorted = useMemo(
    () =>
      [...briefings].sort(
        (a, b) => +new Date(b.dateTime) - +new Date(a.dateTime),
      ),
    [briefings],
  );
  const briefingsPreview = useMemo(
    () => briefingsSorted.slice(0, 3),
    [briefingsSorted],
  );
  const filesSorted = useMemo(
    () =>
      [...files].sort(
        (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
      ),
    [files],
  );
  const filesPreview = useMemo(() => filesSorted.slice(0, 3), [filesSorted]);
  const reportsSorted = useMemo(
    () =>
      [...reports].sort(
        (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
      ),
    [reports],
  );
  const reportsPreview = useMemo(() => reportsSorted.slice(0, 3), [reportsSorted]);
  const overflowReports = useMemo(() => reportsSorted.slice(3), [reportsSorted]);

  const overflowQuestionnaires = useMemo(
    () => questionnairesSorted.slice(3),
    [questionnairesSorted],
  );
  const overflowIncidents = useMemo(
    () => incidentsSorted.slice(3),
    [incidentsSorted],
  );
  const overflowBriefings = useMemo(
    () => briefingsSorted.slice(3),
    [briefingsSorted],
  );
  const overflowFiles = useMemo(() => filesSorted.slice(3), [filesSorted]);

  const startNewQuestionnaire = () => {
    const system = templates.filter(tpl => tpl.is_system);
    if (system.length === 0) {
      toast.error(t('projects.templateMissing'));
      return;
    }
    if (system.length === 1 && id) {
      void questionnairesApi.create({ projectId: id, templateId: system[0].id })
        .then(q => router.push(`/inspections/${q.id}/wizard` as any))
        .catch(e => toast.error(friendlyError(e, t('errors.createFailed'))));
      return;
    }
    const options = [...system.map(tpl => tpl.name), t('common.cancel')];
    showActionSheetWithOptions(
      { title: t('projects.chooseTemplateTitle'), options, cancelButtonIndex: options.length - 1 },
      async idx => {
        if (idx == null || idx === options.length - 1 || !id) return;
        const tpl = system[idx];
        try {
          const q = (await questionnairesApi.create({
            projectId: id,
            templateId: tpl.id,
          }));
          router.push(`/inspections/${q.id}/wizard` as any);
        } catch (e) {
          toast.error(friendlyError(e, t('errors.createFailed')));
        }
      },
    );
  };

  const deleteQuestionnaire = (q: Questionnaire) => {
    showActionSheetWithOptions(
      {
        title: 'დარწმუნებული ხართ?',
        options: ['დიახ, წაშლა', 'გაუქმება'],
        cancelButtonIndex: 1,
        destructiveButtonIndex: 0,
      },
      async idx => {
        if (idx !== 0) return;
        try {
          await questionnairesApi.remove(q.id);
          setQuestionnaires(prev => prev.filter(x => x.id !== q.id));
          toast.success(t('notifications.deleted'));
        } catch (e) {
          toast.error(friendlyError(e, t('errors.deleteFailed')));
        }
      },
    );
  };

  const onEditLogo = async () => {
    if (!project) return;
    const next = await pickProjectLogo();
    if (!next) return;
    const prev = project;
    setProject({ ...project, logo: next });
    try {
      const saved = await projectsApi.update(project.id, { logo: next });
      setProject(saved);
      toast.success(t('projects.logoUpdated'));
    } catch (e) {
      setProject(prev);
      toast.error(friendlyError(e, t('projects.logoSaveFailed')));
    }
  };

  const uploadAssets = async (
    assets: { uri: string; name: string; mimeType: string | null; sizeBytes: number | null }[],
  ) => {
    if (!id || assets.length === 0) return;
    setFilesBusy(true);
    let success = 0;
    let failed = 0;
    for (const a of assets) {
      try {
        const created = await projectFilesApi.upload({
          projectId: id,
          fileUri: a.uri,
          name: a.name,
          mimeType: a.mimeType,
          sizeBytes: a.sizeBytes,
        });
        setFiles(prev => [created, ...prev]);
        success += 1;
      } catch (e) {
        console.warn('[project file upload]', toErrorMessage(e));
        failed += 1;
      }
    }
    setFilesBusy(false);
    if (success > 0 && failed === 0) toast.success(`${success} ფაილი აიტვირთა`);
    else if (success > 0 && failed > 0) toast.error(`${success} აიტვირთა, ${failed} ვერ აიტვირთა`);
    else toast.error(t('errors.uploadFailed'));
  };

  const pickPhotos = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      toast.error(t('projects.galleryAccessDenied'));
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (res.canceled || !res.assets?.length) return;
    await uploadAssets(
      res.assets.map(a => ({
        uri: a.uri,
        name: a.fileName ?? `photo-${Date.now()}.jpg`,
        mimeType: a.mimeType ?? 'image/jpeg',
        sizeBytes: a.fileSize ?? null,
      })),
    );
  };

  const pickDocuments = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.length) return;
    await uploadAssets(
      res.assets.map(a => ({
        uri: a.uri,
        name: a.name ?? `file-${Date.now()}`,
        mimeType: a.mimeType ?? null,
        sizeBytes: a.size ?? null,
      })),
    );
  };

  const uploadFile = () => {
    if (!id) return;
    showActionSheetWithOptions(
      {
        title: 'რა გსურთ ატვირთოთ?',
        options: ['ფოტო', 'ფაილი', 'გაუქმება'],
        cancelButtonIndex: 2,
      },
      idx => {
        if (idx === 0) void pickPhotos();
        else if (idx === 1) void pickDocuments();
      },
    );
  };

  const openFile = async (f: ProjectFile) => {
    try {
      const url = await projectFilesApi.signedUrl(f);
      await Linking.openURL(url);
    } catch {
      toast.error(t('projects.fileOpenFailed'));
    }
  };

  const deleteFile = (f: ProjectFile) => {
    showActionSheetWithOptions(
      {
        title: 'დარწმუნებული ხართ?',
        options: ['დიახ, წაშლა', 'გაუქმება'],
        cancelButtonIndex: 1,
        destructiveButtonIndex: 0,
      },
      async idx => {
        if (idx !== 0) return;
        try {
          await projectFilesApi.remove(f);
          setFiles(prev => prev.filter(x => x.id !== f.id));
          toast.success(t('notifications.deleted'));
        } catch (e) {
          toast.error(friendlyError(e, t('errors.deleteFailed')));
        }
      },
    );
  };

  const openMapModal = async () => {
    setMapModalVisible(true);
    if (allProjects.length === 0) {
      const list = await projectsApi.list().catch(() => []);
      setAllProjects(list);
    }
  };

  const mapMarkers = useMemo(() => {
    const withCoords = allProjects.filter(p => p.latitude != null && p.longitude != null);
    if (withCoords.length > 20) {
      console.warn(`[ProjectDetail] Too many projects to show on map (${withCoords.length}), limiting to 20.`);
    }
    return withCoords.slice(0, 20);
  }, [allProjects]);

  if (!loaded && !project) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: t('common.project'),
          }}
        />
        <ScrollView
          style={{ flex: 1 }}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          contentInset={{ top: 0, bottom: 0, left: 0, right: 0 }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 32,
            gap: 14,
          }}
        >
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
          title: project?.name
            ? (project.name.length > 16 ? `${project.name.slice(0, 16)}…` : project.name)
            : t('common.project'),
          headerTitleStyle: { fontSize: 18, fontWeight: '700', color: theme.colors.ink },
        }}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        contentInset={{ top: 0, bottom: 0, left: 0, right: 0 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          // Clear the FAB row.
          paddingBottom: 110,
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
              <Ionicons name="pencil-outline" size={18} color={theme.colors.ink} />
            </Pressable>

            <View style={styles.heroRow}>
              <ProjectAvatar
                project={project}
                size={64}
                editable
                onEdit={onEditLogo}
              />
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
              <Pressable onPress={openMapModal} {...a11y('რუქა', 'გახსნა სრულ ეკრანზე', 'button')}>
                <MapPreview
                  latitude={project.latitude}
                  longitude={project.longitude}
                  pinColor={theme.colors.accent}
                  style={styles.mapWrap}
                />
              </Pressable>
            ) : null}

          </View>

          {/* ── Questionnaires ── */}
          <View ref={questionnairesRef} collapsable={false} style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.sectionTitle}>{t('projects.questionnairesSection')}</Text>
                <Text style={styles.sectionCount}>{questionnaires.length}</Text>
              </View>
              <Pressable onPress={startNewQuestionnaire} hitSlop={8}>
                <Text style={styles.sectionAddLink}>+ დამატება</Text>
              </Pressable>
            </View>

            {questionnaires.length === 0 ? (
              <EmptyState text={t('projects.noCompletedInspections')} />
            ) : (
              <View style={{ gap: 8, marginTop: 10 }}>
                {questionnairesPreview.map(q => {
                  const tpl = templates.find(t => t.id === q.template_id);
                  const isCompleted = q.status === 'completed';
                  return (
                    <Swipeable
                      key={q.id}
                      renderRightActions={() => (
                        <Pressable onPress={() => deleteQuestionnaire(q)} style={styles.swipeDelete} {...a11y('ინსპექციას წაშლა', 'ინსპექციას წაშლა', 'button')}>
                          <Ionicons name="trash" size={18} color={theme.colors.white} />
                        </Pressable>
                      )}
                      overshootRight={false}
                    >
                      <Pressable
                        onPress={() =>
                          router.push(
                            (isCompleted
                              ? `/inspections/${q.id}`
                              : `/inspections/${q.id}/wizard`) as any,
                          )
                        }
                        style={styles.listRow}
                        {...a11y(tpl?.name ?? 'ინსპექცია', isCompleted ? 'დასრულებული ინსპექციას ნახვა' : 'დრაფტის გასაგრძელებლად დააჭირეთ', 'button')}
                      >
                        <View style={[styles.statusIcon, { backgroundColor: isCompleted ? theme.colors.semantic.successSoft : theme.colors.semantic.warningSoft }]}>
                          <Ionicons
                            name={isCompleted ? 'checkmark-circle' : 'pencil'}
                            size={14}
                            color={isCompleted ? theme.colors.primary[700] : '#92400E'}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.listRowTitle}>{tpl?.name ?? t('common.inspection')}</Text>
                          <Text style={styles.listRowSubtitle}>
                            {formatShortDateTime(q.created_at)}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={theme.colors.borderStrong} />
                      </Pressable>
                    </Swipeable>
                  );
                })}
                {overflowQuestionnaires.length > 0 ? (
                  <ViewMoreRow
                    items={overflowQuestionnaires.map(q => {
                      const tpl = templates.find(t => t.id === q.template_id);
                      return tpl?.name ?? 'ინსპ';
                    })}
                    total={overflowQuestionnaires.length}
                    onPress={() => router.push(`/projects/${id}/inspections` as any)}
                  />
                ) : null}
              </View>
            )}
          </View>

          {/* ── ინციდენტები ── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.sectionTitle}>ინციდენტები</Text>
                <Text style={styles.sectionCount}>{incidents.length}</Text>
              </View>
              <Pressable onPress={() => router.push(`/incidents/new?projectId=${id}` as any)} hitSlop={8}>
                <Text style={styles.sectionAddLink}>+ დამატება</Text>
              </Pressable>
            </View>

            {incidents.length === 0 ? (
              <EmptyState text="ინციდენტები არ არის" />
            ) : (
              <View style={{ gap: 8, marginTop: 10 }}>
                {incidentsPreview.map(inc => (
                  <IncidentRow
                    key={inc.id}
                    incident={inc}
                    onPress={() => router.push(`/incidents/${inc.id}` as any)}
                  />
                ))}
                {overflowIncidents.length > 0 ? (
                  <ViewMoreRow
                    items={overflowIncidents.map(
                      inc => INCIDENT_TYPE_LABEL[inc.type as IncidentType] ?? inc.type,
                    )}
                    total={overflowIncidents.length}
                    onPress={() => router.push(`/projects/${id}/incidents` as any)}
                  />
                ) : null}
              </View>
            )}

          </View>

          {/* ── ინსტრუქტაჟი ── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.sectionTitle}>ინსტრუქტაჟი</Text>
                <Text style={styles.sectionCount}>{briefings.length}</Text>
              </View>
              <Pressable onPress={() => id && router.push(`/briefings/new?projectId=${id}` as any)} hitSlop={8}>
                <Text style={styles.sectionAddLink}>+ დამატება</Text>
              </Pressable>
            </View>

            {briefings.length === 0 ? (
              <EmptyState text="ინსტრუქტაჟი ჯერ არ ჩატარებულა" />
            ) : (
              <View style={{ gap: 8, marginTop: 10 }}>
                {briefingsPreview.map(b => {
                  const isCompleted = b.status === 'completed';
                  return (
                    <Pressable
                      key={b.id}
                      onPress={() => router.push(`/briefings/${b.id}` as any)}
                      style={styles.listRow}
                      {...a11y('ინსტრუქტაჟი', 'დეტალების სანახავად დააჭირეთ', 'button')}
                    >
                      <View style={[styles.statusIcon, { backgroundColor: isCompleted ? theme.colors.semantic.successSoft : theme.colors.semantic.warningSoft }]}>
                        <Ionicons
                          name={isCompleted ? 'shield-checkmark' : 'pencil'}
                          size={14}
                          color={isCompleted ? theme.colors.primary[700] : '#92400E'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.listRowTitle}>
                          {formatShortDateTime(b.dateTime)}
                        </Text>
                        <Text style={styles.listRowSubtitle}>
                          {b.participants.length} მონაწილე · {isCompleted ? 'დასრულებული' : 'მიმდინარე'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={theme.colors.borderStrong} />
                    </Pressable>
                  );
                })}
                {overflowBriefings.length > 0 ? (
                  <ViewMoreRow
                    items={overflowBriefings.map(
                      b => b.topics[0]?.replace(/^custom:/, '') ?? 'ინსტ',
                    )}
                    total={overflowBriefings.length}
                    onPress={() => router.push(`/projects/${id}/briefings` as any)}
                  />
                ) : null}
              </View>
            )}

          </View>

          {/* ── რეპორტები ── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.sectionTitle}>რეპორტები</Text>
                <Text style={styles.sectionCount}>{reports.length}</Text>
              </View>
              <Pressable
                onPress={() => id && router.push(`/reports/new?projectId=${id}` as any)}
                hitSlop={8}
              >
                <Text style={styles.sectionAddLink}>+ ახალი რეპორტი</Text>
              </Pressable>
            </View>

            {reports.length === 0 ? (
              <EmptyState text="რეპორტი ჯერ არ შექმნილა" />
            ) : (
              <View style={{ gap: 8, marginTop: 10 }}>
                {reportsPreview.map(r => {
                  const isCompleted = r.status === 'completed';
                  return (
                    <Pressable
                      key={r.id}
                      onPress={() =>
                        router.push(
                          (isCompleted
                            ? `/reports/${r.id}`
                            : `/reports/${r.id}/edit`) as any,
                        )
                      }
                      style={styles.listRow}
                      {...a11y('რეპორტი', 'დეტალების სანახავად დააჭირეთ', 'button')}
                    >
                      <View style={[styles.statusIcon, { backgroundColor: isCompleted ? theme.colors.semantic.successSoft : theme.colors.semantic.warningSoft }]}>
                        <Ionicons
                          name={isCompleted ? 'document-text' : 'pencil'}
                          size={14}
                          color={isCompleted ? theme.colors.primary[700] : '#92400E'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.listRowTitle} numberOfLines={1}>{r.title}</Text>
                        <Text style={styles.listRowSubtitle}>
                          {r.slides.length} სლაიდი · {formatShortDateTime(r.created_at)}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={theme.colors.borderStrong} />
                    </Pressable>
                  );
                })}
                {overflowReports.length > 0 ? (
                  <ViewMoreRow
                    items={overflowReports.map(r => r.title)}
                    total={overflowReports.length}
                    onPress={() => router.push(`/projects/${id}/reports` as any)}
                  />
                ) : null}
              </View>
            )}
          </View>

          {/* ── დოკუმენტები ── */}
          <View ref={filesRef} collapsable={false} style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.sectionTitle}>დოკუმენტები</Text>
                <Text style={styles.sectionCount}>{files.length}</Text>
              </View>
              <Pressable onPress={uploadFile} disabled={filesBusy} hitSlop={8}>
                <Text style={[styles.sectionAddLink, filesBusy && { opacity: 0.5 }]}>
                  {filesBusy ? 'იტვირთება…' : '+ ატვირთვა'}
                </Text>
              </Pressable>
            </View>

            {files.length === 0 ? (
              <EmptyState text="ფაილები არ არის" />
            ) : (
              <View style={{ gap: 8, marginTop: 10 }}>
                {filesPreview.map(f => (
                  <Swipeable
                    key={f.id}
                    renderRightActions={() => (
                      <Pressable onPress={() => deleteFile(f)} style={styles.swipeDelete} {...a11y('ფაილის წაშლა', 'ფაილის წაშლა', 'button')}>
                        <Ionicons name="trash" size={18} color={theme.colors.white} />
                      </Pressable>
                    )}
                    overshootRight={false}
                  >
                    <Pressable
                      onPress={() => openFile(f)}
                      style={styles.listRow}
                      {...a11y(f.name, 'ფაილის გახსნა', 'button')}
                    >
                      <FileThumbnail file={f} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.listRowTitle} numberOfLines={1}>{f.name}</Text>
                        <Text style={styles.listRowSubtitle}>
                          {formatShortDateTime(f.created_at)}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={theme.colors.borderStrong} />
                    </Pressable>
                  </Swipeable>
                ))}
                {overflowFiles.length > 0 ? (
                  <ViewMoreRow
                    items={overflowFiles.map(f => f.name)}
                    total={overflowFiles.length}
                    onPress={() => router.push(`/projects/${id}/files` as any)}
                  />
                ) : null}
              </View>
            )}

          </View>

          {/* ── მონაწილეები (merged: inspector + crew) ── */}
          <View ref={participantsRef} collapsable={false} style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.sectionTitle}>{t('projects.participantsSection')}</Text>
                <Text style={styles.sectionCount}>{(project?.crew?.length ?? 0) + (inspector ? 1 : 0)}</Text>
              </View>
            </View>
            <View style={{ marginTop: 10 }}>
              {project ? (
                <RoleSlotList
                  projectId={project.id}
                  inspector={inspector}
                  crew={project.crew ?? []}
                  onChange={persistCrew}
                  maxVisible={3}
                  onViewAll={() => router.push(`/projects/${id}/participants` as any)}
                />
              ) : null}
            </View>
          </View>

        </ScrollView>

        {/* ── FAB: new questionnaire ── */}
        <Pressable
          ref={fabRef}
          onPress={startNewQuestionnaire}
          style={({ pressed }) => [
            styles.fab,
            { bottom: insets.bottom + 16 },
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
          toast.success(t('projects.saved'));
        }}
      />

      {/* Full-screen map with all projects */}
      {mapModalVisible && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="auto">
          <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: insets.top + 12, paddingBottom: 12 }}>
              <View style={{ width: 24 }} />
              <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: theme.colors.ink }}>
                პროექტები რუკაზე
              </Text>
              <Pressable onPress={() => setMapModalVisible(false)} hitSlop={10} {...a11y('დახურვა', 'რუკის დახურვა', 'button')}>
                <Ionicons name="close" size={24} color={theme.colors.ink} />
              </Pressable>
            </View>
            <MapView
              provider={PROVIDER_DEFAULT}
              style={{ flex: 1 }}
              initialRegion={{
                latitude: project?.latitude ?? 41.7151,
                longitude: project?.longitude ?? 44.8271,
                latitudeDelta: 0.5,
                longitudeDelta: 0.5,
              }}
            >
              {mapMarkers.map(p => (
                <Marker
                  key={p.id}
                  coordinate={{ latitude: p.latitude!, longitude: p.longitude! }}
                  pinColor={p.id === id ? theme.colors.accent : undefined}
                  title={p.name}
                />
              ))}
            </MapView>
            {allProjects.filter(p => p.latitude != null && p.longitude != null).length > 20 && (
              <View style={{ position: 'absolute', bottom: insets.bottom + 16, left: 16, right: 16, alignItems: 'center' }}>
                <View style={{ backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
                    ნაჩვენებია პირველი 20 პროექტი
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
    </TourGuide>
  );
}

function EmptyState({ text }: { text: string }) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  return (
    <View style={styles.emptyState}>
      <Ionicons name="document-text-outline" size={28} color={theme.colors.borderStrong} />
      <Text style={styles.emptyStateText}>{text}</Text>
    </View>
  );
}

function FileThumbnail({ file }: { file: ProjectFile }) {
  const { theme } = useTheme();
  const isImage = !!file.mime_type?.startsWith('image/');
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    if (!isImage) return;
    let cancelled = false;
    (async () => {
      try {
        const u = await getStorageImageDisplayUrl(STORAGE_BUCKETS.projectFiles, file.storage_path);
        if (!cancelled) setUri(u);
      } catch {
        // fall through to icon fallback
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isImage, file.storage_path]);

  const tile = {
    width: 72,
    aspectRatio: 16 / 9,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceSecondary,
    overflow: 'hidden' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  if (isImage && uri) {
    return (
      <View style={tile}>
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
      </View>
    );
  }

  const iconName = file.mime_type?.includes('pdf')
    ? 'document-text-outline'
    : isImage
      ? 'image-outline'
      : 'document-outline';

  return (
    <View style={tile}>
      <Ionicons name={iconName} size={20} color={theme.colors.inkSoft} />
    </View>
  );
}

/**
 * "View more" row at the bottom of a section preview.
 * Renders stacked initials for the items beyond the first 3.
 * Inputs:
 *   - items: labels for the overflow items (used to derive avatar initials)
 *   - total: number of overflow items shown in the "+ N მეტი" label
 *   - onPress: navigate to the full list screen
 */
function ViewMoreRow({
  items,
  total,
  onPress,
}: {
  items: string[];
  total: number;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const avatarLabels = items.slice(0, 3);

  return (
    <Pressable
      onPress={onPress}
      style={styles.listRow}
      {...a11y(`+ ${total} მეტი`, 'სრული სიის გახსნა', 'button')}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {avatarLabels.map((label, idx) => {
          const ch = (label || '?').trim().charAt(0).toUpperCase() || '?';
          return (
            <View
              key={idx}
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: theme.colors.surfaceSecondary,
                borderWidth: 2,
                borderColor: theme.colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: idx === 0 ? 0 : -8,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.inkSoft }}>
                {ch}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.listRowTitle}>+ {total} მეტი</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.borderStrong} />
    </Pressable>
  );
}

function SafeSigImage({ uri }: { uri: string }) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const [err, setErr] = useState(false);
  if (err) return <Ionicons name="person" size={20} color={theme.colors.inkFaint} />;
  return (
    <Image
      source={{ uri }}
      style={{ width: '100%', height: '100%' }}
      contentFit="contain"
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
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [address, setAddress] = useState('');
  const [pin, setPin] = useState<LatLng | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);

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
        setLogo(project.logo ?? null);
      }
    }, [visible, project]),
  );

  const onPickLogo = async () => {
    const next = await pickProjectLogo();
    if (next) setLogo(next);
  };

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
        logo,
      }));
      onSaved(saved);
    } catch (e) {
      toast.error(friendlyError(e, t('errors.saveFailed')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => mapVisible ? setMapVisible(false) : onClose()}>
      <View style={{ flex: 1 }}>
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.45)',
            justifyContent: 'flex-end',
          }}
          onPress={() => mapVisible ? setMapVisible(false) : onClose()}
          {...a11y(t('common.close'), 'შეეხეთ ფონის დასახურად', 'button')}
        >
          {/* Stop touches inside the card from closing the sheet */}
          <Pressable onPress={() => {}} style={{ width: '100%' }}>
            <SheetLayout
              header={{ title: t('projects.edit'), onClose }}
              footer={
                <Button
                  title={t('common.save')}
                  size="lg"
                  onPress={save}
                  loading={busy}
                  disabled={!name.trim()}
                />
              }
            >
              <View style={{ alignItems: 'center', gap: 8, paddingVertical: 4 }}>
                <ProjectAvatar
                  project={{ name, logo }}
                  size={88}
                  editable
                  onEdit={onPickLogo}
                />
                {logo ? (
                  <Pressable onPress={() => setLogo(null)} hitSlop={6}>
                    <Text style={{ color: theme.colors.danger, fontSize: 13, fontWeight: '600' }}>
                      {t('projects.logoRemove')}
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              <FormField label={t('common.name')} required>
                <Input
                  value={name}
                  onChangeText={setName}
                  placeholder={t('projects.projectNamePlaceholder')}
                  autoFocus
                />
              </FormField>

              <FormField label={t('common.company')}>
                <Input value={company} onChangeText={setCompany} placeholder={t('projects.clientPlaceholder')} />
              </FormField>

              <FormField label={t('common.address')}>
                <Input
                  value={address}
                  onChangeText={setAddress}
                  placeholder="ქუჩა, ნომერი, ქალაქი"
                />
              </FormField>

              <FormField label="მდებარეობა">
                <LocationRow pin={pin} address={address} onPress={() => { Keyboard.dismiss(); setMapVisible(true); }} />
              </FormField>
            </SheetLayout>
          </Pressable>
        </Pressable>

        {/* Full-screen map overlay — no nested Modal */}
        {mapVisible && (
          <View style={StyleSheet.absoluteFillObject}>
            <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: insets.top + 12, paddingVertical: 12 }}>
                <View style={{ width: 24 }} />
                <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: theme.colors.ink }}>
                  მდებარეობის არჩევა
                </Text>
                <Pressable onPress={() => setMapVisible(false)} hitSlop={10} {...a11y(t('common.close'), 'რუკის დახურვა', 'button')}>
                  <Ionicons name="close" size={24} color={theme.colors.ink} />
                </Pressable>
              </View>
              <MapPickerInline
                initialPin={pin}
                initialAddress={address}
                onConfirm={(newPin, newAddress) => {
                  setPin(newPin);
                  setAddress(newAddress);
                  setMapVisible(false);
                }}
                onCancel={() => setMapVisible(false)}
              />
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

// ── Compact location row (shows preview or picker prompt) ──
function LocationRow({
  pin,
  address,
  onPress,
}: {
  pin: LatLng | null;
  address: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();

  if (!pin) {
    return (
      <Pressable
        onPress={onPress}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingVertical: 14,
          paddingHorizontal: 16,
          backgroundColor: theme.colors.surfaceSecondary,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.colors.hairline,
          borderStyle: 'dashed',
        }}
      >
        <Ionicons name="location-outline" size={20} color={theme.colors.accent} />
        <Text style={{ fontSize: 14, color: theme.colors.inkSoft, fontWeight: '500' }}>
          დააჭირეთ მდებარეობის ასარჩევად
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress}>
      <View style={{ gap: 8 }}>
        <MapPreview
          latitude={pin.latitude}
          longitude={pin.longitude}
          pinColor={theme.colors.accent}
          style={{ height: 120, borderRadius: 12, overflow: 'hidden' }}
        />
        {address ? (
          <Text style={{ fontSize: 13, color: theme.colors.inkSoft }} numberOfLines={2}>
            {address}
          </Text>
        ) : null}
        <Text style={{ fontSize: 13, color: theme.colors.accent, fontWeight: '600' }}>
          შეცვლა
        </Text>
      </View>
    </Pressable>
  );
}

// ── Inline map picker (no nested Modal) ──
function MapPickerInline({
  initialPin,
  initialAddress,
  onConfirm,
  onCancel,
}: {
  initialPin: LatLng | null;
  initialAddress: string;
  onConfirm: (pin: LatLng | null, address: string) => void;
  onCancel: () => void;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState<LatLng | null>(initialPin);
  const [address, setAddress] = useState(initialAddress);
  const screenH = Dimensions.get('window').height;
  // Reserve space for header (~60) + bottom action bar (~160) + safe areas
  const mapHeight = Math.max(240, screenH - insets.top - insets.bottom - 220);

  useEffect(() => {
    setPin(initialPin);
    setAddress(initialAddress);
  }, [initialPin, initialAddress]);

  return (
    <View style={{ flex: 1 }}>
      {/* Map with modest horizontal inset */}
      <View style={{ flex: 1, marginHorizontal: 16 }}>
        <MapPicker
          value={pin}
          onChange={setPin}
          address={address}
          onAddressChange={setAddress}
          height={mapHeight}
        />
      </View>

      {/* Bottom action bar */}
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: insets.bottom + 16,
          gap: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        <Button
          title="დადასტურება"
          size="lg"
          onPress={() => onConfirm(pin, address)}
          disabled={!pin}
        />
        <Pressable onPress={onCancel} style={{ alignSelf: 'center', paddingVertical: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: theme.colors.inkSoft }}>
            გაუქმება
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const INCIDENT_BADGE_COLORS: Record<
  IncidentType,
  { bg: string; text: string; border: string }
> = {
  minor:    { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' },
  severe:   { bg: '#FFEDD5', text: '#9A3412', border: '#F97316' },
  fatal:    { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' },
  mass:     { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' },
  nearmiss: { bg: '#EDE9FE', text: '#5B21B6', border: '#8B5CF6' },
};

function IncidentRow({
  incident,
  onPress,
}: {
  incident: Incident;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const badge = INCIDENT_BADGE_COLORS[incident.type as IncidentType] ?? INCIDENT_BADGE_COLORS.minor;
  const styles = useMemo(() => getstyles(theme), [theme]);

  return (
    <Pressable onPress={onPress} style={styles.listRow}>
      <View
        style={[
          styles.statusIcon,
          { backgroundColor: badge.bg, borderWidth: 1, borderColor: badge.border },
        ]}
      >
        <Ionicons name="warning-outline" size={13} color={badge.text} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View
            style={{
              backgroundColor: badge.bg,
              borderRadius: 4,
              borderWidth: 1,
              borderColor: badge.border,
              paddingHorizontal: 6,
              paddingVertical: 2,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '700', color: badge.text }}>
              {INCIDENT_TYPE_LABEL[incident.type as IncidentType] ?? incident.type}
            </Text>
          </View>
          {incident.status === 'draft' && (
            <View
              style={{
                backgroundColor: '#FEF3C7',
                borderRadius: 4,
                paddingHorizontal: 5,
                paddingVertical: 2,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#92400E' }}>
                დრაფტი
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.listRowTitle, { marginTop: 3 }]} numberOfLines={1}>
          {incident.location || incident.description || '—'}
        </Text>
        <Text style={styles.listRowSubtitle}>
          {formatShortDateTime(incident.date_time)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.borderStrong} />
    </Pressable>
  );
}

function getstyles(theme: any) {
  return StyleSheet.create({
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
  sectionCount: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.inkSoft,
  },
  sectionAddLink: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  badgeGreen: {
    backgroundColor: theme.colors.semantic.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 16,
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
    borderRadius: 16,
  },
  missingChipText: {
    color: theme.colors.semantic.warning,
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

});
}
