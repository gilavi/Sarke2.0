import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Keyboard,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  interpolate,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import { Path, Svg } from 'react-native-svg';
import { useSheetKeyboardMargin } from '../../lib/useSheetKeyboardMargin';
import { Image } from 'expo-image';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { SheetLayout } from '../../components/SheetLayout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { MapPreview } from '../../components/MapPreview';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { SkeletonMap } from '../../components/SkeletonMap';
import { LocationRow } from '../../components/LocationRow';
import { MapPickerInline } from '../../components/MapPickerInline';
import { routeForInspection } from '../../lib/inspectionRouting';
import { useBottomSheet } from '../../components/BottomSheet';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Button } from '../../components/ui';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import { Skeleton, SkeletonCard, SkeletonListCard } from '../../components/Skeleton';
import { MapPicker, type LatLng } from '../../components/MapPicker';
import { SectionEmptyState } from '../../components/EmptyState';
import { UploadedFilesSection } from '../../components/UploadedFilesSection';
import {
  projectsApi,
  projectFilesApi,
  questionnairesApi,
  templatesApi,
  incidentsApi,
  reportsApi,
} from '../../lib/services';
import { bobcatApi } from '../../lib/bobcatService';
import { excavatorApi } from '../../lib/excavatorService';
import { generalEquipmentApi } from '../../lib/generalEquipmentService';
import {
  useProject,
  useInspectionsByProject,
  useTemplates,
  useProjectFiles,
  useIncidentsByProject,
  useBriefingsByProject,
  useReportsByProject,
  useCalendarEvents,
  useBobcatInspectionsByProject,
  useExcavatorInspectionsByProject,
  useGeneralEquipmentInspectionsByProject,
} from '../../lib/apiHooks';
import { supabase, STORAGE_BUCKETS } from '../../lib/supabase';
import { useToast } from '../../lib/toast';
import { imageForDisplay } from '../../lib/imageUrl';
import { useTheme } from '../../lib/theme';
import { INCIDENT_COLORS, STATUS_DOT_COLOR } from '../../lib/statusColors';

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
import { setPhotoPickerCallback, setPhotoAnnotateCallback } from '../../lib/photoPickerBus';
import { QuickActions, type QuickAction } from '../../components/QuickActions';
import { InspectionTypeAvatar } from '../../components/InspectionTypeAvatar';
import { TemplatePickerModal } from '../../components/TemplatePickerModal';

const SCREEN_W = Dimensions.get('window').width;
const SVG_H = 80;      // total SVG element height
const SVG_EDGE_Y = 68; // y within SVG where arch edges sit (stays fixed)

const AnimatedPath = Reanimated.createAnimatedComponent(Path);

