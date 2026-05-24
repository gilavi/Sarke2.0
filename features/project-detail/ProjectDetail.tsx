import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Reanimated from 'react-native-reanimated';
import { Image } from 'expo-image';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { SkeletonMap } from '../../components/SkeletonMap';
import { routeForInspection } from '../../lib/inspectionRouting';
import { useBottomSheet } from '../../components/BottomSheet';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Skeleton, SkeletonCard, SkeletonListCard } from '../../components/Skeleton';
import { SectionEmptyState } from '../../components/EmptyState';
import {
  projectsApi,
  projectFilesApi,
  questionnairesApi,
} from '../../lib/services';
import { inspectionRegistry } from '../../lib/inspection/registry';
import { formatBlDate, BL_RESULT_COLORS, countsByStatus } from '../../types/breathalyzerLog';
import type { BreathalizerLog } from '../../types/breathalyzerLog';
import { buildUnifiedInspections, deleteUnifiedInspection, type UnifiedInspection } from './unifiedInspections';
import { useToast } from '../../lib/toast';
import { useTheme } from '../../lib/theme';
import { toErrorMessage } from '../../lib/logError';
import { friendlyError } from '../../lib/errorMap';
import { formatShortDateTime } from '../../lib/formatDate';
import type { Briefing, CrewMember, Incident, Order, Project, ProjectFile, Questionnaire, Report, Template } from '../../types/models';
import { ORDER_DOCUMENT_TYPE_LABEL } from '../../types/models';
import { briefingsApi } from '../../lib/briefingsApi';
import { ordersApi } from '../../lib/ordersApi';
import { RoleSlotList } from '../../components/RoleSlotList';
import { ProjectAvatar } from '../../components/ProjectAvatar';
import { pickProjectLogo } from '../../lib/projectLogo';
import { useSession } from '../../lib/session';
import { a11y } from '../../lib/accessibility';
import { TourGuide, type TourStep } from '../../components/TourGuide';
import { useTranslation } from 'react-i18next';
import { usePhotoWithLocation } from '../../hooks/usePhotoWithLocation';
import { QuickActions, type QuickAction } from '../../components/QuickActions';
import { InspectionTypeAvatar } from '../../components/InspectionTypeAvatar';
import { RecordTypePill } from '../../components/RecordTypePill';
import { CustomDropdown } from '../../components/ui/CustomDropdown';
import { EditProjectSheet } from '../../components/projects/EditProjectSheet';
import { UpcomingSection } from '../../components/projects/UpcomingSection';
import { EmptyState, FileThumbnail, IncidentRow, ViewMoreRow } from '../../components/projects/ProjectRowHelpers';
import { getStyles } from './styles';
import { ProjectArchSvg, useArchAnimation } from './ProjectArchHeader';
import { useProjectDetailData } from './useProjectDetailData';

