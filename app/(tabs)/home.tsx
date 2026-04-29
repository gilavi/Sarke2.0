import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../../lib/session';
import { PressableScale } from '../../components/animations/PressableScale';
import { ProjectAvatar } from '../../components/ProjectAvatar';
import { pickProjectLogo } from '../../lib/projectLogo';
import {
  qualificationsApi,
  isExpiringSoon,
  projectsApi,
  questionnairesApi,
  templatesApi,
} from '../../lib/services';
// shareStoredPdf import removed — PDF sharing now lives on the inspection
// detail screen (which fetches certificates list) post 0006 decoupling.
import { useTheme, withOpacity } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import { logError, toErrorMessage } from '../../lib/logError';
import { friendlyError } from '../../lib/errorMap';
import { Button, Field, Input } from '../../components/ui';
import { FabButton } from '../../components/primitives';
import { NumberPop, useScrollHeader } from '../../components/animations';
import { Skeleton } from '../../components/Skeleton';
import { MapPicker, type LatLng } from '../../components/MapPicker';
import { MapPreview } from '../../components/MapPreview';
import { useToast } from '../../lib/toast';
import { haptic } from '../../lib/haptics';
import { useTranslation } from 'react-i18next';
import type { Inspection, Project, Qualification, Template } from '../../types/models';

