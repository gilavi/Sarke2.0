import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Reanimated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Pencil, Plus } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import MapView, { PROVIDER_DEFAULT } from 'react-native-maps';
import { SkeletonMap } from '../../components/SkeletonMap';
import { routeForInspection } from '../../lib/inspectionRouting';
import { inspectionDisplayName } from '../../lib/shared/documentName';
import { useBottomSheet } from '../../components/BottomSheet';
import {
  projectsApi,
  projectFilesApi,
  questionnairesApi,
} from '../../lib/services';
import { inspectionRegistry } from '../../lib/inspection/registry';
import { useQueryClient } from '@tanstack/react-query';
import { qk, type UnifiedInspectionPreview } from '../../lib/apiHooks';
import { deleteUnifiedInspection, type UnifiedInspection } from './unifiedInspections';
import { useToast } from '../../lib/toast';
import { useTheme } from '../../lib/theme';
import { toErrorMessage } from '../../lib/logError';
import { friendlyError } from '../../lib/errorMap';
import type { ProjectFile, Template } from '../../types/models';
import { briefingsApi } from '../../lib/briefingsApi';
import { ordersApi } from '../../lib/ordersApi';
import { pickProjectLogo } from '../../lib/projectLogo';
import { a11y } from '../../lib/accessibility';
import { TourGuide, type TourStep } from '../../components/TourGuide';
import { useTranslation } from 'react-i18next';
import { usePhotoPicker } from '../../hooks/usePhotoPicker';
import { QuickActions, type QuickAction } from '../../components/QuickActions';
import { InspectionTypeAvatar } from '../../components/InspectionTypeAvatar';
import { CustomDropdown } from '../../components/ui/CustomDropdown';
import { EditProjectSheet } from '../../components/projects/EditProjectSheet';
import { UpcomingSection } from '../../components/projects/UpcomingSection';
import { getStyles } from './styles';
import { ProjectArchSvg, useArchAnimation } from './ProjectArchHeader';
import { useProjectDetailData } from './useProjectDetailData';
import { InspectionsSection } from './sections/InspectionsSection';
import { IncidentsSection } from './sections/IncidentsSection';
import { BriefingsSection } from './sections/BriefingsSection';
import { ReportsSection } from './sections/ReportsSection';
import { FilesAndOrdersSection } from './sections/FilesAndOrdersSection';
import { BreathalyzerSection } from './sections/BreathalyzerSection';
import { LoadingSkeletonScreen } from './LoadingSkeletonScreen';
import { ProjectMapModal, useProjectMapModal } from './ProjectMapModal';