export default function ProjectDetail() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const showActionSheetWithOptions = useBottomSheet();
  const toast = useToast();
  const session = useSession();
  const { pickPhotoWithAnnotation } = usePhotoWithLocation();
  const insets = useSafeAreaInsets();

  const {
    loaded,
    project, setProject,
    questionnaires, setQuestionnaires,
    bobcatInspections, setBobcatInspections,
    excavatorInspections, setExcavatorInspections,
    generalEquipmentInspections, setGeneralEquipmentInspections,
    cpInspections, setCpInspections,
    snInspections, setSnInspections,
    mlInspections, setMlInspections,
    fpInspections, setFpInspections,
    laInspections, setLaInspections,
    fkInspections, setFkInspections,
    templates, setTemplates,
    files, setFiles,
    incidents,
    briefings,
    reports,
    orders,
    breathalyzerLogs,
  } = useProjectDetailData(id);

  const [filesBusy, setFilesBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [mapSelected, setMapSelected] = useState<Project | null>(null);
  const mapCardAnim = useRef(new Animated.Value(240)).current;
  const [templatePickerVisible, setTemplatePickerVisible] = useState(false);
  const [templatePickerOptions, setTemplatePickerOptions] = useState<Template[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);

  // Project screen onboarding tour
  const heroRef = useRef<View>(null);
  const participantsRef = useRef<View>(null);
  const filesRef = useRef<View>(null);
  const questionnairesRef = useRef<View>(null);
  const deletingFileIdsRef = useRef<Set<string>>(new Set());
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

  // Cross-source inspection helpers live in ./unifiedInspections.
  const allInspections = useMemo<UnifiedInspection[]>(
    () => buildUnifiedInspections({
      questionnaires, bobcatInspections, excavatorInspections,
      generalEquipmentInspections, cpInspections, snInspections,
      mlInspections, fpInspections, laInspections, fkInspections,
    }),
    [questionnaires, bobcatInspections, excavatorInspections, generalEquipmentInspections, cpInspections, snInspections, mlInspections, fpInspections, laInspections, fkInspections],
  );

  const allInspectionsSorted = allInspections;
  const allInspectionsPreview = useMemo(
    () => allInspectionsSorted.slice(0, 3),
    [allInspectionsSorted],
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

  const overflowAllInspections = useMemo(
    () => allInspectionsSorted.slice(3),
    [allInspectionsSorted],
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

  const startNewInspection = () => {
    const system = templates.filter(tpl => tpl.is_system);
    if (system.length === 0) {
      toast.error(t('projects.templateMissing'));
      return;
    }
    if (system.length === 1 && id) {
      void createInspectionForTemplate(id, system[0]);
      return;
    }
    setTemplatePickerOptions(system);
    setTemplatePickerVisible(true);
  };

  const createInspectionForTemplate = async (projectId: string, tpl: Template) => {
    try {
      const entry = tpl.category ? inspectionRegistry[tpl.category] : undefined;
      const newId = entry
        ? (await entry.create({ projectId, templateId: tpl.id })).id
        : (await questionnairesApi.create({ projectId, templateId: tpl.id })).id;
      router.push(routeForInspection(tpl.category, newId, false) as any);
    } catch (e) {
      toast.error(friendlyError(e, t('errors.createFailed')));
    }
  };

  const deletingInspIdsRef = useRef<Set<string>>(new Set());

  const deleteInspection = (item: UnifiedInspection) => {
    showActionSheetWithOptions(
      {
        title: 'დარწმუნებული ხართ?',
        options: ['დიახ, წაშლა', 'გაუქმება'],
        cancelButtonIndex: 1,
        destructiveButtonIndex: 0,
      },
      async idx => {
        if (idx !== 0) return;
        if (deletingInspIdsRef.current.has(item.id)) return;
        deletingInspIdsRef.current.add(item.id);
        try {
          await deleteUnifiedInspection(item, {
            setBobcatInspections,
            setExcavatorInspections,
            setGeneralEquipmentInspections,
            setCpInspections,
            setSnInspections,
            setMlInspections,
            setFpInspections,
            setLaInspections,
            setFkInspections,
            setQuestionnaires,
          });
          toast.success(t('notifications.deleted'));
        } catch (e) {
          toast.error(friendlyError(e, t('errors.deleteFailed')));
        } finally {
          deletingInspIdsRef.current.delete(item.id);
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

  const pickPhotoWithPicker = async () => {
    const result = await pickPhotoWithAnnotation();
    if (!result) return;
    await uploadAssets([{
      uri: result.uri,
      name: `photo-${Date.now()}.jpg`,
      mimeType: 'image/jpeg',
      sizeBytes: null,
    }]);
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
        setTimeout(() => {
          if (idx === 0) pickPhotoWithPicker();
          else if (idx === 1) void pickDocuments();
        }, 300);
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
    // Action sheets dismiss before the API call settles, so a fast user can
    // re-swipe the same row and trigger a second DELETE while the first is
    // still in flight. Guard with an in-flight set keyed by file id.
    if (deletingFileIdsRef.current.has(f.id)) return;
    showActionSheetWithOptions(
      {
        title: 'დარწმუნებული ხართ?',
        options: ['დიახ, წაშლა', 'გაუქმება'],
        cancelButtonIndex: 1,
        destructiveButtonIndex: 0,
      },
      async idx => {
        if (idx !== 0) return;
        if (deletingFileIdsRef.current.has(f.id)) return;
        deletingFileIdsRef.current.add(f.id);
        try {
          await projectFilesApi.remove(f);
          setFiles(prev => prev.filter(x => x.id !== f.id));
          toast.success(t('notifications.deleted'));
        } catch (e) {
          toast.error(friendlyError(e, t('errors.deleteFailed')));
        } finally {
          deletingFileIdsRef.current.delete(f.id);
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

  const openMapCard = useCallback((p: Project) => {
    setMapSelected(p);
    Animated.spring(mapCardAnim, { toValue: 0, useNativeDriver: true, tension: 70, friction: 12 }).start();
  }, [mapCardAnim]);

  const closeMapCard = useCallback(() => {
    Animated.timing(mapCardAnim, { toValue: 240, duration: 200, useNativeDriver: true }).start(() =>
      setMapSelected(null),
    );
  }, [mapCardAnim]);

  const quickActions: QuickAction[] = useMemo(
    () => [
      { label: 'შემოწმება',   colorKey: 'inspection',  onPress: startNewInspection },
      { label: 'ინციდენტი',   colorKey: 'incident',    onPress: () => id && router.push(`/incidents/new?projectId=${id}` as any) },
      { label: 'ინსტრუქტაჟი', colorKey: 'briefing',    onPress: () => id && router.push(`/briefings/new?projectId=${id}` as any) },
      { label: 'რეპორტი',     colorKey: 'report',      onPress: () => id && router.push(`/reports/new?projectId=${id}` as any) },
      { label: 'მონაწილე',    colorKey: 'participant', onPress: () => id && router.push(`/projects/${id}/participants` as any) },
      { label: 'ფაილი',       colorKey: 'file',        onPress: uploadFile },
    ],
    [id, router, startNewInspection, uploadFile],
  );

  const mapMarkers = useMemo(() => {
    const withCoords = allProjects.filter(p => p.latitude != null && p.longitude != null);
    if (withCoords.length > 20) {
      // Limit map markers to 20 for performance
    }
    return withCoords.slice(0, 20);
  }, [allProjects]);

  // Arch SVG morph + logo entrance animation. See ProjectArchHeader.tsx.
  const { archProps, logoStyle, scrollHandler } = useArchAnimation(loaded);

  if (!loaded && !project) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScrollView
          style={{ flex: 1 }}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          contentInset={{ top: 0, bottom: 0, left: 0, right: 0 }}
          contentContainerStyle={{
            paddingHorizontal: 24,
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

  const participantCount = (project?.crew?.length ?? 0) + (inspector ? 1 : 0);

  return (
    <TourGuide tourId="project_screen_v1" steps={tourSteps}>
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Floating buttons — always fixed over content ── */}
      <Pressable
        onPress={() => router.back()}
        hitSlop={13}
        style={[styles.floatingBtn, { position: 'absolute', top: insets.top + 8, left: 16, zIndex: 30 }]}
        {...a11y('უკან', 'წინა გვერდზე დაბრუნება', 'button')}
      >
        <Ionicons name="chevron-back" size={20} color={theme.colors.ink} />
      </Pressable>
      <Pressable
        onPress={() => setEditing(true)}
        hitSlop={13}
        style={[styles.floatingBtn, { position: 'absolute', top: insets.top + 8, right: 16, zIndex: 30 }]}
        {...a11y('რედაქტირება', 'პროექტის დეტალების შეცვლა', 'button')}
      >
        <Ionicons name="pencil-outline" size={18} color={theme.colors.ink} />
      </Pressable>

      {/* ── Single full-page scroll ── */}
      <Reanimated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={1}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >

        {/* Map hero — no parallax */}
        <View ref={heroRef} collapsable={false} style={{ height: 220, overflow: 'hidden' }}>
          <View style={StyleSheet.absoluteFill}>
            {project?.latitude != null && project?.longitude != null ? (
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={openMapModal}
                {...a11y('რუქა', 'გახსნა სრულ ეკრანზე', 'button')}
              >
                <MapView
                  style={StyleSheet.absoluteFill}
                  region={{
                    latitude: project.latitude,
                    longitude: project.longitude,
                    latitudeDelta: 0.008,
                    longitudeDelta: 0.008,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  pitchEnabled={false}
                  rotateEnabled={false}
                  provider={PROVIDER_DEFAULT}
                >
                  <Marker
                    coordinate={{ latitude: project.latitude, longitude: project.longitude }}
                    pinColor={theme.colors.accent}
                  />
                </MapView>
              </Pressable>
            ) : (
              <SkeletonMap onAddLocation={() => setEditing(true)} />
            )}
          </View>

          {/* SVG arch — morphs between flat and curved via Reanimated */}
          <ProjectArchSvg archProps={archProps} fill={theme.colors.background} />
        </View>

        {/* ── Sheet — sits flush below the arch ── */}
        <View style={styles.sheet}>

          {/* Logo springs in after arch, centered on arch peak */}
          <Reanimated.View style={[styles.logoContainer, logoStyle]}>
            <Pressable
              onPress={onEditLogo}
              style={{ position: 'relative' }}
              hitSlop={4}
              {...a11y('ლოგოს შეცვლა', 'პროექტის ლოგოს შეცვლა', 'button')}
            >
              <View style={styles.logoOuter}>
                {project?.logo ? (
                  <Image source={{ uri: project.logo }} style={styles.logoImage} contentFit="cover" />
                ) : (
                  <Text style={styles.logoInitials}>
                    {(project?.company_name || project?.name || '?').slice(0, 2).toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.logoBadge} pointerEvents="none">
                <Ionicons name="add" size={13} color={theme.colors.white} />
              </View>
            </Pressable>
          </Reanimated.View>


        <View style={styles.projectInfoCenter}>
          <Text style={styles.heroName}>{project?.company_name || project?.name || '—'}</Text>
          {project?.address ? (
            <Text style={styles.heroMetaText} numberOfLines={2}>
              {project.address}
            </Text>
          ) : null}
          {project?.contact_phone ? (
            <Pressable
              onPress={() => Linking.openURL(`tel:${project.contact_phone}`)}
              hitSlop={16}
              style={{ paddingVertical: 8 }}
              {...a11y('დარეკვა', `${project.contact_phone}-ზე დარეკვა`, 'button')}
            >
              <Text style={styles.heroPhoneText}>{project.contact_phone}</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Quick actions — edgeInset matches parent paddingHorizontal to reach screen edges */}
        <View style={{ paddingHorizontal: 24, paddingBottom: 4 }}>
          <QuickActions actions={quickActions} scrollable edgeInset={24} />
        </View>

        {/* Upcoming schedule */}
        <UpcomingSection projectId={id} />

        {/* ── Section cards ── */}
        <View style={{ paddingHorizontal: 24, gap: 16, paddingTop: 8 }}>

          {/* ── Inspections (generic + equipment) ── */}
          <View ref={questionnairesRef} collapsable={false} style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="shield-checkmark-outline" size={16} color={theme.colors.inkSoft} />
                <Text style={styles.sectionTitle}>{t('projects.questionnairesSection')}</Text>
                <Text style={styles.sectionCount}>{allInspections.length}</Text>
              </View>
              <Pressable onPress={startNewInspection} hitSlop={16}>
                <Text style={styles.sectionAddLink}>+ დამატება</Text>
              </Pressable>
            </View>

            {allInspections.length === 0 ? (
              <EmptyState text={t('projects.noCompletedInspections')} />
            ) : (
              <View style={{ gap: 8, marginTop: 10 }}>
                {allInspectionsPreview.map(item => {
                  const tpl = templates.find(t => t.id === item.template_id);
                  const isCompleted = item.status === 'completed';
                  const route = routeForInspection(item.source, item.id, isCompleted);
                  return (
                    <Swipeable
                      key={`${item.source}-${item.id}`}
                      renderRightActions={() => (
                        <Pressable onPress={() => deleteInspection(item)} style={styles.swipeDelete} {...a11y('შემოწმების აქტს წაშლა', 'შემოწმების აქტს წაშლა', 'button')}>
                          <Ionicons name="trash" size={18} color={theme.colors.white} />
                        </Pressable>
                      )}
                      overshootRight={false}
                    >
                      <Pressable
                        onPress={() => router.push(route as any)}
                        style={styles.listRow}
                        {...a11y(tpl?.name ?? 'შემოწმების აქტი', isCompleted ? 'დასრულებული შემოწმების აქტს ნახვა' : 'დრაფტის გასაგრძელებლად დააჭირეთ', 'button')}
                      >
                        <InspectionTypeAvatar
                          category={item.source === 'generic' ? tpl?.category : item.source}
                          size={36}
                          status={isCompleted ? 'completed' : 'draft'}
                        />
                        <View style={{ flex: 1 }}>
                          <RecordTypePill recordType="inspection" />
                          <Text style={styles.listRowTitle}>{tpl?.name ?? t('common.inspection')}</Text>
                          <Text style={styles.listRowSubtitle}>
                            {formatShortDateTime(item.created_at)}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={theme.colors.borderStrong} />
                      </Pressable>
                    </Swipeable>
                  );
                })}
                {overflowAllInspections.length > 0 ? (
                  <ViewMoreRow
                    items={overflowAllInspections.map(item => {
                      const tpl = templates.find(t => t.id === item.template_id);
                      return { category: item.source === 'generic' ? (tpl?.category ?? null) : item.source };
                    })}
                    total={overflowAllInspections.length}
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
                <Ionicons name="warning-outline" size={16} color={theme.colors.inkSoft} />
                <Text style={styles.sectionTitle}>ინციდენტები</Text>
                <Text style={styles.sectionCount}>{incidents.length}</Text>
              </View>
              <Pressable onPress={() => router.push(`/incidents/new?projectId=${id}` as any)} hitSlop={16}>
                <Text style={styles.sectionAddLink}>+ დამატება</Text>
              </Pressable>
            </View>

            {incidents.length === 0 ? (
              <SectionEmptyState type="incidents" />
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
                    items={overflowIncidents.map(() => ({ ionicon: 'warning-outline' }))}
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
                <Ionicons name="megaphone-outline" size={16} color={theme.colors.inkSoft} />
                <Text style={styles.sectionTitle}>ინსტრუქტაჟი</Text>
                <Text style={styles.sectionCount}>{briefings.length}</Text>
              </View>
              <Pressable onPress={() => id && router.push(`/briefings/new?projectId=${id}` as any)} hitSlop={16}>
                <Text style={styles.sectionAddLink}>+ დამატება</Text>
              </Pressable>
            </View>

            {briefings.length === 0 ? (
              <SectionEmptyState type="briefings" />
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
                          name={isCompleted ? 'shield-checkmark' : 'hourglass-outline'}
                          size={14}
                          color={isCompleted ? theme.colors.semantic.success : theme.colors.certTint}
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
                    items={overflowBriefings.map(() => ({ ionicon: 'megaphone-outline' }))}
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
                <Ionicons name="document-text-outline" size={16} color={theme.colors.inkSoft} />
                <Text style={styles.sectionTitle}>რეპორტები</Text>
                <Text style={styles.sectionCount}>{reports.length}</Text>
              </View>
              <Pressable
                onPress={() => id && router.push(`/reports/new?projectId=${id}` as any)}
                hitSlop={16}
              >
                <Text style={styles.sectionAddLink}>+ ახალი რეპორტი</Text>
              </Pressable>
            </View>

            {reports.length === 0 ? (
              <SectionEmptyState type="reports" />
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
                          name={isCompleted ? 'document-text' : 'hourglass-outline'}
                          size={14}
                          color={isCompleted ? theme.colors.semantic.success : theme.colors.certTint}
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
                    items={overflowReports.map(() => ({ ionicon: 'document-text-outline' }))}
                    total={overflowReports.length}
                    onPress={() => router.push(`/projects/${id}/reports` as any)}
                  />
                ) : null}
              </View>
            )}
          </View>

          {/* ── ბრძანებები ── */}
          <View ref={filesRef} collapsable={false} style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="ribbon-outline" size={16} color={theme.colors.inkSoft} />
                <Text style={styles.sectionTitle}>ბრძანებები</Text>
                <Text style={styles.sectionCount}>{files.length + orders.length}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Pressable
                  onPress={() => router.push(`/orders/new?projectId=${id}` as any)}
                  hitSlop={16}
                  {...a11y('ბრძანების შექმნა', 'ახალი ბრძანების შექმნა', 'button')}
                >
                  <Text style={styles.sectionAddLink}>+ ბრძანება</Text>
                </Pressable>
                <Pressable onPress={uploadFile} disabled={filesBusy} hitSlop={16}>
                  <Text style={[styles.sectionAddLink, filesBusy && { opacity: 0.5 }]}>
                    {filesBusy ? 'იტვირთება…' : '+ ატვირთვა'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Generated orders (ბრძანებები) */}
            {orders.length > 0 ? (
              <View style={{ gap: 8, marginTop: 10 }}>
                {orders.map(order => (
                  <View key={order.id} style={styles.listRow}>
                    <View style={{
                      width: 32, height: 32, borderRadius: 8,
                      backgroundColor: theme.colors.accentSoft,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Ionicons name="document-text-outline" size={17} color={theme.colors.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listRowTitle} numberOfLines={1}>
                        {ORDER_DOCUMENT_TYPE_LABEL[order.documentType] ?? order.documentType}
                      </Text>
                      <Text style={styles.listRowSubtitle}>
                        {formatShortDateTime(order.createdAt)}
                        {order.status === 'draft' ? ' · მონახაზი' : ''}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Uploaded files */}
            {files.length === 0 && orders.length === 0 ? (
              <SectionEmptyState type="documents" />
            ) : files.length === 0 ? null : (
              <View style={{ gap: 8, marginTop: orders.length > 0 ? 8 : 10 }}>
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
                    items={overflowFiles.map(() => ({ ionicon: 'document-outline' }))}
                    total={overflowFiles.length}
                    onPress={() => router.push(`/projects/${id}/files` as any)}
                  />
                ) : null}
              </View>
            )}

          </View>

          {/* ── ჟურნალები ── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="journal-outline" size={16} color={theme.colors.inkSoft} />
                <Text style={styles.sectionTitle}>ჟურნალები</Text>
                <Text style={styles.sectionCount}>{breathalyzerLogs.length}</Text>
              </View>
              <Pressable
                onPress={() => id && router.push(`/projects/${id}/logs/breathalyzer` as any)}
                hitSlop={16}
                {...a11y('ალკოტესტი', 'ალკოტესტის ჟურნალის გახსნა', 'button')}
              >
                <Text style={styles.sectionAddLink}>+ ალკოტესტი</Text>
              </Pressable>
            </View>

            {breathalyzerLogs.length === 0 ? (
              <SectionEmptyState type="documents" />
            ) : (
              <View style={{ gap: 8, marginTop: 10 }}>
                {breathalyzerLogs.slice(0, 3).map(log => {
                  const logCounts = countsByStatus(log.entries);
                  const hasFail = logCounts.fail > 0;
                  return (
                    <Pressable
                      key={log.id}
                      onPress={() =>
                        router.push(`/projects/${id}/logs/breathalyzer?logId=${log.id}` as any)
                      }
                      style={styles.listRow}
                      {...a11y('ალკოტესტის ჟურნალი', 'დეტალების სანახავად დააჭირეთ', 'button')}
                    >
                      <View style={[styles.statusIcon, {
                        backgroundColor: log.status === 'closed'
                          ? theme.colors.semantic.successSoft
                          : theme.colors.semantic.warningSoft,
                      }]}>
                        <Ionicons
                          name={log.status === 'closed' ? 'journal' : 'journal-outline'}
                          size={14}
                          color={log.status === 'closed'
                            ? theme.colors.semantic.success
                            : theme.colors.certTint}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.listRowTitle}>
                          {formatBlDate(log.date)}
                        </Text>
                        <Text style={styles.listRowSubtitle}>
                          {log.entries.length} პირი ტესტირებული
                          {log.status === 'closed' ? ' · დასრულებული' : ' · მიმდინარე'}
                        </Text>
                      </View>
                      {hasFail ? (
                        <View style={{
                          backgroundColor: BL_RESULT_COLORS.fail.bg,
                          borderRadius: 8,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderWidth: 1,
                          borderColor: BL_RESULT_COLORS.fail.border,
                        }}>
                          <Text style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: BL_RESULT_COLORS.fail.text,
                          }}>
                            ⚠ {logCounts.fail} FAIL
                          </Text>
                        </View>
                      ) : null}
                      <Ionicons name="chevron-forward" size={18} color={theme.colors.borderStrong} />
                    </Pressable>
                  );
                })}
                {breathalyzerLogs.length > 3 ? (
                  <ViewMoreRow
                    items={breathalyzerLogs.slice(3).map(() => ({ ionicon: 'journal-outline' }))}
                    total={breathalyzerLogs.length - 3}
                    onPress={() => router.push(`/projects/${id}/logs/breathalyzer` as any)}
                  />
                ) : null}
              </View>
            )}
          </View>

          {/* ── მონაწილეები (merged: inspector + crew) ── */}
          <View ref={participantsRef} collapsable={false} style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="person-add-outline" size={16} color={theme.colors.inkSoft} />
                <Text style={styles.sectionTitle}>{t('projects.participantsSection')}</Text>
                <Text style={styles.sectionCount}>{participantCount}</Text>
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

        </View>{/* end section cards wrapper */}

        </View>{/* end sheet */}
      </Reanimated.ScrollView>

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

      <CustomDropdown
        label={t('projects.chooseTemplateTitle')}
        options={templatePickerOptions.map(tpl => ({
          label: tpl.name,
          value: tpl.id,
          icon: <InspectionTypeAvatar category={tpl.category} size={36} />,
        }))}
        value={null}
        onChange={async (templateId) => {
          const tpl = templatePickerOptions.find(t => t.id === String(templateId));
          if (tpl && id) await createInspectionForTemplate(id, tpl);
        }}
        open={templatePickerVisible}
        onOpenChange={setTemplatePickerVisible}
      />

      {/* Full-screen map with all projects */}
      {mapModalVisible && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="auto">
          <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: insets.top + 12, paddingBottom: 12 }}>
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
              onPress={closeMapCard}
            >
              {mapMarkers.map(p => {
                const isActive = p.id === id;
                const pinBg = isActive ? theme.colors.accent : theme.colors.certTint;
                return (
                  <Marker
                    key={p.id}
                    coordinate={{ latitude: p.latitude!, longitude: p.longitude! }}
                    tracksViewChanges={false}
                    onPress={() => openMapCard(p)}
                  >
                    <View style={{ alignItems: 'center' }}>
                      <View style={{
                        backgroundColor: pinBg,
                        borderRadius: 20,
                        width: 32,
                        height: 32,
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.28,
                        shadowRadius: 4,
                        elevation: 5,
                      }}>
                        <Ionicons name="business" size={15} color={theme.colors.white} />
                      </View>
                      <View style={{
                        width: 0, height: 0,
                        borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 7,
                        borderLeftColor: 'transparent', borderRightColor: 'transparent',
                        borderTopColor: pinBg,
                        marginTop: -1,
                      }} />
                    </View>
                  </Marker>
                );
              })}
            </MapView>

            {allProjects.filter(p => p.latitude != null && p.longitude != null).length > 20 && (
              <View style={{ position: 'absolute', bottom: insets.bottom + 100, left: 16, right: 16, alignItems: 'center' }}>
                <View style={{ backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
                  <Text style={{ color: theme.colors.white, fontSize: 12, fontWeight: '600' }}>
                    ნაჩვენებია პირველი 20 პროექტი
                  </Text>
                </View>
              </View>
            )}

            {/* Slide-up project card */}
            {mapSelected && (
              <Animated.View style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                transform: [{ translateY: mapCardAnim }],
              }}>
                <View style={{
                  backgroundColor: theme.colors.surface,
                  borderTopLeftRadius: 22,
                  borderTopRightRadius: 22,
                  paddingHorizontal: 16,
                  paddingTop: 10,
                  paddingBottom: insets.bottom + 20,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: -4 },
                  shadowOpacity: 0.12,
                  shadowRadius: 16,
                  elevation: 12,
                }}>
                  <Pressable onPress={closeMapCard} hitSlop={12} style={{ alignItems: 'center', paddingBottom: 10 }}>
                    <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.colors.hairline }} />
                  </Pressable>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <ProjectAvatar project={mapSelected} size={44} />
                    <View style={{ flex: 1 }}>
                      <Text size="base" weight="bold" numberOfLines={1}>
                        {mapSelected.company_name || mapSelected.name}
                      </Text>
                      {mapSelected.address ? (
                        <Text size="xs" color={theme.colors.inkSoft} numberOfLines={1} style={{ marginTop: 2 }}>
                          {mapSelected.address}
                        </Text>
                      ) : null}
                    </View>
                    <Pressable
                      onPress={() => {
                        closeMapCard();
                        setMapModalVisible(false);
                        router.push(`/projects/${mapSelected.id}` as any);
                      }}
                      hitSlop={8}
                      style={{
                        backgroundColor: theme.colors.accent,
                        borderRadius: 10,
                        paddingHorizontal: 14,
                        paddingVertical: 9,
                      }}
                    >
                      <Text size="sm" weight="semibold" color={theme.colors.white}>გახსნა →</Text>
                    </Pressable>
                  </View>
                </View>
              </Animated.View>
            )}
          </View>
        </View>
      )}
    </View>
    </TourGuide>
  );
}