export default function HomeScreen() {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const pickerStyles = useMemo(() => getpickerStyles(theme), [theme]);
  const { state } = useSession();
  const router = useRouter();
  const [certs, setCerts] = useState<Qualification[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [recent, setRecent] = useState<Inspection[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerInitialView, setPickerInitialView] = useState<'list' | 'new'>('list');
  // `loaded` flips true after the first fetch finishes (success or not) so
  // we know when to swap skeletons for real content. Pull-to-refresh doesn't
  // re-show skeletons — the RefreshControl spinner already signals that.
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const CACHE_KEYS = {
    certs: 'home_cache_certs',
    templates: 'home_cache_templates',
    recent: 'home_cache_recent',
    projects: 'home_cache_projects',
  };

  const hydrateFromCache = useCallback(async () => {
    try {
      const [cRaw, tRaw, rRaw, pRaw] = await Promise.all([
        AsyncStorage.getItem(CACHE_KEYS.certs),
        AsyncStorage.getItem(CACHE_KEYS.templates),
        AsyncStorage.getItem(CACHE_KEYS.recent),
        AsyncStorage.getItem(CACHE_KEYS.projects),
      ]);
      if (cRaw) setCerts(JSON.parse(cRaw));
      if (tRaw) setTemplates(JSON.parse(tRaw));
      if (rRaw) setRecent(JSON.parse(rRaw));
      if (pRaw) setProjects(JSON.parse(pRaw));
      // If we have any cached data, mark as loaded so skeletons disappear
      if (cRaw || tRaw || rRaw || pRaw) setLoaded(true);
    } catch {
      // ignore cache read errors
    }
  }, []);

  const load = useCallback(async () => {
    try {
      // null = that API failed; [] = succeeded with empty results.
      // Keeping them distinct prevents failed fetches from wiping cached data.
      const [c, t, r, p] = await Promise.all([
        qualificationsApi.list().catch((e) => { logError(e, 'home.qualifications'); return null; }),
        templatesApi.list().catch((e) => { logError(e, 'home.templates'); return null; }),
        questionnairesApi.recent(10).catch((e) => { logError(e, 'home.recent'); return null; }),
        projectsApi.list().catch((e) => { logError(e, 'home.projects'); return null; }),
      ]);

      const allFailed = c === null && t === null && r === null && p === null;
      setLoadError(allFailed);

      // Only update state (and cache) when the individual fetch succeeded.
      if (c !== null) { setCerts(c); void AsyncStorage.setItem(CACHE_KEYS.certs, JSON.stringify(c)).catch(() => {}); }
      if (t !== null) { setTemplates(t); void AsyncStorage.setItem(CACHE_KEYS.templates, JSON.stringify(t)).catch(() => {}); }
      if (r !== null) { setRecent(r); void AsyncStorage.setItem(CACHE_KEYS.recent, JSON.stringify(r)).catch(() => {}); }
      if (p !== null) { setProjects(p); void AsyncStorage.setItem(CACHE_KEYS.projects, JSON.stringify(p)).catch(() => {}); }
    } catch (e) {
      logError(e, 'home.load');
      setLoadError(true);
    } finally {
      setLoaded(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void hydrateFromCache();
      void load();
    }, [hydrateFromCache, load]),
  );

  const { width: screenWidth } = useWindowDimensions();
  const HPAD = 20;
  const GAP = 12;
  // Projects layout: 1 = full width, 2 = half each, 3+ = carousel (~42% → 2 full + 3rd clipped)
  const projectCardWidth =
    projects.length === 1
      ? screenWidth - HPAD * 2
      : projects.length === 2
      ? (screenWidth - HPAD * 2 - GAP) / 2
      : Math.round(screenWidth * 0.42);
  const isProjectsCarousel = projects.length > 2;

  const user = state.status === 'signedIn' ? state.user : null;
  const firstName = user?.first_name ?? '';
  const greeting = greetingFor(firstName, t);
  const expiringCount = useMemo(() => certs.filter(isExpiringSoon).length, [certs]);
  const latestDraft = useMemo(() => recent.find(q => q.status === 'draft'), [recent]);
  const showCertBanner = certs.length === 0 || expiringCount > 0;
  const tip = tipOfTheDay(t);

  const onRefresh = useCallback(async () => {
    haptic.medium();
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const templateName = (id: string) => templates.find((tpl) => tpl.id === id)?.name ?? t('common.inspection');

  const insets = useSafeAreaInsets();
  const HEADER_HERO_BODY = 96;   // visible hero content height below status bar
  const HEADER_COMPACT_BODY = 48; // visible compact bar height below status bar
  const HEADER_FULL = insets.top + HEADER_HERO_BODY;
  const HEADER_COMPACT = insets.top + HEADER_COMPACT_BODY;
  const { scrollHandler, containerStyle, heroStyle, compactStyle, backdropStyle } =
    useScrollHeader({ fullHeight: HEADER_FULL, compactHeight: HEADER_COMPACT });

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        key={HEADER_FULL}
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor={theme.colors.accent}
        progressViewOffset={HEADER_FULL}
      />
    ),
    [HEADER_FULL, refreshing, onRefresh]
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Scroll-driven shrinking header (Airbnb-style) — sits OVER the status bar
          area; content is offset by insets.top so it never crashes into the clock. */}
      <Animated.View style={[styles.scrollHeader, containerStyle]} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFillObject, backdropStyle]} pointerEvents="none">
          <BlurView intensity={32} tint="light" style={StyleSheet.absoluteFillObject} />
          <View style={styles.scrollHeaderHairline} />
        </Animated.View>
        <Animated.View
          style={[styles.scrollHeaderHero, { paddingTop: insets.top + 14 }, heroStyle]}
          pointerEvents="none"
        >
          <Text style={styles.dateLine}>{todayFormatted(i18n.language)}</Text>
          <Text style={styles.greeting}>{greeting}</Text>
        </Animated.View>
        <Animated.View
          style={[styles.scrollHeaderCompact, { paddingTop: insets.top, height: HEADER_COMPACT }, compactStyle]}
          pointerEvents="none"
        >
          <Text style={styles.scrollHeaderCompactTitle}>
            {greeting}
          </Text>
        </Animated.View>
      </Animated.View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingTop: HEADER_FULL + 8, paddingBottom: 100 }}
      >
        {/* ───────── FETCH ERROR BANNER ───────── */}
        {loaded && loadError ? (
          <View style={styles.fetchErrorBanner}>
            <Ionicons name="cloud-offline-outline" size={16} color={theme.colors.warn} />
            <Text style={styles.fetchErrorText}>{t('home.fetchError')}</Text>
          </View>
        ) : null}

        {/* ───────── CONTINUE DRAFT ───────── */}
        {latestDraft ? (
          <View style={styles.sectionWrap}>
            <Pressable onPress={() => router.push(`/inspections/${latestDraft.id}/wizard` as any)} {...a11y('შევსების გაგრძელება', 'შეეხეთ მონახაზის გასაგრძელებლად', 'button')}>
              <View style={styles.resumeCard}>
                <View style={styles.resumeIcon}>
                  <Ionicons name="pencil" size={16} color={theme.colors.warn} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resumeEyebrow}>{t('home.resumeDraft')}</Text>
                  <Text style={styles.resumeTitle} numberOfLines={1}>
                    {templateName(latestDraft.template_id)}
                  </Text>
                  <Text style={styles.resumeMeta} numberOfLines={1}>
                    {relativeTime(latestDraft.created_at, t, i18n.language)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.inkFaint} />
              </View>
            </Pressable>
          </View>
        ) : null}

        {/* ───────── CERT BANNER (warn only) ───────── */}
        {showCertBanner ? (
          <Pressable onPress={() => router.push('/qualifications' as any)} {...a11y('კვალიფიკაციები', 'შეეხეთ კვალიფიკაციების სანახავად', 'button')}>
            <View style={styles.certBanner}>
              <View style={styles.bannerIcon}>
                <Ionicons name={certs.length === 0 ? 'cloud-upload-outline' : 'warning'} size={18} color={theme.colors.warn} />
              </View>
              <View style={{ flex: 1 }}>
                {certs.length === 0 ? (
                  <Text style={styles.bannerTitle}>{t('home.uploadCertificates')}</Text>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                    <NumberPop value={expiringCount} style={styles.bannerTitle} />
                    <Text style={styles.bannerTitle}> {t('home.certExpiringSuffix')}</Text>
                  </View>
                )}
                <Text style={styles.bannerSub}>
                  {certs.length === 0 ? t('home.pdfIncluded') : t('home.checkDeadlines')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.warn} />
            </View>
          </Pressable>
        ) : null}

        {/* ───────── PROJECTS ───────── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>{t('home.sectionProjects')}</Text>
          <Pressable onPress={() => router.push('/(tabs)/projects' as any)} hitSlop={8}>
            <Text style={styles.sectionLink}>{t('home.allProjects')}</Text>
          </Pressable>
        </View>

        {!loaded && projects.length === 0 ? (
          <View style={{ flexDirection: 'row', paddingHorizontal: HPAD, paddingTop: 10, gap: GAP }}>
            {Array.from({ length: 2 }).map((_, i) => (
              <View key={`skeleton-${i}`} style={[styles.projectCard, { width: (screenWidth - HPAD * 2 - GAP) / 2, gap: 10 }]}>
                <Skeleton width={48} height={48} radius={12} />
                <Skeleton width={'80%'} height={14} />
                <Skeleton width={'50%'} height={11} />
              </View>
            ))}
          </View>
        ) : projects.length === 0 ? (
          <Pressable
            onPress={() => setPickerVisible(true)}
            style={{ paddingHorizontal: HPAD, marginTop: 10 }}
            {...a11y('პროექტის შექმნა', 'შეეხეთ ახალი პროექტის შესაქმნელად', 'button')}
          >
            <View style={styles.emptyProjects}>
              <View style={styles.emptyPlusIcon}>
                <Ionicons name="add" size={24} color={theme.colors.accent} />
              </View>
              <Text style={styles.emptyProjectsCta}>{t('home.newProject')}</Text>
              <Text style={styles.emptyProjectsText}>{t('home.createFirst')}</Text>
            </View>
          </Pressable>
        ) : isProjectsCarousel ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: HPAD, paddingTop: 10, paddingBottom: 4, gap: GAP }}
          >
            {projects.slice(0, 8).map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                width={projectCardWidth}
                onPress={() => router.push(`/projects/${p.id}` as any)}
              />
            ))}
            {/* New project card always at the end of the scroll */}
            <Pressable
              onPress={() => {
                setPickerInitialView('new');
                setPickerVisible(true);
              }}
              style={{ width: Math.round(projectCardWidth * 0.72) }}
              {...a11y('ახალი პროექტის შექმნა', 'შეეხეთ ახალი პროექტის შესაქმნელად', 'button')}
            >
              <View style={styles.newProjectCard}>
                <Ionicons name="add-circle-outline" size={28} color={theme.colors.accent} />
                <Text style={styles.newProjectCardText}>ახალი</Text>
              </View>
            </Pressable>
          </ScrollView>
        ) : (
          <View style={{ flexDirection: 'row', paddingHorizontal: HPAD, paddingTop: 10, gap: GAP }}>
            {projects.slice(0, 20).map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                width={projectCardWidth}
                onPress={() => router.push(`/projects/${p.id}` as any)}
              />
            ))}
          </View>
        )}

        {/* ───────── RECENT ACTIVITY ───────── */}
        {!loaded && recent.length === 0 ? (
          <>
            <View style={[styles.sectionHeaderRow, { marginTop: 28 }]}>
              <Text style={styles.sectionHeader}>{t('home.recentActs')}</Text>
            </View>
            <View style={[styles.recentList, { marginTop: 8 }]}>
              {Array.from({ length: 3 }).map((_, i) => (
                <View
                  key={`skeleton-${i}`}
                  style={[
                    styles.recentRow,
                    i > 0 && styles.recentRowBorder,
                  ]}
                >
                  <Skeleton width={30} height={30} radius={15} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <Skeleton width={'70%'} height={14} />
                    <Skeleton width={'35%'} height={11} />
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : recent.length > 0 ? (
          <>
            <View style={[styles.sectionHeaderRow, { marginTop: 28 }]}>
              <Text style={styles.sectionHeader}>{t('home.recentActs')}</Text>
              <Pressable onPress={() => router.push('/history' as any)} hitSlop={8} {...a11y('ყველა აქტივობის ნახვა', 'შეეხეთ ისტორიის სანახავად', 'button')}>
                <Text style={styles.sectionLink}>ყველა</Text>
              </Pressable>
            </View>
            <View style={[styles.recentList, { marginTop: 8 }]}>
              {recent.slice(0, 4).map((q, i) => (
                <Pressable
                  key={q.id}
                  onPress={() =>
                    q.status === 'completed'
                      ? router.push(`/inspections/${q.id}` as any)
                      : router.push(`/inspections/${q.id}/wizard` as any)
                  }
                  style={[styles.recentRow, i > 0 && styles.recentRowBorder]}
                  {...a11y(
                    `${templateName(q.template_id)}, ${q.status === 'completed' ? 'დასრულებული' : 'მონახაზი'}`,
                    q.status === 'completed' ? 'შეეხეთ დეტალების სანახავად' : 'შეეხეთ გასაგრძელებლად',
                    'button'
                  )}
                >
                  <View
                    style={[
                      styles.recentDot,
                      {
                        backgroundColor:
                          q.status === 'completed' ? theme.colors.harnessSoft : theme.colors.warnSoft,
                      },
                    ]}
                  >
                    <Ionicons
                      name={q.status === 'completed' ? 'checkmark' : 'pencil'}
                      size={14}
                      color={q.status === 'completed' ? theme.colors.harnessTint : theme.colors.warn}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recentTitle} numberOfLines={1}>
                      {templateName(q.template_id)}
                    </Text>
                    <Text style={styles.recentMeta}>{relativeTime(q.created_at, t, i18n.language)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {/* ───────── TIP OF THE DAY ───────── */}
        <View style={[styles.sectionWrap, { marginTop: 28 }]}>
          <View style={styles.tipCard}>
            <View style={styles.tipIcon}>
              <Ionicons name="shield-checkmark" size={20} color={theme.colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipLabel}>რჩევა დღისთვის</Text>
              <Text style={styles.tipBody}>{tip}</Text>
            </View>
          </View>
        </View>
      </Animated.ScrollView>

      {/* Animated FAB — rotates + to × when sheet opens, pulses on press */}
      <AnimatedFAB
        open={pickerVisible}
        onPress={() => {
          setPickerInitialView('list');
          setPickerVisible(true);
        }}
      />

      <ProjectPickerSheet
        visible={pickerVisible}
        initialView={pickerInitialView}
        projects={projects}
        templates={templates}
        onClose={() => setPickerVisible(false)}
        onCreated={load}
        onProjectCreated={(id) => {
          setPickerVisible(false);
          router.push(`/projects/${id}` as any);
        }}
      />
    </View>
  );
}

// ──────────── PROJECT PICKER SHEET ────────────

// ───────── ANIMATED FAB ─────────

function AnimatedFAB({ open, onPress }: { open: boolean; onPress: () => void }) {
  return (
    <FabButton
      onPress={onPress}
      iconName="add"
      iconRotation={open ? 45 : 0}
      a11yLabel="ახალი ინსპექცია"
      a11yHint="შეეხეთ ახალი ინსპექციის დასაწყებად"
    />
  );
}

// ───────── ANIMATED DARK BACKDROP ─────────

function AnimatedDarkBackdrop({ visible, onPress }: { visible: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        StyleSheet.absoluteFillObject,
        { backgroundColor: theme.colors.overlay },
        visible ? { opacity: 1 } : { opacity: 0 },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {visible && <Pressable style={StyleSheet.absoluteFillObject} onPress={onPress} {...a11y('დახურვა', 'შეეხეთ ფონის დასახურად', 'button')} />}
    </View>
  );
}

// ───────── PROJECT PICKER SHEET ─────────

function ProjectPickerSheet({
  visible,
  initialView = 'list',
  projects,
  templates,
  onClose,
  onCreated,
  onProjectCreated,
}: {
  visible: boolean;
  initialView?: 'list' | 'new';
  projects: Project[];
  templates: Template[];
  onClose: () => void;
  onCreated: () => Promise<void>;
  onProjectCreated?: (id: string) => void;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const pickerStyles = useMemo(() => getpickerStyles(theme), [theme]);
  const router = useRouter();
  const toast = useToast();
  // Template picker is an inline view, NOT a nested BottomSheet — stacking
  // Modals inside Modals is unreliable on iOS (the second one never becomes
  // visible while the first is up, so tapping a project felt frozen).
  const [view, setView] = useState<'list' | 'new' | 'template'>('list');
  const [pickedProjectId, setPickedProjectId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [address, setAddress] = useState('');
  const [pin, setPin] = useState<LatLng | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);

  // Reset form + view every time the sheet opens
  useEffect(() => {
    if (visible) {
      setView(initialView);
      setPickedProjectId(null);
      setName('');
      setCompany('');
      setAddress('');
      setPin(null);
      setLogo(null);
      setBusy(false);
      setMapVisible(false);
    }
  }, [visible]);

  const onPickLogo = async () => {
    const next = await pickProjectLogo();
    if (next) setLogo(next);
  };

  const systemTemplates = templates.filter((tpl) => tpl.is_system);

  const pickTemplate = (projectId: string) => {
    if (systemTemplates.length === 0) {
      toast.error(t('errors.notFoundTemplate'));
      return;
    }
    if (systemTemplates.length === 1) {
      // Only one template — skip the picker step entirely.
      void startInspection(projectId, systemTemplates[0].id);
      return;
    }
    setPickedProjectId(projectId);
    setView('template');
  };

  const startInspection = async (projectId: string, templateId: string) => {
    try {
      const q = await questionnairesApi.create({ projectId, templateId });
      onClose();
      router.push(`/inspections/${q.id}/wizard` as any);
    } catch (e) {
      toast.error(friendlyError(e, t('errors.createFailed')));
    }
  };

  const createProject = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      // Create project — API returns the created object directly
      const created = await projectsApi.create({
        name: name.trim(),
        companyName: company.trim() || null,
        address: address.trim() || null,
        latitude: pin?.latitude ?? null,
        longitude: pin?.longitude ?? null,
        logo,
      });
      // Refresh dashboard
      await onCreated();
      // Use returned project directly (no stale prop issues)
      if (created?.id) {
        setName('');
        setCompany('');
        setAddress('');
        setPin(null);
        setLogo(null);
        if (onProjectCreated) {
          // Caller wants to take over after creation (e.g. navigate to the
          // project detail screen). Skip the inline template-picker step.
          onProjectCreated(created.id);
        } else {
          setPickedProjectId(created.id);
          setView('template');
        }
      } else {
        onClose();
        toast.success(t('notifications.projectCreated'));
      }
    } catch (e) {
      toast.error(friendlyError(e, t('errors.createFailed')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={() => mapVisible ? setMapVisible(false) : onClose()} statusBarTranslucent>
      <View style={pickerStyles.container}>
        {/* Dark overlay backdrop with cross-fade */}
        <AnimatedDarkBackdrop visible={visible} onPress={() => mapVisible ? setMapVisible(false) : onClose()} />
          {/* Stop touches inside the card from closing the sheet */}
          <Pressable style={pickerStyles.card} onPress={() => {}}>
            <View style={pickerStyles.handle} />

            {view === 'list' ? (
              <>
                {/* Sheet header */}
                <View style={pickerStyles.sheetHeader}>
                  <Text style={pickerStyles.sheetTitle}>{t('home.startInspectionSheetTitle')}</Text>
                  <Pressable onPress={onClose} hitSlop={10}>
                    <Ionicons name="close" size={22} color={theme.colors.inkSoft} />
                  </Pressable>
                </View>

                {/* Project list — "add new" row scrolls together with project items */}
                {projects.length === 0 ? (
                  <>
                    <Pressable onPress={() => setView('new')} style={pickerStyles.addNewRow}>
                      <View style={pickerStyles.addNewIcon}>
                        <Ionicons name="add" size={18} color={theme.colors.accent} />
                      </View>
                      <Text style={pickerStyles.addNewText}>{t('home.addNewProjectSheet')}</Text>
                      <Ionicons name="chevron-forward" size={16} color={theme.colors.accent} />
                    </Pressable>
                    <View style={pickerStyles.emptyState}>
                      <Ionicons name="folder-open-outline" size={36} color={theme.colors.inkFaint} />
                      <Text style={pickerStyles.emptyText}>{t('home.noProjectsYet')}</Text>
                      <Text style={pickerStyles.emptySubText}>{t('home.noProjectsHint')}</Text>
                    </View>
                  </>
                ) : (
                  <ScrollView
                    style={{ maxHeight: 380 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    <Pressable onPress={() => setView('new')} style={pickerStyles.addNewRow}>
                      <View style={pickerStyles.addNewIcon}>
                        <Ionicons name="add" size={18} color={theme.colors.accent} />
                      </View>
                      <Text style={pickerStyles.addNewText}>{t('home.addNewProjectSheet')}</Text>
                      <Ionicons name="chevron-forward" size={16} color={theme.colors.accent} />
                    </Pressable>
                    {projects.slice(0, 20).map(p => (
                      <Pressable
                        key={p.id}
                        onPress={() => pickTemplate(p.id)}
                        style={pickerStyles.projectRow}
                      >
                        <ProjectAvatar project={p} size={44} />
                        <View style={{ flex: 1 }}>
                          <Text style={pickerStyles.rowName} numberOfLines={1}>{p.name}</Text>
                          {p.company_name ? (
                            <Text style={pickerStyles.rowSub} numberOfLines={1}>{p.company_name}</Text>
                          ) : null}
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </>
            ) : view === 'template' ? (
              <>
                {/* Template picker header with back button */}
                <View style={pickerStyles.sheetHeader}>
                  <Pressable onPress={() => setView('list')} hitSlop={10} style={{ marginRight: 10 }}>
                    <Ionicons name="arrow-back" size={22} color={theme.colors.accent} />
                  </Pressable>
                  <Text style={[pickerStyles.sheetTitle, { flex: 1 }]}>{t('home.chooseTemplate')}</Text>
                  <Pressable onPress={onClose} hitSlop={10}>
                    <Ionicons name="close" size={22} color={theme.colors.inkSoft} />
                  </Pressable>
                </View>
                <ScrollView
                  style={{ maxHeight: 360 }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {systemTemplates.map((tpl) => (
                    <Pressable
                      key={tpl.id}
                      onPress={() => pickedProjectId && void startInspection(pickedProjectId, tpl.id)}
                      style={pickerStyles.projectRow}
                    >
                      <View style={[pickerStyles.avatarBubble, { backgroundColor: theme.colors.accentSoft }]}>
                        <Ionicons name="document-text" size={22} color={theme.colors.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={pickerStyles.rowName} numberOfLines={2}>{tpl.name}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : (
              <>
                {/* New project form header with back button */}
                <View style={pickerStyles.sheetHeader}>
                  <Pressable onPress={() => setView('list')} hitSlop={10} style={{ marginRight: 10 }}>
                    <Ionicons name="arrow-back" size={22} color={theme.colors.accent} />
                  </Pressable>
                  <Text style={[pickerStyles.sheetTitle, { flex: 1 }]}>{t('home.newProjectFormTitle')}</Text>
                  <Pressable onPress={onClose} hitSlop={10}>
                    <Ionicons name="close" size={22} color={theme.colors.inkSoft} />
                  </Pressable>
                </View>

                {/* Form fields */}
                <KeyboardAwareScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingTop: 4, paddingBottom: 8, gap: 16 }}
                  style={{ maxHeight: '78%' }}
                >
                  <View style={{ alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <ProjectAvatar
                      project={{ name: name || '—', logo }}
                      size={88}
                      editable
                      onEdit={onPickLogo}
                    />
                    {logo ? (
                      <Pressable onPress={onPickLogo} hitSlop={6}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.accent }}>
                          {t('projects.changePhoto')}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <Field label={t('common.name')} required>
                    <Input
                      value={name}
                      onChangeText={setName}
                      placeholder={t('projects.projectNamePlaceholder')}
                      autoFocus
                    />
                  </Field>
                  <Field label={t('common.company')}>
                    <Input value={company} onChangeText={setCompany} placeholder={t('projects.clientPlaceholder')} />
                  </Field>
                  <Field label={t('common.address')}>
                    <Input
                      value={address}
                      onChangeText={setAddress}
                      placeholder="ქუჩა, ნომერი, ქალაქი"
                      {...a11y(t('common.address'), 'შეიყვანეთ მისამართი', 'text')}
                    />
                  </Field>
                  <Field label="მდებარეობა">
                    <LocationRow pin={pin} address={address} onPress={() => { Keyboard.dismiss(); setMapVisible(true); }} />
                  </Field>
                </KeyboardAwareScrollView>

                <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16, backgroundColor: theme.colors.background }}>
                  <Button
                    title={t('projects.createButton')}
                    onPress={createProject}
                    loading={busy}
                    disabled={!name.trim()}
                    {...a11y(t('projects.createButton'), 'შეეხეთ ახალი პროექტის შესაქმნელად', 'button')}
                  />
                </View>
              </>
            )}
          </Pressable>

        {/* Full-screen map overlay — no nested Modal */}
        {mapVisible && (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.colors.background }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: insets.top + 12, paddingVertical: 12 }}>
              <View style={{ width: 24 }} />
              <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: theme.colors.ink }}>
                მდებარეობის არჩევა
              </Text>
              <Pressable onPress={() => setMapVisible(false)} hitSlop={10} {...a11y('დახურვა', 'რუკის დახურვა', 'button')}>
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
        )}
      </View>
    </Modal>
  );
}

// ──────────── PROJECT CARD ────────────

function ProjectCard({
  project,
  width,
  onPress,
}: {
  project: Project;
  width: number;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  return (
    <PressableScale
      onPress={onPress}
      hapticOnPress="navigate"
      scaleTo={0.97}
      {...a11y(
        `პროექტი: ${project.name}${project.company_name ? ', ' + project.company_name : ''}`,
        'შეეხეთ პროექტის დეტალების სანახავად',
        'button'
      )}
    >
      <View style={[styles.projectCard, { width }]}>
        <ProjectAvatar project={project} size={48} />
        <Text style={styles.projectName} numberOfLines={2}>{project.name}</Text>
        {project.company_name ? (
          <Text style={styles.projectSub} numberOfLines={1}>{project.company_name}</Text>
        ) : null}
      </View>
    </PressableScale>
  );
}

// ──────────── HELPERS ────────────

function greetingFor(name: string, t: (key: string) => string) {
  const hour = new Date().getHours();
  const base =
    hour < 5 ? t('home.greetingNight') :
    hour < 12 ? t('home.greetingMorning') :
    hour < 18 ? t('home.greetingAfternoon') :
    t('home.greetingEvening');
  return name ? `${base}, ${name}` : base;
}

function todayFormatted(lang: string) {
  try {
    const locale = lang.startsWith('en') ? 'en-US' : 'ka-GE';
    return new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  } catch {
    return '';
  }
}

function relativeTime(iso: string, t: (key: string, opts?: any) => string, lang: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return t('home.relNow');
  if (m < 60) return t('home.relMinAgo', { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t('home.relHourAgo', { n: h });
  const days = Math.floor(h / 24);
  if (days < 7) return t('home.relDayAgo', { n: days });
  const locale = lang.startsWith('en') ? 'en-US' : 'ka-GE';
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

const TIP_KEYS = ['home.tip1', 'home.tip2', 'home.tip3', 'home.tip4', 'home.tip5', 'home.tip6', 'home.tip7'] as const;

function tipOfTheDay(t: (key: string) => string) {
  const day = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return t(TIP_KEYS[day % TIP_KEYS.length]);
}

// ──────────── STYLES ────────────

const PROJECT_CARD_HEIGHT = 150;

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

// ── Full-screen map picker modal ──
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
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
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

function getstyles(theme: any) {
  return StyleSheet.create({
  // SCROLL-DRIVEN HEADER (Airbnb-style shrinking)
  scrollHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  scrollHeaderHairline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
  },
  scrollHeaderHero: {
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  scrollHeaderCompact: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 56,
    paddingHorizontal: 20,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  scrollHeaderCompactTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.ink,
  },

  // HERO (legacy — kept for non-scroll callers if any reuse)
  hero: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 22,
  },
  dateLine: {
    fontSize: 13,
    color: theme.colors.inkSoft,
    fontWeight: '600',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  greeting: {
    fontSize: 30,
    fontWeight: '900',
    fontFamily: theme.typography.fontFamily.display,
    color: theme.colors.ink,
    lineHeight: 36,
  },

  // FETCH ERROR BANNER
  fetchErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: theme.colors.warnSoft,
    borderRadius: theme.radius.cardInner,
    borderWidth: 1,
    borderColor: theme.colors.warn,
  },
  fetchErrorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.ink,
  },

  // SHARED WRAPPERS
  sectionWrap: {
    paddingHorizontal: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 28,
  },
  sectionHeader: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  sectionLink: {
    fontSize: 13,
    color: theme.colors.accent,
    fontWeight: '700',
  },

  // RESUME CARD
  resumeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.cardInner,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
  },
  resumeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.warnSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeEyebrow: {
    color: theme.colors.warn,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  resumeTitle: {
    color: theme.colors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  resumeMeta: {
    color: theme.colors.inkSoft,
    fontSize: 12,
    marginTop: 2,
  },

  // START CARD (when no draft)
  startCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: theme.colors.accentSoft,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: withOpacity(theme.colors.accent, 0.2),
  },
  startIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  startSub: {
    fontSize: 11,
    color: theme.colors.inkSoft,
    marginTop: 2,
  },

  // CERT BANNER
  certBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 20,
    padding: 14,
    backgroundColor: theme.colors.warnSoft,
    borderRadius: theme.radius.cardInner,
  },
  bannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontWeight: '700',
    color: theme.colors.ink,
    fontSize: 15,
  },
  bannerSub: {
    fontSize: 11,
    color: theme.colors.inkSoft,
    marginTop: 2,
  },

  // PROJECTS CAROUSEL
  projectCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    padding: 12,
    gap: 10,
    height: PROJECT_CARD_HEIGHT,
  },
  projectEmoji: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.ink,
    lineHeight: 20,
    minHeight: 36,
  },
  projectSub: {
    fontSize: 11,
    color: theme.colors.inkSoft,
  },
  emptyProjects: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.accentSoft,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: withOpacity(theme.colors.accent, 0.2),
    borderStyle: 'dashed',
    height: PROJECT_CARD_HEIGHT,
  },
  emptyPlusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyProjectsText: {
    fontSize: 11,
    color: theme.colors.inkSoft,
  },
  emptyProjectsCta: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  newProjectCard: {
    flex: 1,
    backgroundColor: theme.colors.accentSoft,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: withOpacity(theme.colors.accent, 0.2),
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: PROJECT_CARD_HEIGHT,
  },
  newProjectCardText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.accent,
  },

  // RECENT
  recentList: {
    marginHorizontal: 20,
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    overflow: 'hidden',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  recentRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.hairline,
  },
  recentDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.ink,
  },
  recentMeta: {
    fontSize: 11,
    color: theme.colors.inkSoft,
    marginTop: 2,
  },

  // TIP
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: theme.colors.accentSoft,
    borderRadius: 16,
    padding: 14,
  },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  tipBody: {
    fontSize: 13,
    color: theme.colors.ink,
    lineHeight: 19,
  },

});
}

function getpickerStyles(theme: any) {
  return StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    paddingTop: 10,
    paddingBottom: 44,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.hairline,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.ink,
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.hairline,
  },
  avatarBubble: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  rowSub: {
    fontSize: 12,
    color: theme.colors.inkSoft,
    marginTop: 2,
  },
  addNewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.cardInner,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: withOpacity(theme.colors.accent, 0.2),
  },
  addNewIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addNewText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 6,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.ink,
    marginTop: 8,
  },
  emptySubText: {
    fontSize: 13,
    color: theme.colors.inkSoft,
  },
});
}