export default function ProjectDetail() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles(theme), [theme]);
  // `useLocalSearchParams<{ id: string }>()` is only a TYPE cast - the runtime
  // value of `id` can be `string | string[] | undefined`. Coerce to a single
  // non-empty string here so downstream code (inspection create, navigation)
  // can rely on `id` being a usable project UUID without re-checking.
  const rawParams = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(rawParams.id) ? rawParams.id[0] : rawParams.id;
  const router = useRouter();
  const showActionSheetWithOptions = useBottomSheet();
  const toast = useToast();
  const { pickPhotosWithAnnotation } = usePhotoPicker();
  const insets = useSafeAreaInsets();

  const {
    loaded,
    pending,
    project, setProject,
    inspections: allInspections,
    templates, setTemplates,
    files, setFiles,
    incidents,
    briefings,
    reports,
    orders,
    breathalyzerLogs,
  } = useProjectDetailData(id);
  const queryClient = useQueryClient();

  const [filesBusy, setFilesBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const mapModalState = useProjectMapModal(project);

  // Gentle "breathing" pulse for the map location pin — matches the home ProjectCard.
  const breathe = useSharedValue(1);
  useEffect(() => {
    if (project?.latitude == null || project?.longitude == null) return;
    breathe.value = withRepeat(
      withTiming(1.35, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [project?.latitude, project?.longitude, breathe]);
  const mapDotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value }],
    opacity: interpolate(breathe.value, [1, 1.35], [1, 0.55]),
  }));

  const [templatePickerVisible, setTemplatePickerVisible] = useState(false);
  const [templatePickerOptions, setTemplatePickerOptions] = useState<Template[]>([]);

  // Project screen onboarding tour
  const heroRef = useRef<View>(null);
  const quickActionsRef = useRef<View>(null);
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
        targetRef: quickActionsRef,
        title: t('projects.tourActions'),
        body: t('projects.tourActionsBody'),
        position: 'bottom',
      },
      {
        targetRef: questionnairesRef,
        title: t('projects.tourHistory'),
        body: t('projects.tourHistoryBody'),
        position: 'bottom',
      },
    ],
    [t],
  );

  // Data now flows through React Query - cached, deduplicated, and
  // background-refreshed. No more useFocusEffect hammering Supabase
  // on every tab switch.

  const startNewInspection = () => {
    if (!id || typeof id !== 'string') {
      toast.error(t('errors.sessionLost', 'სესია არ მუშაობს, ხელახლა გახსენით პროექტი'));
      return;
    }
    const system = templates.filter(tpl => tpl.is_system);
    if (system.length === 0) {
      toast.error(t('projects.templateMissing'));
      return;
    }
    if (system.length === 1) {
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
          await deleteUnifiedInspection(item, (removedId) => {
            if (!id) return;
            queryClient.setQueryData<UnifiedInspectionPreview[]>(
              qk.inspections.unifiedByProject(id),
              prev => prev?.filter(x => x.id !== removedId) ?? [],
            );
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
    const results = await pickPhotosWithAnnotation();
    if (results.length === 0) return;
    await uploadAssets(
      results.map((r, i) => ({
        uri: r.uri,
        name: `photo-${Date.now()}_${i}.jpg`,
        mimeType: 'image/jpeg',
        sizeBytes: null,
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

  const quickActions: QuickAction[] = useMemo(
    () => [
      { label: 'შემოწმება',   colorKey: 'inspection',  onPress: startNewInspection },
      { label: 'ინციდენტი',   colorKey: 'incident',    onPress: () => id && router.push(`/incidents/new?projectId=${id}` as any) },
      { label: 'ინსტრუქტაჟი', colorKey: 'briefing',    onPress: () => id && router.push(`/briefings/new?projectId=${id}` as any) },
      { label: 'რეპორტი',     colorKey: 'report',      onPress: () => id && router.push(`/reports/new?projectId=${id}` as any) },
      { label: 'ფაილი',       colorKey: 'file',        onPress: uploadFile },
    ],
    [id, router, startNewInspection, uploadFile],
  );

  // Arch SVG morph + logo entrance animation. See ProjectArchHeader.tsx.
  const { archProps, logoStyle, scrollHandler } = useArchAnimation(loaded);

  if (!loaded && !project) {
    return <LoadingSkeletonScreen />;
  }

  return (
    <TourGuide tourId="project_screen_v2" steps={tourSteps}>
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Floating buttons - always fixed over content ── */}
      <Pressable
        onPress={() => router.back()}
        hitSlop={13}
        style={[styles.floatingBtn, { position: 'absolute', top: insets.top + 8, left: 16, zIndex: 30 }]}
        {...a11y('უკან', 'წინა გვერდზე დაბრუნება', 'button')}
      >
        <ChevronLeft size={20} color={theme.colors.ink} strokeWidth={1.5} />
      </Pressable>
      <Pressable
        onPress={() => setEditing(true)}
        hitSlop={13}
        style={[styles.floatingBtn, { position: 'absolute', top: insets.top + 8, right: 16, zIndex: 30 }]}
        {...a11y('რედაქტირება', 'პროექტის დეტალების შეცვლა', 'button')}
      >
        <Pencil size={18} color={theme.colors.ink} strokeWidth={1.5} />
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

        {/* Map hero - no parallax */}
        <View ref={heroRef} collapsable={false} style={{ height: 220, overflow: 'hidden', isolation: 'isolate' }}>
          {project?.latitude != null && project?.longitude != null ? (
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={mapModalState.open}
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
                showsCompass={false}
                showsScale={false}
                showsTraffic={false}
                showsPointsOfInterest={false}
                showsBuildings={false}
                showsIndoors={false}
                liteMode
                provider={PROVIDER_DEFAULT}
              />
              {/* Desaturate the map + custom accent pin — same treatment as the home ProjectCard. */}
              <View style={styles.mapDesaturate} pointerEvents="none" />
              <Reanimated.View style={[styles.mapDot, mapDotStyle]} pointerEvents="none" />
            </Pressable>
          ) : (
            <View style={StyleSheet.absoluteFill}>
              <SkeletonMap onAddLocation={() => setEditing(true)} />
            </View>
          )}

          {/* SVG arch - morphs between flat and curved via Reanimated */}
          <ProjectArchSvg archProps={archProps} fill={theme.colors.background} />
        </View>

        {/* ── Sheet - sits flush below the arch ── */}
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
                <Plus size={13} color={theme.colors.white} strokeWidth={1.5} />
              </View>
            </Pressable>
          </Reanimated.View>


        <View style={styles.projectInfoCenter}>
          <Text style={styles.heroName}>{project?.company_name || project?.name || '-'}</Text>
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

        {/* Quick actions - edgeInset matches parent paddingHorizontal to reach screen edges.
            Gutter is 16 so the first button's left edge lines up with the section cards below. */}
        <View ref={quickActionsRef} collapsable={false} style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
          <QuickActions actions={quickActions} scrollable edgeInset={20} />
        </View>

        {/* Upcoming schedule */}
        <UpcomingSection projectId={id} />

        {/* ── Section cards ── */}
        <View style={{ paddingHorizontal: 20, gap: 16, paddingTop: 8 }}>

          {/* ── Inspections (generic + equipment) ── */}
          <View ref={questionnairesRef} collapsable={false} style={styles.sectionCard}>
            <InspectionsSection
              id={id}
              allInspections={allInspections}
              templates={templates}
              loading={pending.inspections}
              onAdd={startNewInspection}
              onDelete={deleteInspection}
            />
          </View>

          {/* ── ინციდენტები ── */}
          <View style={styles.sectionCard}>
            <IncidentsSection id={id} incidents={incidents} loading={pending.incidents} />
          </View>

          {/* ── ინსტრუქტაჟი ── */}
          <View style={styles.sectionCard}>
            <BriefingsSection id={id} briefings={briefings} loading={pending.briefings} />
          </View>

          {/* ── რეპორტები ── (no sectionCard wrapper: the report rail scrolls
               full-bleed to the screen edge; ReportsSection owns its padding) */}
          <ReportsSection id={id} reports={reports} loading={pending.reports} />

          {/* ── ბრძანებები ── */}
          <View style={styles.sectionCard}>
            <FilesAndOrdersSection
              id={id}
              files={files}
              orders={orders}
              filesBusy={filesBusy}
              loading={pending.files || pending.orders}
              onUpload={uploadFile}
              onOpenFile={openFile}
              onDeleteFile={deleteFile}
            />
          </View>

          {/* ── ჟურნალები ── */}
          <View style={styles.sectionCard}>
            <BreathalyzerSection id={id} breathalyzerLogs={breathalyzerLogs} loading={pending.breathalyzer} />
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
          label: inspectionDisplayName(tpl.name),
          value: tpl.id,
          icon: <InspectionTypeAvatar category={tpl.category} size={52} circle muted />,
        }))}
        value={null}
        onChange={async (templateId) => {
          const tpl = templatePickerOptions.find(t => t.id === String(templateId));
          if (!tpl) return;
          if (!id || typeof id !== 'string') {
            toast.error(t('errors.sessionLost', 'სესია არ მუშაობს, ხელახლა გახსენით პროექტი'));
            return;
          }
          await createInspectionForTemplate(id, tpl);
        }}
        open={templatePickerVisible}
        onOpenChange={setTemplatePickerVisible}
      />

      <ProjectMapModal state={mapModalState} />
    </View>
    </TourGuide>
  );
}