export default function ProjectDetail() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const showActionSheetWithOptions = useBottomSheet();
  const toast = useToast();
  const session = useSession();
  const insets = useSafeAreaInsets();

  const [project, setProject] = useState<Project | null>(null);
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [bobcatInspections, setBobcatInspections] = useState<any[]>([]);
  const [excavatorInspections, setExcavatorInspections] = useState<any[]>([]);
  const [generalEquipmentInspections, setGeneralEquipmentInspections] = useState<any[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [filesBusy, setFilesBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [templatePickerVisible, setTemplatePickerVisible] = useState(false);
  const [templatePickerOptions, setTemplatePickerOptions] = useState<Template[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loaded, setLoaded] = useState(false);

  // React Query hooks provide cached data instantly + background refetch.
  // We sync their results into local state so existing mutations (crew edit,
  // file upload, etc.) continue to work via setProject / setFiles.
  const projectQ = useProject(id);
  const questionnairesQ = useInspectionsByProject(id);
  const bobcatQ = useBobcatInspectionsByProject(id);
  const excavatorQ = useExcavatorInspectionsByProject(id);
  const generalEquipmentQ = useGeneralEquipmentInspectionsByProject(id);
  const templatesQ = useTemplates();
  const filesQ = useProjectFiles(id);
  const incidentsQ = useIncidentsByProject(id);
  const briefingsQ = useBriefingsByProject(id);
  const reportsQ = useReportsByProject(id);

  // Read-only data consumed directly from the query cache (no local state needed)
  const incidents = incidentsQ.data ?? [];
  const briefings = briefingsQ.data ?? [];
  const reports = reportsQ.data ?? [];

  useEffect(() => {
    if (projectQ.data !== undefined) setProject(projectQ.data);
  }, [projectQ.data]);
  useEffect(() => {
    if (questionnairesQ.data !== undefined) setQuestionnaires(questionnairesQ.data);
  }, [questionnairesQ.data]);
  useEffect(() => {
    if (bobcatQ.data !== undefined) setBobcatInspections(bobcatQ.data);
  }, [bobcatQ.data]);
  useEffect(() => {
    if (excavatorQ.data !== undefined) setExcavatorInspections(excavatorQ.data);
  }, [excavatorQ.data]);
  useEffect(() => {
    if (generalEquipmentQ.data !== undefined) setGeneralEquipmentInspections(generalEquipmentQ.data);
  }, [generalEquipmentQ.data]);
  useEffect(() => {
    if (templatesQ.data !== undefined) setTemplates(templatesQ.data);
  }, [templatesQ.data]);
  useEffect(() => {
    if (filesQ.data !== undefined) setFiles(filesQ.data);
  }, [filesQ.data]);
  useEffect(() => {
    const anyLoading = projectQ.isLoading || questionnairesQ.isLoading || bobcatQ.isLoading
      || excavatorQ.isLoading || generalEquipmentQ.isLoading || templatesQ.isLoading
      || filesQ.isLoading || incidentsQ.isLoading || briefingsQ.isLoading || reportsQ.isLoading;
    if (!anyLoading) setLoaded(true);
  }, [projectQ.isLoading, questionnairesQ.isLoading, bobcatQ.isLoading, excavatorQ.isLoading,
      generalEquipmentQ.isLoading, templatesQ.isLoading, filesQ.isLoading,
      incidentsQ.isLoading, briefingsQ.isLoading, reportsQ.isLoading]);

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

  // ── Unified inspections list (generic + equipment) ──
  type UnifiedInspection = {
    id: string;
    template_id: string;
    status: 'draft' | 'completed';
    created_at: string;
    source: 'generic' | 'bobcat' | 'excavator' | 'general_equipment';
  };

  const allInspections = useMemo<UnifiedInspection[]>(() => {
    const generic: UnifiedInspection[] = questionnaires.map(q => ({
      id: q.id,
      template_id: q.template_id,
      status: q.status,
      created_at: q.created_at,
      source: 'generic',
    }));
    const bobcat: UnifiedInspection[] = bobcatInspections.map(b => ({
      id: b.id,
      template_id: b.templateId,
      status: b.status,
      created_at: b.createdAt,
      source: 'bobcat',
    }));
    const excavator: UnifiedInspection[] = excavatorInspections.map(e => ({
      id: e.id,
      template_id: e.templateId,
      status: e.status,
      created_at: e.createdAt,
      source: 'excavator',
    }));
    const ge: UnifiedInspection[] = generalEquipmentInspections.map(g => ({
      id: g.id,
      template_id: g.templateId,
      status: g.status,
      created_at: g.createdAt,
      source: 'general_equipment',
    }));
    return [...generic, ...bobcat, ...excavator, ...ge].sort(
      (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
    );
  }, [questionnaires, bobcatInspections, excavatorInspections, generalEquipmentInspections]);

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
      let newId: string;
      if (tpl.category === 'bobcat') {
        newId = (await bobcatApi.create({ projectId, templateId: tpl.id })).id;
      } else if (tpl.category === 'excavator') {
        newId = (await excavatorApi.create({ projectId, templateId: tpl.id })).id;
      } else if (tpl.category === 'general_equipment') {
        newId = (await generalEquipmentApi.create({ projectId, templateId: tpl.id })).id;
      } else {
        newId = (await questionnairesApi.create({ projectId, templateId: tpl.id })).id;
      }
      router.push(routeForInspection(tpl.category, newId, false) as any);
    } catch (e) {
      toast.error(friendlyError(e, t('errors.createFailed')));
    }
  };

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
        try {
          if (item.source === 'bobcat') {
            const { error } = await supabase.from('bobcat_inspections').delete().eq('id', item.id);
            if (error) throw error;
            setBobcatInspections(prev => prev.filter(x => x.id !== item.id));
          } else if (item.source === 'excavator') {
            const { error } = await supabase.from('excavator_inspections').delete().eq('id', item.id);
            if (error) throw error;
            setExcavatorInspections(prev => prev.filter(x => x.id !== item.id));
          } else if (item.source === 'general_equipment') {
            const { error } = await supabase.from('general_equipment_inspections').delete().eq('id', item.id);
            if (error) throw error;
            setGeneralEquipmentInspections(prev => prev.filter(x => x.id !== item.id));
          } else {
            await questionnairesApi.remove(item.id);
            setQuestionnaires(prev => prev.filter(x => x.id !== item.id));
          }
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

  const pickPhotoWithPicker = () => {
    setPhotoPickerCallback(localUri => {
      if (!localUri) return;
      setPhotoAnnotateCallback(async annotatedUri => {
        const sourceUri = annotatedUri ?? localUri;
        await uploadAssets([{
          uri: sourceUri,
          name: `photo-${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
          sizeBytes: null,
        }]);
      });
      router.replace(`/photo-annotate?uri=${encodeURIComponent(localUri)}` as any);
    });
    router.push('/photo-picker' as any);
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

  // ── Arch SVG morph animation ──────────────────────────────────────────────
  // archMountProgress: 0→1 on load (arch curves in from flat)
  // archScrollDelta: scroll-driven offset (negative = deeper arch on pull-down)
  const archMountProgress = useSharedValue(0);
  const archScrollDelta = useSharedValue(0);
  const logoProgress = useSharedValue(0);

  // peakY: controls the SVG bezier control point.
  //   SVG_EDGE_Y = flat (no curve), 0 = full arch, negative = extra deep
  const archPeakY = useDerivedValue(() => {
    'worklet';
    const mount = interpolate(archMountProgress.value, [0, 1], [SVG_EDGE_Y, 0]);
    return mount + archScrollDelta.value;
  });

  const archProps = useAnimatedProps(() => {
    'worklet';
    const p = archPeakY.value;
    const W = SCREEN_W;
    return {
      d: `M0,${SVG_EDGE_Y} Q${W / 2},${p.toFixed(1)} ${W},${SVG_EDGE_Y} L${W},${SVG_H} L0,${SVG_H} Z`,
    };
  });

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoProgress.value,
    transform: [{ scale: interpolate(logoProgress.value, [0, 1], [0.6, 1]) }],
  }));

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      archScrollDelta.value = interpolate(
        event.contentOffset.y,
        [-80, 0, 100],
        [-22, 0, SVG_EDGE_Y],
        'clamp' as any,
      );
    },
  });

  useEffect(() => {
    if (!loaded) return;
    archMountProgress.value = withSpring(1, { damping: 16, stiffness: 120 });
    logoProgress.value = withDelay(160, withSpring(1, { damping: 12, stiffness: 150 }));
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

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
        hitSlop={8}
        style={[styles.floatingBtn, { position: 'absolute', top: insets.top + 8, left: 16, zIndex: 30 }]}
        {...a11y('უკან', 'წინა გვერდზე დაბრუნება', 'button')}
      >
        <Ionicons name="chevron-back" size={20} color="#444441" />
      </Pressable>
      <Pressable
        onPress={() => setEditing(true)}
        hitSlop={8}
        style={[styles.floatingBtn, { position: 'absolute', top: insets.top + 8, right: 16, zIndex: 30 }]}
        {...a11y('რედაქტირება', 'პროექტის დეტალების შეცვლა', 'button')}
      >
        <Ionicons name="pencil-outline" size={18} color="#444441" />
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
          <Svg
            width={SCREEN_W}
            height={SVG_H}
            style={{ position: 'absolute', bottom: 0, left: 0 }}
            pointerEvents="none"
          >
            <AnimatedPath animatedProps={archProps} fill={theme.colors.background} />
          </Svg>
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
                <Ionicons name="add" size={13} color="#fff" />
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
              hitSlop={8}
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
              <Pressable onPress={startNewInspection} hitSlop={8}>
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
              <Pressable onPress={() => router.push(`/incidents/new?projectId=${id}` as any)} hitSlop={8}>
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
              <Pressable onPress={() => id && router.push(`/briefings/new?projectId=${id}` as any)} hitSlop={8}>
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
                hitSlop={8}
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
                    items={overflowReports.map(() => ({ ionicon: 'document-text-outline' }))}
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
                <Ionicons name="cloud-upload-outline" size={16} color={theme.colors.inkSoft} />
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
              <SectionEmptyState type="documents" />
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
                    items={overflowFiles.map(() => ({ ionicon: 'document-outline' }))}
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

      <TemplatePickerModal
        visible={templatePickerVisible}
        templates={templatePickerOptions}
        title={t('projects.chooseTemplateTitle')}
        onSelect={async tpl => {
          setTemplatePickerVisible(false);
          if (id) await createInspectionForTemplate(id, tpl);
        }}
        onClose={() => setTemplatePickerVisible(false)}
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
            >
              {mapMarkers.map(p => (
                <Marker
                  key={p.id}
                  coordinate={{ latitude: p.latitude!, longitude: p.longitude! }}
                  pinColor={p.id === id ? theme.colors.accent : undefined}
                  title={p.company_name || p.name}
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

function StatItem({ number, label, theme }: { number: number; label: string; theme: any }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: theme.colors.ink }}>{number}</Text>
      <Text style={{ fontSize: 11, color: theme.colors.inkSoft, marginTop: 2, fontWeight: '500' }}>{label}</Text>
    </View>
  );
}

function EmptyState({ text }: { text: string }) {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <View style={styles.emptyState}>
      <Ionicons name="document-text-outline" size={28} color={theme.colors.borderStrong} />
      <Text style={styles.emptyStateText}>{text}</Text>
    </View>
  );
}

const FileThumbnail = memo(function FileThumbnail({ file }: { file: ProjectFile }) {
  const { theme } = useTheme();
  const isImage = !!file.mime_type?.startsWith('image/');
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    if (!isImage) return;
    let cancelled = false;
    (async () => {
      try {
        const u = await imageForDisplay(STORAGE_BUCKETS.projectFiles, file.storage_path);
        if (!cancelled) setUri(u);
      } catch {
        // fall through to icon fallback
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isImage, file.storage_path]);

  const tile = useMemo(
    () => ({
      width: 72,
      aspectRatio: 16 / 9,
      borderRadius: 8,
      backgroundColor: theme.colors.surfaceSecondary,
      overflow: 'hidden' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    }),
    [theme.colors.surfaceSecondary],
  );

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
});

/**
 * "View more" row at the bottom of a section preview.
 * Renders stacked inspection-type icons for the hidden items.
 * Inputs:
 *   - items: icon descriptors for the overflow items
 *   - total: number of overflow items shown in the "+ N მეტი" label
 *   - onPress: navigate to the full list screen
 */
function ViewMoreRow({
  items,
  total,
  onPress,
}: {
  items: { category?: string | null; ionicon?: string }[];
  total: number;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const avatarItems = items.slice(0, 3);

  return (
    <Pressable
      onPress={onPress}
      style={styles.listRow}
      {...a11y(`+ ${total} მეტი`, 'სრული სიის გახსნა', 'button')}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {avatarItems.map((item, idx) => (
          item.category != null ? (
            <View key={idx} style={{ marginLeft: idx === 0 ? 0 : -10 }}>
              <InspectionTypeAvatar category={item.category} size={32} />
            </View>
          ) : (
            <View
              key={idx}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#FFFFFF',
                borderWidth: 1.5,
                borderColor: '#F5F3EE',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: idx === 0 ? 0 : -10,
                shadowColor: '#000',
                shadowOpacity: 0.06,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Ionicons
                name={(item.ionicon ?? 'document-outline') as any}
                size={14}
                color={theme.colors.inkSoft}
              />
            </View>
          )
        ))}
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
  const styles = useMemo(() => getStyles(theme), [theme]);

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
  const [company, setCompany] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState<LatLng | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);
  const keyboardMargin = useSheetKeyboardMargin();

  // Sync when project changes / modal opens
  useFocusEffect(
    useCallback(() => {
      if (visible && project) {
        setCompany(project.company_name || project.name);
        setAddress(project.address ?? '');
        setPhone(project.contact_phone ?? '');
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
    if (!project || !company.trim()) return;
    setBusy(true);
    try {
      const saved = (await projectsApi.update(project.id, {
        name: company.trim(),
        company_name: company.trim(),
        address: address.trim() || null,
        contact_phone: phone.trim() || null,
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
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* Backdrop */}
        <Pressable
          style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
          onPress={() => mapVisible ? setMapVisible(false) : onClose()}
          {...a11y(t('common.close'), 'შეეხეთ ფონის დასახურად', 'button')}
        />
        {/* Card — marginBottom rides the iOS keyboard 1:1 */}
        <Animated.View style={{ width: '100%', marginBottom: keyboardMargin }}>
          <Pressable onPress={() => {}} style={{ width: '100%' }}>
              <SheetLayout
                maxHeightRatio={0.92}
                header={{ title: t('projects.edit'), onClose }}
                footer={
                  <Button
                    title={t('common.save')}
                    size="lg"
                    onPress={save}
                    loading={busy}
                    disabled={!company.trim()}
                  />
                }
              >
                <View style={{ alignItems: 'center', gap: 8, paddingVertical: 4 }}>
                  <ProjectAvatar
                    project={{ name: company, logo }}
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

                <FloatingLabelInput
                  label={t('common.company')}
                  required
                  value={company}
                  onChangeText={setCompany}
                  autoFocus
                />

                <FloatingLabelInput
                  label={t('common.address')}
                  value={address}
                  onChangeText={setAddress}
                />

                <FloatingLabelInput
                  label="საკონტაქტო ტელეფონი"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />

                <LocationRow pin={pin} address={address} onPress={() => { Keyboard.dismiss(); setMapVisible(true); }} />
              </SheetLayout>
          </Pressable>
        </Animated.View>

        {/* Full-screen map overlay — no nested Modal */}
        {mapVisible && (
          <View style={StyleSheet.absoluteFillObject}>
            <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: insets.top + 12, paddingVertical: 12 }}>
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

function IncidentRow({
  incident,
  onPress,
}: {
  incident: Incident;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const badge = INCIDENT_COLORS[incident.type as IncidentType] ?? INCIDENT_COLORS.minor;
  const styles = useMemo(() => getStyles(theme), [theme]);

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

// ── Upcoming section ────────────────────────────────────────────────────────


function UpcomingSection({ projectId }: { projectId: string | undefined }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const events = useCalendarEvents();

  const upcoming = useMemo(() => {
    if (!projectId) return [];
    return events
      .filter(e => !e.isPast && e.projectId === projectId)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 3);
  }, [events, projectId]);

  if (upcoming.length === 0) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function relativeLabel(date: Date): string {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return t('calendar.dueToday', 'დღეს');
    if (diff > 0) return t('calendar.inDays', { count: diff, defaultValue: `${diff} დღეში` });
    return t('calendar.overdueDays', { count: Math.abs(diff), defaultValue: `${Math.abs(diff)} დღე გადაცილდა` });
  }

  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <View style={[styles.sectionCard, { marginHorizontal: 16, marginTop: 12 }]}>
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="calendar-outline" size={16} color={theme.colors.inkSoft} />
          <Text style={styles.sectionTitle}>{t('calendar.upcomingSection')}</Text>
          <Text style={styles.sectionCount}>{upcoming.length}</Text>
        </View>
        <Pressable
          onPress={() => router.push(`/(tabs)/calendar?projectId=${projectId}` as any)}
          hitSlop={8}
        >
          <Text style={styles.sectionAddLink}>{t('common.all', 'ყველა')}</Text>
        </Pressable>
      </View>
      <View style={{ gap: 8, marginTop: 10 }}>
        {upcoming.map(event => {
          const color = STATUS_DOT_COLOR[event.status as keyof typeof STATUS_DOT_COLOR] ?? theme.colors.inkSoft;
          const iconName = event.type === 'inspection' ? 'shield-checkmark-outline' : 'people-outline';
          return (
            <Pressable
              key={event.id}
              onPress={() => router.push(`/(tabs)/calendar?projectId=${projectId}` as any)}
              style={styles.listRow}
            >
              <View
                style={[
                  styles.statusIcon,
                  { backgroundColor: color + '20', width: 30, height: 30, borderRadius: 8 },
                ]}
              >
                <Ionicons name={iconName as any} size={16} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.listRowTitle} numberOfLines={1}>{event.title}</Text>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '600', color }}>
                {relativeLabel(event.date)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function getStyles(theme: any) {
  return StyleSheet.create({
  // ── Sheet — sits flush below the arch ──
  sheet: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  // Arch peak (actual bezier peak at t=0.5): y = 0.25*SVG_EDGE_Y + 0 + 0.25*SVG_EDGE_Y = 34 within SVG.
  // Screen y = (220 - 80) + 34 = 174. Logo half = 40. marginTop = 174 - 220 - 40 = -86.
  logoContainer: {
    alignItems: 'center',
    marginTop: -86,
    marginBottom: 4,
  },
  logoOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.accent,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    overflow: 'hidden',
  },
  logoImage: {
    width: 74,
    height: 74,
    borderRadius: 37,
  },
  logoInitials: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  logoBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.accent,
    borderWidth: 2,
    borderColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Floating pill buttons over map
  floatingBtn: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  // Centered project info below logo
  projectInfoCenter: {
    paddingTop: 6,
    paddingHorizontal: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  heroName: {
    fontSize: 22,
    fontWeight: '600',
    color: theme.colors.ink,
    marginBottom: 4,
    textAlign: 'center',
  },
  heroMetaText: {
    fontSize: 13,
    color: theme.colors.inkSoft,
    textAlign: 'center',
    marginTop: 2,
  },
  heroPhoneText: {
    fontSize: 13,
    color: theme.colors.accent,
    fontWeight: '600',
    marginTop: 6,
  },
  // Stats row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 16,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: theme.colors.hairline,
  },

  // ── Section Cards ──
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
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
