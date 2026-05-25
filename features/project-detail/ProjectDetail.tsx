import { useCallback, useMemo, useRef, useState } from 'react';
import {
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
import { inspectionDisplayName } from '../../lib/shared/documentName';
import { useBottomSheet } from '../../components/BottomSheet';
import {
  projectsApi,
  projectFilesApi,
  questionnairesApi,
} from '../../lib/services';
import { inspectionRegistry } from '../../lib/inspection/registry';
import { buildUnifiedInspections, deleteUnifiedInspection, type UnifiedInspection } from './unifiedInspections';
import { useToast } from '../../lib/toast';
import { useTheme } from '../../lib/theme';
import { toErrorMessage } from '../../lib/logError';
import { friendlyError } from '../../lib/errorMap';
import type { CrewMember, Project, ProjectFile, Template } from '../../types/models';
import { briefingsApi } from '../../lib/briefingsApi';
import { ordersApi } from '../../lib/ordersApi';
import { RoleSlotList } from '../../components/RoleSlotList';
import { pickProjectLogo } from '../../lib/projectLogo';
import { useSession } from '../../lib/session';
import { a11y } from '../../lib/accessibility';
import { TourGuide, type TourStep } from '../../components/TourGuide';
import { useTranslation } from 'react-i18next';
import { usePhotoWithLocation } from '../../hooks/usePhotoWithLocation';
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
  // `useLocalSearchParams<{ id: string }>()` is only a TYPE cast — the runtime
  // value of `id` can be `string | string[] | undefined`. Coerce to a single
  // non-empty string here so downstream code (inspection create, navigation)
  // can rely on `id` being a usable project UUID without re-checking.
  const rawParams = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(rawParams.id) ? rawParams.id[0] : rawParams.id;
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
  const mapModalState = useProjectMapModal(project);
  const [templatePickerVisible, setTemplatePickerVisible] = useState(false);
  const [templatePickerOptions, setTemplatePickerOptions] = useState<Template[]>([]);

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

  // Arch SVG morph + logo entrance animation. See ProjectArchHeader.tsx.
  const { archProps, logoStyle, scrollHandler } = useArchAnimation(loaded);

  if (!loaded && !project) {
    return <LoadingSkeletonScreen />;
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
            <InspectionsSection
              id={id}
              allInspections={allInspections}
              templates={templates}
              onAdd={startNewInspection}
              onDelete={deleteInspection}
            />
          </View>

          {/* ── ინციდენტები ── */}
          <View style={styles.sectionCard}>
            <IncidentsSection id={id} incidents={incidents} />
          </View>

          {/* ── ინსტრუქტაჟი ── */}
          <View style={styles.sectionCard}>
            <BriefingsSection id={id} briefings={briefings} />
          </View>

          {/* ── რეპორტები ── */}
          <View style={styles.sectionCard}>
            <ReportsSection id={id} reports={reports} />
          </View>

          {/* ── ბრძანებები ── */}
          <View ref={filesRef} collapsable={false} style={styles.sectionCard}>
            <FilesAndOrdersSection
              id={id}
              files={files}
              orders={orders}
              filesBusy={filesBusy}
              onUpload={uploadFile}
              onOpenFile={openFile}
              onDeleteFile={deleteFile}
            />
          </View>

          {/* ── ჟურნალები ── */}
          <View style={styles.sectionCard}>
            <BreathalyzerSection id={id} breathalyzerLogs={breathalyzerLogs} />
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
          label: inspectionDisplayName(tpl.name),
          value: tpl.id,
          icon: <InspectionTypeAvatar category={tpl.category} size={36} />,
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
