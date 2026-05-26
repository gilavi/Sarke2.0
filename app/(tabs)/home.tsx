import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Swipeable } from 'react-native-gesture-handler';
import {
  Alert,
  Animated as RNAnimated,
  AppState,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated from 'react-native-reanimated';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../../lib/session';
import { isExpiringSoon, questionnairesApi } from '../../lib/services';
import { deleteInspectionBySource } from '../../lib/inspectionDelete';
import { useQueryClient } from '@tanstack/react-query';
import {
  useProjects,
  useRecentInspections,
  useQualifications,
  useTemplates,
} from '../../lib/apiHooks';
// shareStoredPdf import removed — PDF sharing now lives on the inspection
// detail screen (which fetches certificates list) post 0006 decoupling.
import { useTheme, withOpacity, type Theme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import { Card } from '../../components/ui';
import { NumberPop, useScrollHeader } from '../../components/animations';
import { QuickActions } from '../../components/QuickActions';
import { Skeleton } from '../../components/Skeleton';
import { routeForInspection } from '../../lib/inspectionRouting';
import { inspectionDisplayName } from '../../lib/shared/documentName';
import { useToast } from '../../lib/toast';
import { haptic } from '../../lib/haptics';
import { useTranslation } from 'react-i18next';
import type { Inspection, Project, Template } from '../../types/models';
import { InspectionTypeAvatar } from '../../components/InspectionTypeAvatar';
import { RecordTypePill } from '../../components/RecordTypePill';
import { CustomDropdown } from '../../components/ui/CustomDropdown';
import { ProjectCard } from '../../components/home/ProjectCard';
import { ProjectPickerSheet } from '../../components/home/ProjectPickerSheet';
import {
  greetingFor,
  todayFormatted,
  relativeTime,
  tipOfTheDay,
  groupByDate,
  PROJECT_SKELETONS,
  RECENT_SKELETONS,
} from '../../lib/homeUtils';

// Equipment flows where project selection is the first in-flow step (created
// lazily once a project is chosen — see app/inspections/new.tsx). Starting these
// from Home routes into that screen instead of the project-picker sheet.
// All template categories now defer project selection to the first step of the
// inspection wizard (see `app/inspections/new.tsx`). Kept as a list-less marker
// for searchability; the previous category-gated branch was removed because
// non-equipment templates were freezing the app via stacked BottomSheets.

function stepKeyFor(category: string | null | undefined, id: string): string {
  const map: Record<string, string> = {
    xaracho: 'wizard', mobile_scaffold: 'wizard',
    harness: 'harness-wizard',
    bobcat: 'bobcat-wizard', excavator: 'excavator-wizard',
    general_equipment: 'ge-wizard', cargo_platform: 'cargo-platform-wizard',
    safety_net_inspection: 'safety-net-wizard',
    mobile_ladder_inspection:       'mobile-ladder-wizard',
    fall_protection_inspection:     'fall-protection-wizard',
    lifting_accessories_inspection: 'lifting-accessories-wizard',
    forklift_inspection:            'forklift-wizard',
  };
  return `${map[category ?? ''] ?? 'wizard'}:${id}:step`;
}

const STEP_TOTALS: Record<string, number> = {
  harness: 3, bobcat: 4, excavator: 5, general_equipment: 3, cargo_platform: 6, safety_net_inspection: 6, mobile_ladder_inspection: 5, fall_protection_inspection: 2, lifting_accessories_inspection: 6, forklift_inspection: 3,
};

const staticStyles = StyleSheet.create({
  scrollContent: { paddingBottom: 100 },
  projectRowWrap: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 10, gap: 12, marginBottom: 24 },
  emptyProjectWrap: { paddingHorizontal: 20, marginTop: 10, marginBottom: 24 },
  sectionHeaderMargin: { marginTop: 28 },
  recentListMargin: { marginTop: 8 },
  flex: { flex: 1 },
  bannerTitleRow: { flexDirection: 'row', alignItems: 'baseline' },
  recentSkeletonMeta: { flex: 1, gap: 6 },
});

export default function HomeScreen() {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const { state } = useSession();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const certsQ = useQualifications();
  const templatesQ = useTemplates();
  const recentQ = useRecentInspections(10);
  const projectsQ = useProjects();

  const certs = certsQ.data ?? [];
  const templates = templatesQ.data ?? [];
  const recent = recentQ.data ?? [];
  const projects = projectsQ.data ?? [];

  const loaded = !certsQ.isLoading && !templatesQ.isLoading && !recentQ.isLoading && !projectsQ.isLoading;
  const loadError = certsQ.isError && templatesQ.isError && recentQ.isError && projectsQ.isError;


  const [refreshing, setRefreshing] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerInitialView, setPickerInitialView] = useState<'list' | 'new'>('list');
  const [pickerAction, setPickerAction] = useState<'inspection' | 'incident' | 'briefing' | 'report'>('inspection');
  const [tplPickerVisible, setTplPickerVisible] = useState(false);
  const [tplPickerTemplates, setTplPickerTemplates] = useState<Template[]>([]);

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
  const allDrafts = useMemo(() => recent.filter(q => q.status === 'draft'), [recent]);
  const [draftSteps, setDraftSteps] = useState<Record<string, number>>({});

  const loadDraftSteps = useCallback(async () => {
    const drafts = recent.filter(r => r.status === 'draft');
    if (!drafts.length) return;
    const pairs = await Promise.all(
      drafts.map(async d => {
        const tpl = templates.find(t => t.id === d.template_id);
        const raw = await AsyncStorage.getItem(stepKeyFor(tpl?.category, d.id));
        const n = raw ? parseInt(raw, 10) : 0;
        return [d.id, n] as [string, number];
      })
    );
    setDraftSteps(Object.fromEntries(pairs));
  }, [recent, templates]);
  const showCertBanner = certs.length === 0 || expiringCount > 0;
  const tip = tipOfTheDay(t);

  const recentGrouped = useMemo(
    () => groupByDate(recent.slice(0, 10), i18n.language),
    [recent, i18n.language],
  );

  const swipeableRef = useRef<Swipeable>(null);
  const deleteOpacity = useRef(new RNAnimated.Value(1)).current;
  const deleteScale = useRef(new RNAnimated.Value(1)).current;

  const handleDraftDelete = useCallback(async (draftId: string) => {
    swipeableRef.current?.close();
    await new Promise<void>(resolve => {
      RNAnimated.parallel([
        RNAnimated.timing(deleteOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
        RNAnimated.timing(deleteScale, { toValue: 0.94, duration: 160, useNativeDriver: true }),
      ]).start(() => resolve());
    });
    try {
      await questionnairesApi.remove(draftId);
      await qc.invalidateQueries({ queryKey: ['inspections', 'recent'] });
    } catch {
      Alert.alert('შეცდომა', 'წაშლა ვერ მოხერხდა');
    }
    deleteOpacity.setValue(1);
    deleteScale.setValue(1);
  }, [deleteOpacity, deleteScale, qc]);

  const deleteRecentDraft = useCallback(async (id: string, category: string | undefined) => {
    try {
      await deleteInspectionBySource(category, id);
      await qc.invalidateQueries({ queryKey: ['inspections', 'recent'] });
    } catch {
      Alert.alert('შეცდომა', 'წაშლა ვერ მოხერხდა');
    }
  }, [qc]);

  const onRefresh = useCallback(async () => {
    haptic.medium();
    setRefreshing(true);
    await Promise.all([
      certsQ.refetch(),
      templatesQ.refetch(),
      recentQ.refetch(),
      projectsQ.refetch(),
    ]);
    setRefreshing(false);
  }, [certsQ, templatesQ, recentQ, projectsQ]);

  const templateName = useCallback((id: string) => inspectionDisplayName(templates.find((tpl) => tpl.id === id)?.name), [templates]);

  useEffect(() => { void loadDraftSteps(); }, [loadDraftSteps]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') void loadDraftSteps();
    });
    return () => sub.remove();
  }, [loadDraftSteps]);

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
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.colors.surface, opacity: 0.92 }]} />
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
        onScrollBeginDrag={() => { if (openMenuId) setOpenMenuId(null); }}
        scrollEventThrottle={16}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[staticStyles.scrollContent, { paddingTop: HEADER_FULL + 8 }]}
      >
        {/* ───────── FETCH ERROR BANNER ───────── */}
        {loaded && loadError ? (
          <View style={styles.fetchErrorBanner}>
            <Ionicons name="cloud-offline-outline" size={16} color={theme.colors.warn} />
            <Text style={styles.fetchErrorText}>{t('home.fetchError')}</Text>
          </View>
        ) : null}

        {/* ───────── CONTINUE DRAFTS ───────── */}
        {allDrafts.length > 0 ? (
          <View style={{ paddingHorizontal: 20, paddingBottom: 4 }}>
            <View style={styles.draftSectionRow}>
              <Text style={styles.draftSectionTitle}>გაგრძელება</Text>
            </View>
            {allDrafts.slice(0, 1).map((draft, index) => {
              const tpl = templates.find(t => t.id === draft.template_id);
              const step = draftSteps[draft.id] ?? 0;
              const totalSteps = STEP_TOTALS[tpl?.category ?? ''] ?? 0;
              const showProgress = totalSteps > 0 && step > 0;

              if (index === 0) {
                return (
                  <RNAnimated.View
                    key={draft.id}
                    style={{ opacity: deleteOpacity, transform: [{ scale: deleteScale }] }}
                  >
                    <Swipeable
                      ref={swipeableRef}
                      friction={2}
                      rightThreshold={40}
                      overshootRight={false}
                      renderRightActions={() => (
                        <Pressable
                          onPress={() => handleDraftDelete(draft.id)}
                          style={styles.deleteAction}
                        >
                          <Ionicons name="trash-outline" size={22} color={theme.colors.white} />
                          <Text style={styles.deleteActionText}>წაშლა</Text>
                        </Pressable>
                      )}
                    >
                      <Card
                        onPress={() => router.push(routeForInspection(tpl?.category, draft.id, false) as any)}
                        a11y={a11y('შევსების გაგრძელება', 'შეეხეთ მონახაზის გასაგრძელებლად', 'button')}
                        style={styles.resumeCard}
                      >
                        <View style={styles.resumeIcon}>
                          <Ionicons name="hourglass-outline" size={16} color={theme.colors.warn} />
                        </View>
                        <View style={staticStyles.flex}>
                          <Text style={styles.resumeEyebrow}>{t('home.resumeDraft')}</Text>
                          <Text style={styles.resumeTitle} numberOfLines={1}>
                            {templateName(draft.template_id)}
                          </Text>
                          {step > 0 ? (
                            <Text style={styles.resumeStepLabel}>ნაბიჯი {step}</Text>
                          ) : null}
                          {showProgress ? (
                            <View style={styles.progressTrack}>
                              <View style={[styles.progressFill, { width: `${Math.min((step / totalSteps) * 100, 100)}%` as any }]} />
                            </View>
                          ) : null}
                          <Text style={styles.resumeMeta} numberOfLines={1}>
                            {relativeTime(draft.created_at, t, i18n.language)}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={theme.colors.inkFaint} />
                      </Card>
                    </Swipeable>
                  </RNAnimated.View>
                );
              }

              return (
                <Card
                  key={draft.id}
                  onPress={() => router.push(routeForInspection(tpl?.category, draft.id, false) as any)}
                  a11y={a11y('შევსების გაგრძელება', 'შეეხეთ მონახაზის გასაგრძელებლად', 'button')}
                  style={[styles.resumeCard, { marginTop: 8 }]}
                >
                  <View style={styles.resumeIcon}>
                    <Ionicons name="hourglass-outline" size={16} color={theme.colors.warn} />
                  </View>
                  <View style={staticStyles.flex}>
                    <Text style={styles.resumeEyebrow}>{t('home.resumeDraft')}</Text>
                    <Text style={styles.resumeTitle} numberOfLines={1}>
                      {templateName(draft.template_id)}
                    </Text>
                    {step > 0 ? (
                      <Text style={styles.resumeStepLabel}>ნაბიჯი {step}</Text>
                    ) : null}
                    {showProgress ? (
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${Math.min((step / totalSteps) * 100, 100)}%` as any }]} />
                      </View>
                    ) : null}
                    <Text style={styles.resumeMeta} numberOfLines={1}>
                      {relativeTime(draft.created_at, t, i18n.language)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.inkFaint} />
                </Card>
              );
            })}
          </View>
        ) : null}

        {/* ───────── CERT BANNER (warn only) ───────── */}
        {showCertBanner ? (
          <Card
            onPress={() => router.push('/qualifications' as any)}
            a11y={a11y('კვალიფიკაციები', 'შეეხეთ კვალიფიკაციების სანახავად', 'button')}
            style={styles.certBanner}
          >
              <View style={styles.bannerIcon}>
                <Ionicons name={certs.length === 0 ? 'cloud-upload-outline' : 'warning'} size={18} color={theme.colors.warn} />
              </View>
              <View style={staticStyles.flex}>
                {certs.length === 0 ? (
                  <Text style={styles.bannerTitle}>{t('home.uploadCertificates')}</Text>
                ) : (
                  <View style={staticStyles.bannerTitleRow}>
                  {expiringCount > 0 && (
                    <NumberPop value={expiringCount} style={styles.bannerTitle} />
                  )}
                    <Text style={styles.bannerTitle}> {t('home.certExpiringSuffix')}</Text>
                  </View>
                )}
                <Text style={styles.bannerSub}>
                  {certs.length === 0 ? t('home.pdfIncluded') : t('home.checkDeadlines')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.warn} />
          </Card>
        ) : null}

        {/* ───────── QUICK ACTIONS ───────── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 }}>
          <QuickActions
            actions={[
              {
                label: 'შემოწმება',
                colorKey: 'inspection',
                onPress: () => {
                  const sysTpls = templates.filter(tpl => tpl.is_system);
                  if (sysTpls.length === 0) {
                    toast.error(t('errors.notFoundTemplate'));
                    return;
                  }
                  if (sysTpls.length === 1) {
                    const tpl = sysTpls[0];
                    const qs = tpl.category
                      ? `category=${tpl.category}&templateId=${tpl.id}`
                      : `templateId=${tpl.id}`;
                    router.push(`/inspections/new?${qs}` as any);
                  } else {
                    setTplPickerTemplates(sysTpls);
                    setTplPickerVisible(true);
                  }
                },
              },
              {
                label: 'ინციდენტი',
                colorKey: 'incident',
                onPress: () => {
                  setPickerAction('incident');
                  setPickerInitialView('list');
                  setPickerVisible(true);
                },
              },
              {
                label: 'ინსტრუქტაჟი',
                colorKey: 'briefing',
                onPress: () => {
                  setPickerAction('briefing');
                  setPickerInitialView('list');
                  setPickerVisible(true);
                },
              },
              {
                label: 'რეპორტი',
                colorKey: 'report',
                onPress: () => {
                  setPickerAction('report');
                  setPickerInitialView('list');
                  setPickerVisible(true);
                },
              },
            ]}
          />
        </View>

        {/* ───────── PROJECTS ───────── */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="folder-outline" size={14} color={theme.colors.inkSoft} style={{ marginRight: 5 }} />
          <Text style={styles.sectionHeader}>{t('home.sectionProjects')}</Text>
          <Pressable onPress={() => router.push('/(tabs)/projects' as any)} hitSlop={16}>
            <Text style={styles.sectionLink}>{t('home.allProjects')}</Text>
          </Pressable>
        </View>

        {!loaded && projects.length === 0 ? (
          <View style={staticStyles.projectRowWrap}>
            {PROJECT_SKELETONS.map((i) => (
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
            style={staticStyles.emptyProjectWrap}
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
            directionalLockEnabled
            contentContainerStyle={{ paddingHorizontal: HPAD, paddingTop: 10, paddingBottom: 24, gap: GAP }}
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
              style={{ width: projectCardWidth }}
              {...a11y('ახალი პროექტის შექმნა', 'შეეხეთ ახალი პროექტის შესაქმნელად', 'button')}
            >
              <View style={styles.newProjectCard}>
                <Ionicons name="add-circle-outline" size={28} color={theme.colors.accent} />
                <Text style={styles.newProjectCardText}>ახალი</Text>
              </View>
            </Pressable>
          </ScrollView>
        ) : (
          <View style={staticStyles.projectRowWrap}>
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
            <View style={[styles.sectionHeaderRow, staticStyles.sectionHeaderMargin]}>
              <Ionicons name="time-outline" size={14} color={theme.colors.inkSoft} style={{ marginRight: 5 }} />
              <Text style={styles.sectionHeader}>{t('home.recentActs')}</Text>
            </View>
            <View style={staticStyles.recentListMargin}>
              {RECENT_SKELETONS.map((i) => (
                <View key={`skeleton-${i}`} style={[styles.recentRow, i < RECENT_SKELETONS.length - 1 && styles.recentRowBorder]}>
                  <Skeleton width={48} height={48} radius={12} style={{ marginRight: 14 }} />
                  <View style={staticStyles.recentSkeletonMeta}>
                    <Skeleton width={'70%'} height={14} />
                    <Skeleton width={'35%'} height={11} />
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : recent.length > 0 ? (
          <>
            <View style={[styles.sectionHeaderRow, staticStyles.sectionHeaderMargin]}>
              <Ionicons name="time-outline" size={14} color={theme.colors.inkSoft} style={{ marginRight: 5 }} />
              <Text style={styles.sectionHeader}>{t('home.recentActs')}</Text>
              <Pressable onPress={() => router.push('/history' as any)} hitSlop={16} {...a11y('ყველა აქტივობის ნახვა', 'შეეხეთ ისტორიის სანახავად', 'button')}>
                <Text style={styles.sectionLink}>ყველა</Text>
              </Pressable>
            </View>
            <View style={staticStyles.recentListMargin}>
              {recentGrouped.map((group, gi) => {
                const isLastGroup = gi === recentGrouped.length - 1;
                return (
                  <View key={group.label}>
                    <View style={styles.dateSeparator}>
                      <Text style={styles.dateSeparatorText}>{group.label}</Text>
                    </View>
                    {group.items.map((q, i) => {
                      const tpl = templates.find(t => t.id === q.template_id);
                      const isLast = isLastGroup && i === group.items.length - 1;
                      const isDraft = q.status === 'draft';
                      const menuOpen = openMenuId === q.id;
                      const rowContent = (
                        <View style={[styles.recentRow, !isLast && styles.recentRowBorder]}>
                          <Pressable
                            onPress={() => router.push(routeForInspection(tpl?.category, q.id, !isDraft) as any)}
                            style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                          >
                            <InspectionTypeAvatar
                              category={tpl?.category}
                              size={48}
                              status={isDraft ? 'draft' : 'completed'}
                              style={{ marginRight: 14 }}
                            />
                            <View style={staticStyles.flex}>
                              <RecordTypePill recordType="inspection" />
                              <Text style={styles.recentTitle} numberOfLines={1}>
                                {templateName(q.template_id)}
                              </Text>
                              <Text style={styles.recentMeta} numberOfLines={1}>
                                {(() => { const p = projects.find(pr => pr.id === q.project_id); return p ? (p.company_name || p.name) : ''; })()}
                              </Text>
                            </View>
                            <Text style={styles.recentTime}>{relativeTime(q.created_at, t, i18n.language)}</Text>
                          </Pressable>
                          <View style={{ position: 'relative' }}>
                            <Pressable
                              hitSlop={8}
                              onPress={() => setOpenMenuId(menuOpen ? null : q.id)}
                              style={styles.kebabBtn}
                            >
                              <Ionicons name="ellipsis-vertical" size={18} color={theme.colors.inkSoft} />
                            </Pressable>
                            {menuOpen && (
                              <>
                                <Pressable
                                  style={StyleSheet.absoluteFillObject}
                                  onPress={() => setOpenMenuId(null)}
                                />
                                <View style={[styles.rowMenu, { backgroundColor: theme.colors.card, borderColor: theme.colors.hairline }]}>
                                  <Pressable
                                    style={styles.rowMenuItem}
                                    onPress={() => {
                                      setOpenMenuId(null);
                                      router.push(routeForInspection(tpl?.category, q.id, !isDraft) as any);
                                    }}
                                  >
                                    <Ionicons name={isDraft ? 'play-outline' : 'eye-outline'} size={15} color={theme.colors.ink} />
                                    <Text style={[styles.rowMenuLabel, { color: theme.colors.ink }]}>
                                      {isDraft ? 'გაგრძელება' : 'ნახვა'}
                                    </Text>
                                  </Pressable>
                                  <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.hairline }} />
                                  <Pressable
                                    style={styles.rowMenuItem}
                                    onPress={() => {
                                      setOpenMenuId(null);
                                      Alert.alert('წაშლა', 'დარწმუნებული ხართ?', [
                                        { text: 'გაუქმება', style: 'cancel' },
                                        { text: 'წაშლა', style: 'destructive', onPress: () => deleteRecentDraft(q.id, tpl?.category ?? undefined) },
                                      ]);
                                    }}
                                  >
                                    <Ionicons name="trash-outline" size={15} color={theme.colors.danger} />
                                    <Text style={[styles.rowMenuLabel, { color: theme.colors.danger }]}>წაშლა</Text>
                                  </Pressable>
                                </View>
                              </>
                            )}
                          </View>
                        </View>
                      );
                      return q.status === 'draft' ? (
                        <Swipeable
                          key={q.id}
                          friction={2}
                          rightThreshold={40}
                          overshootRight={false}
                          renderRightActions={() => (
                            <Pressable
                              onPress={() => deleteRecentDraft(q.id, tpl?.category ?? undefined)}
                              style={styles.deleteAction}
                            >
                              <Ionicons name="trash-outline" size={22} color={theme.colors.white} />
                              <Text style={styles.deleteActionText}>წაშლა</Text>
                            </Pressable>
                          )}
                        >
                          {rowContent}
                        </Swipeable>
                      ) : (
                        <View key={q.id}>{rowContent}</View>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          </>
        ) : null}

        {/* ───────── TIP OF THE DAY ───────── */}
        <View style={[styles.sectionWrap, staticStyles.sectionHeaderMargin]}>
          <Card style={styles.tipCard}>
            <View style={styles.tipIcon}>
              <Ionicons name="shield-checkmark" size={20} color={theme.colors.accent} />
            </View>
            <View style={staticStyles.flex}>
              <Text style={styles.tipLabel}>რჩევა დღისთვის</Text>
              <Text style={styles.tipBody}>{tip}</Text>
            </View>
          </Card>
        </View>
      </Animated.ScrollView>

      <CustomDropdown
        label={t('home.chooseTemplate')}
        options={tplPickerTemplates.map(tpl => ({
          label: tpl.name,
          value: tpl.id,
          icon: <InspectionTypeAvatar category={tpl.category} size={36} />,
        }))}
        value={null}
        onChange={(id) => {
          const tpl = tplPickerTemplates.find(t => t.id === String(id));
          if (!tpl) return;
          // Every template picks its project as the first in-flow step.
          const qs = tpl.category
            ? `category=${tpl.category}&templateId=${tpl.id}`
            : `templateId=${tpl.id}`;
          router.push(`/inspections/new?${qs}` as any);
        }}
        open={tplPickerVisible}
        onOpenChange={setTplPickerVisible}
      />

      <ProjectPickerSheet
        visible={pickerVisible}
        initialView={pickerInitialView}
        action={pickerAction}
        projects={projects}
        templates={templates}
        preselectedTemplateId={null}
        onClose={() => setPickerVisible(false)}
        onCreated={async () => {
          // Invalidate caches so the new inspection/project appears immediately
          await qc.invalidateQueries({ queryKey: ['projects', 'list'] });
          await qc.invalidateQueries({ queryKey: ['inspections', 'recent'] });
        }}
        onProjectCreated={(id) => {
          setPickerVisible(false);
          router.push(`/projects/${id}` as any);
        }}
      />
    </View>
  );
}

// ──────────── STYLES ────────────


const PROJECT_CARD_HEIGHT = 120;

function getStyles(theme: Theme) {
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
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
    marginTop: 28,
  },
  sectionHeader: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.05,
  },
  sectionLink: {
    fontSize: 13,
    color: theme.colors.accent,
    fontWeight: '500',
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
  resumeStepLabel: {
    color: theme.colors.warn,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: theme.colors.hairline,
    marginTop: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
    backgroundColor: theme.colors.warn,
  },
  draftSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  draftSectionTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  draftBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.warn,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  draftBadgeText: {
    color: theme.colors.white,
    fontSize: 11,
    fontWeight: '700',
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
    height: PROJECT_CARD_HEIGHT,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden' as const,
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

  // RECENT — flat list, no card wrapper
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: 'transparent',
  },
  recentRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.hairline,
  },
  recentTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.ink,
    lineHeight: 20,
    marginBottom: 3,
  },
  recentMeta: {
    fontSize: 12,
    color: theme.colors.inkFaint,
    fontWeight: '400',
  },
  recentTime: {
    fontSize: 12,
    color: theme.colors.inkSoft,
    marginLeft: 8,
    marginRight: 4,
  },
  dateSeparator: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 10,
  },
  dateSeparatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.08,
  },

  // DRAFT DELETE ACTION
  deleteAction: {
    backgroundColor: theme.colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: 72,
    borderRadius: 14,
    marginLeft: 8,
    marginRight: 20,
    marginVertical: 2,
    gap: 4,
  },
  deleteActionText: {
    color: theme.colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  kebabBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMenu: {
    position: 'absolute',
    right: 0,
    top: 34,
    width: 150,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 100,
    overflow: 'hidden',
  },
  rowMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  rowMenuLabel: {
    fontSize: 14,
    fontWeight: '500',
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

