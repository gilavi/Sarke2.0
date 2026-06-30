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
import { useBottomSheet } from '../../components/BottomSheet';
import {
  projectsApi,
  projectFilesApi,
} from '../../lib/services';
import { useQueryClient } from '@tanstack/react-query';
import { qk, invalidateRecordLists, type UnifiedInspectionPreview } from '../../lib/apiHooks';
import { deleteUnifiedInspection, type UnifiedInspection } from './unifiedInspections';
import { useToast } from '../../lib/toast';
import { useTheme } from '../../lib/theme';
import { toErrorMessage } from '../../lib/logError';
import { friendlyError } from '../../lib/errorMap';
import type { ProjectFile } from '../../types/models';
import { briefingsApi } from '../../lib/briefingsApi';
import { ordersApi } from '../../lib/ordersApi';
import { pickProjectLogo } from '../../lib/projectLogo';
import { a11y } from '../../lib/accessibility';
import { TourGuide, type TourStep } from '../../components/TourGuide';
import { useTranslation } from 'react-i18next';
import { usePhotoPicker } from '../../hooks/usePhotoPicker';
import { QuickActions, type QuickAction } from '../../components/QuickActions';
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
import { RiskAssessmentSection } from './sections/RiskAssessmentSection';
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
    riskAssessments,
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

  // Enter the unified start flow with the project pre-attached: its first step
  // picks the template (type), then creates the inspection straight into the
  // wizard. No pre-flow action sheet, and nothing is saved until the wizard.
  const startNewInspection = () => {
    if (!id || typeof id !== 'string') {
      toast.error(t('errors.sessionLost'));
      return;
    }
    router.push(`/inspections/new?projectId=${id}` as any);
  };

  const deletingInspIdsRef = useRef<Set<string>>(new Set());

  const deleteInspection = (item: UnifiedInspection) => {
    showActionSheetWithOptions(
      {
        title: t('common.areYouSure'),
        options: [t('projects.deleteConfirmYes'), t('projects.cancelOption')],
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
          invalidateRecordLists(queryClient);
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
    if (success > 0 && failed === 0) toast.success(t('projects.uploadSuccess', { count: success }));
    else if (success > 0 && failed > 0) toast.error(t('projects.uploadPartial', { success, failed }));
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
        title: t('projects.uploadSheetTitle'),
        options: [t('projects.uploadOptionPhoto'), t('projects.uploadOptionFile'), t('projects.cancelOption')],
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
        title: t('common.areYouSure'),
        options: [t('projects.deleteConfirmYes'), t('projects.cancelOption')],
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
      { label: t('projects.quickActionInspection'),   colorKey: 'inspection',  onPress: startNewInspection },
      { label: t('projects.quickActionIncident'),   colorKey: 'incident',    onPress: () => id && router.push(`/incidents/new?projectId=${id}` as any) },
      { label: t('projects.quickActionBriefing'), colorKey: 'briefing',    onPress: () => id && router.push(`/briefings/new?projectId=${id}` as any) },
      { label: t('projects.quickActionReport'),     colorKey: 'report',      onPress: () => id && router.push(`/reports/new?projectId=${id}` as any) },
      { label: t('projects.uploadOptionFile'),       colorKey: 'file',        onPress: uploadFile },
    ],
    [id, router, startNewInspection, uploadFile, t],
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
        {...a11y(t('common.back'), t('projects.backA11yHint'), 'button')}
      >
        <ChevronLeft size={20} color={theme.colors.ink} strokeWidth={1.5} />
      </Pressable>
      <Pressable
        onPress={() => setEditing(true)}
        hitSlop={13}
        style={[styles.floatingBtn, { position: 'absolute', top: insets.top + 8, right: 16, zIndex: 30 }]}
        {...a11y(t('common.edit'), t('projects.editA11yHint'), 'button')}
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
              {...a11y(t('projects.mapA11yLabel'), t('projects.mapA11yHint'), 'button')}
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
              {...a11y(t('projects.editLogoA11yLabel'), t('projects.editLogoA11yHint'), 'button')}
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
              {...a11y(t('projects.callA11yLabel'), `${project.contact_phone}`, 'button')}
            >
              <Text style={styles.heroPhoneText}>{project.contact_phone}</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Quick actions - edgeInset matches parent paddingHorizontal (20) to reach screen
            edges, so the first button's left edge lines up with the flat sections below. */}
        <View ref={quickActionsRef} collapsable={false} style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
          <QuickActions actions={quickActions} scrollable edgeInset={20} />
        </View>

        {/* Upcoming schedule */}
        <UpcomingSection projectId={id} />

        {/* ── Sections (flat, flush to the 20px gutter) ── */}
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

          {/* ── რეპორტები ── (full-bleed rail; rendered without a wrapper View so
               the rail can scroll edge-to-edge, resting its cards at the gutter) */}
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

          {/* ── რისკების შეფასება ── */}
          <View style={styles.sectionCard}>
            <RiskAssessmentSection id={id} riskAssessments={riskAssessments} loading={pending.riskAssessment} />
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

      <ProjectMapModal state={mapModalState} />
    </View>
    </TourGuide>
  );
}
