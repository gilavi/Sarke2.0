import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { RefreshControl } from '../../components/primitives';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  CloudOff, CloudUpload, TriangleAlert, ChevronRight,
  Plus, CirclePlus, ShieldCheck,
} from 'lucide-react-native';
import { useSession } from '../../lib/session';
import { isExpiringSoon } from '../../lib/services';
import { useQueryClient } from '@tanstack/react-query';
import {
  useProjects,
  useQualifications,
  useTemplates,
} from '../../lib/apiHooks';
// shareStoredPdf import removed - PDF sharing now lives on the inspection
// detail screen (which fetches certificates list) post 0006 decoupling.
import { useTheme, withOpacity, type Theme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import { Card } from '../../components/ui';
import { NumberPop, useScrollHeader } from '../../components/animations';
import { QuickActions } from '../../components/QuickActions';
import { Skeleton } from '../../components/Skeleton';
import { inspectionDisplayName } from '../../lib/shared/documentName';
import { useToast } from '../../lib/toast';
import { useTranslation } from 'react-i18next';
import type { Inspection, Project, Template } from '../../types/models';
import { InspectionTypeAvatar } from '../../components/InspectionTypeAvatar';
import { CustomDropdown } from '../../components/ui/CustomDropdown';
import { ProjectCard } from '../../components/home/ProjectCard';
import { ProjectPickerSheet } from '../../components/home/ProjectPickerSheet';
import {
  greetingFor,
  todayFormatted,
  tipOfTheDay,
  PROJECT_SKELETONS,
} from '../../lib/homeUtils';
import { ResumeDraftCard } from '../../features/home-records/ResumeDraftCard';
import { HomeRecordsSection } from '../../features/home-records/HomeRecordsSection';

const staticStyles = StyleSheet.create({
  scrollContent: { paddingBottom: 100 },
  // Each major section owns its TOP gap (~28); bottoms stay 0 so the rhythm
  // between sections is uniform regardless of which optional blocks render.
  projectRowWrap: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 28, gap: 12 },
  emptyProjectWrap: { paddingHorizontal: 20, marginTop: 28 },
  sectionHeaderMargin: { marginTop: 28 },
  recentListMargin: { marginTop: 4 },
  tipMargin: { marginTop: 16 },
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
  const projectsQ = useProjects();

  const certs = certsQ.data ?? [];
  const templates = templatesQ.data ?? [];
  const projects = projectsQ.data ?? [];

  const loaded = !certsQ.isLoading && !templatesQ.isLoading && !projectsQ.isLoading;
  const loadError = certsQ.isError && templatesQ.isError && projectsQ.isError;

  // Per-section "show skeleton" flags. We can't rely on `isLoading` alone:
  // it only flips true on the very first fetch and stays false during background
  // refetches - including the post-login refetch triggered after a stale empty
  // result. Use `isFetching && data.length === 0` so we keep showing the
  // skeleton until the in-flight fetch actually returns rows (or settles empty),
  // instead of flashing the empty state in between. The `!isFetched` arm covers
  // the very first render where `isFetching` may not have flipped on yet.
  const projectsLoading =
    (projectsQ.isFetching || !projectsQ.isFetched) && projects.length === 0;

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerInitialView, setPickerInitialView] = useState<'list' | 'new'>('list');
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
      : Math.round(screenWidth * 0.55);
  const isProjectsCarousel = projects.length > 2;

  const user = state.status === 'signedIn' ? state.user : null;
  const firstName = user?.first_name ?? '';
  const greeting = greetingFor(firstName, t);
  const expiringCount = useMemo(() => certs.filter(isExpiringSoon).length, [certs]);
  const showCertBanner = projects.length > 0 && (certs.length === 0 || expiringCount > 0);
  const tip = tipOfTheDay(t);

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
        queries={[certsQ, templatesQ, projectsQ]}
        progressViewOffset={HEADER_FULL}
      />
    ),
    [HEADER_FULL, certsQ, templatesQ, projectsQ]
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Scroll-driven shrinking header (Airbnb-style) - sits OVER the status bar
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
        scrollEventThrottle={16}
        contentInsetAdjustmentBehavior="never"
        refreshControl={refreshControl}
        contentContainerStyle={[staticStyles.scrollContent, { paddingTop: HEADER_FULL }]}
      >
        {/* ───────── FETCH ERROR BANNER ───────── */}
        {loaded && loadError ? (
          <View style={styles.fetchErrorBanner}>
            <CloudOff size={16} color={theme.colors.warn} strokeWidth={1.5} />
            <Text style={styles.fetchErrorText}>{t('home.fetchError')}</Text>
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
                {certs.length === 0
                  ? <CloudUpload size={18} color={theme.colors.warn} strokeWidth={1.5} />
                  : <TriangleAlert size={18} color={theme.colors.warn} strokeWidth={1.5} />}
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
              <ChevronRight size={16} color={theme.colors.warn} strokeWidth={1.5} />
          </Card>
        ) : null}

        {/* ───────── PROJECTS ───────── */}

        {projectsLoading ? (
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
                <Plus size={24} color={theme.colors.ink} strokeWidth={2.5} />
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
            contentContainerStyle={{ paddingHorizontal: HPAD, paddingTop: 28, paddingBottom: 0, gap: GAP }}
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
                <CirclePlus size={28} color={theme.colors.ink} strokeWidth={1.5} />
                <Text style={styles.newProjectCardText}>{t('home.newLabel')}</Text>
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

        {/* ───────── QUICK ACTIONS ───────── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 0 }}>
          <QuickActions
            actions={[
              {
                label: t('home.quickInspection'),
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
                label: t('home.quickIncident'),
                colorKey: 'incident',
                onPress: () => router.push('/incidents/new' as any),
              },
              {
                label: t('home.quickBriefing'),
                colorKey: 'briefing',
                onPress: () => router.push('/briefings/new' as any),
              },
              {
                label: t('home.quickReport'),
                colorKey: 'report',
                onPress: () => router.push('/reports/new' as any),
              },
            ]}
          />
        </View>

        {/* ───────── DRAFTS (resume card) + RECORD WIDGETS ───────── */}
        {/* Only the single most-recent inspection draft lives on Home, as the
            resume card. Completed records are split into per-type widgets
            (Inspections / Reports / Brdzaneba / Incidents / Briefings), each
            linking to the type-filtered History screen. Every other draft lives
            on the Drafts screen (More tab). */}
        <ResumeDraftCard />
        <HomeRecordsSection />

        {/* ───────── TIP OF THE DAY ───────── */}
        <View style={[styles.sectionWrap, staticStyles.tipMargin]}>
          <Card style={styles.tipCard}>
            <View style={styles.tipIcon}>
              <ShieldCheck size={20} color={theme.colors.accent} strokeWidth={1.5} />
            </View>
            <View style={staticStyles.flex}>
              <Text style={styles.tipLabel}>{t('home.tipOfDay')}</Text>
              <Text style={styles.tipBody}>{tip}</Text>
            </View>
          </Card>
        </View>
      </Animated.ScrollView>

      <CustomDropdown
        label={t('home.chooseTemplate')}
        options={tplPickerTemplates.map(tpl => ({
          label: inspectionDisplayName(tpl.name),
          value: tpl.id,
          icon: <InspectionTypeAvatar category={tpl.category} size={52} circle muted />,
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
        action="inspection"
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


const PROJECT_CARD_HEIGHT = 155;

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

  // HERO (legacy - kept for non-scroll callers if any reuse)
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
    fontSize: 26,
    fontWeight: '900',
    color: theme.colors.ink,
    lineHeight: 32,
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
    paddingTop: 0,
    paddingBottom: 10,
    // marginTop comes from staticStyles.sectionHeaderMargin (applied at usage).
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
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.hairline,
    overflow: 'hidden',
  },
  resumeAccent: {
    width: 4,
    backgroundColor: '#FF6D2E',
  },
  resumeContent: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  resumeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resumeTitle: {
    flex: 1,
    color: theme.colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  resumePill: {
    backgroundColor: theme.colors.neutral[900],
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  resumePillText: {
    color: theme.colors.highlight,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  resumeBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  resumeStepLabel: {
    color: theme.colors.inkSoft,
    fontSize: 11,
    fontWeight: '600',
  },
  resumeMeta: {
    color: theme.colors.inkSoft,
    fontSize: 11,
  },
  progressTrack: {
    height: 2,
    borderRadius: 1,
    backgroundColor: withOpacity(theme.colors.ink, 0.1),
    overflow: 'hidden',
  },
  progressFill: {
    height: 2,
    borderRadius: 1,
    backgroundColor: withOpacity(theme.colors.ink, 0.35),
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
    marginTop: 12,
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
    backgroundColor: theme.colors.ink,
    borderRadius: 16,
    height: PROJECT_CARD_HEIGHT,
  },
  emptyPlusIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyProjectsText: {
    fontSize: 11,
    color: withOpacity(theme.colors.surface, 0.5),
  },
  emptyProjectsCta: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.surface,
  },
  newProjectCard: {
    backgroundColor: theme.colors.highlightSoft,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.colors.highlight,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: PROJECT_CARD_HEIGHT,
  },
  newProjectCardText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.ink,
  },

  // RECENT - flat list, no card wrapper
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
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
    paddingHorizontal: 20,
    paddingTop: 14,
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

