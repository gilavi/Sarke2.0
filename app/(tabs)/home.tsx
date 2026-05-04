import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Swipeable } from 'react-native-gesture-handler';
import {
  Alert,
  Animated as RNAnimated,
  Keyboard,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSheetKeyboardMargin } from '../../lib/useSheetKeyboardMargin';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../../lib/session';
import { ProjectAvatar } from '../../components/ProjectAvatar';
import { pickProjectLogo } from '../../lib/projectLogo';
import { isExpiringSoon, questionnairesApi, projectsApi } from '../../lib/services';
import { supabase } from '../../lib/supabase';
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
import { friendlyError } from '../../lib/errorMap';
import { Button, Card } from '../../components/ui';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import { NumberPop, useScrollHeader } from '../../components/animations';
import { QuickActions, type QuickAction } from '../../components/QuickActions';
import { useBottomSheet } from '../../components/BottomSheet';
import { Skeleton } from '../../components/Skeleton';
import type { LatLng } from '../../components/MapPicker';
import { LocationRow } from '../../components/LocationRow';
import { MapPickerInline } from '../../components/MapPickerInline';
import { routeForInspection } from '../../lib/inspectionRouting';
import { useToast } from '../../lib/toast';
import MapView, { PROVIDER_DEFAULT } from 'react-native-maps';
import { haptic } from '../../lib/haptics';
import { useTranslation } from 'react-i18next';
import type { Inspection, Project, Qualification, Template } from '../../types/models';
import { bobcatApi } from '../../lib/bobcatService';
import { excavatorApi } from '../../lib/excavatorService';
import { generalEquipmentApi } from '../../lib/generalEquipmentService';
import { InspectionTypeAvatar } from '../../components/InspectionTypeAvatar';

const staticStyles = StyleSheet.create({
  scrollContent: { paddingBottom: 100 },
  projectRowWrap: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 10, gap: 12, marginBottom: 24 },
  emptyProjectWrap: { paddingHorizontal: 20, marginTop: 10, marginBottom: 24 },
  sectionHeaderMargin: { marginTop: 28 },
  recentListMargin: { marginTop: 8 },
  flex: { flex: 1 },
  bannerTitleRow: { flexDirection: 'row', alignItems: 'baseline' },
  backButtonMargin: { marginRight: 10 },
  formContent: { paddingTop: 4, paddingBottom: 8, gap: 16 },
  logoWrap: { alignItems: 'center', gap: 8, marginBottom: 4 },
  recentSkeletonMeta: { flex: 1, gap: 6 },
});

export default function HomeScreen() {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const pickerStyles = useMemo(() => getPickerStyles(theme), [theme]);
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

  const showActionSheet = useBottomSheet();

  const [refreshing, setRefreshing] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerInitialView, setPickerInitialView] = useState<'list' | 'new'>('list');
  const [pickerAction, setPickerAction] = useState<'inspection' | 'incident' | 'briefing' | 'report'>('inspection');
  const [pickerPreselectedTemplateId, setPickerPreselectedTemplateId] = useState<string | null>(null);

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
      if (category === 'bobcat') {
        const { error } = await supabase.from('bobcat_inspections').delete().eq('id', id);
        if (error) throw error;
      } else if (category === 'excavator') {
        const { error } = await supabase.from('excavator_inspections').delete().eq('id', id);
        if (error) throw error;
      } else if (category === 'general_equipment') {
        const { error } = await supabase.from('general_equipment_inspections').delete().eq('id', id);
        if (error) throw error;
      } else {
        await questionnairesApi.remove(id);
      }
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

  const templateName = useCallback((id: string) => templates.find((tpl) => tpl.id === id)?.name ?? t('common.inspection'), [templates, t]);

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
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(255,255,255,0.92)' }]} />
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
        scrollEventThrottle={32}
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

        {/* ───────── CONTINUE DRAFT ───────── */}
        {latestDraft ? (
          <RNAnimated.View style={{
            opacity: deleteOpacity,
            transform: [{ scale: deleteScale }],
          }}>
            <Swipeable
              ref={swipeableRef}
              friction={2}
              rightThreshold={40}
              overshootRight={false}
              renderRightActions={() => (
                <Pressable
                  onPress={() => handleDraftDelete(latestDraft.id)}
                  style={styles.deleteAction}
                >
                  <Ionicons name="trash-outline" size={22} color="#fff" />
                  <Text style={styles.deleteActionText}>წაშლა</Text>
                </Pressable>
              )}
            >
              <View style={{ paddingHorizontal: 20 }}>
                <Card
                  onPress={() => {
                    const tpl = templates.find(t => t.id === latestDraft.template_id);
                    router.push(routeForInspection(tpl?.category, latestDraft.id, false) as any);
                  }}
                  a11y={a11y('შევსების გაგრძელება', 'შეეხეთ მონახაზის გასაგრძელებლად', 'button')}
                  style={styles.resumeCard}
                >
                    <View style={styles.resumeIcon}>
                      <Ionicons name="pencil" size={16} color={theme.colors.warn} />
                    </View>
                    <View style={staticStyles.flex}>
                      <Text style={styles.resumeEyebrow}>{t('home.resumeDraft')}</Text>
                      <Text style={styles.resumeTitle} numberOfLines={1}>
                        {templateName(latestDraft.template_id)}
                      </Text>
                      <Text style={styles.resumeMeta} numberOfLines={1}>
                        {relativeTime(latestDraft.created_at, t, i18n.language)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.colors.inkFaint} />
                </Card>
              </View>
            </Swipeable>
          </RNAnimated.View>
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
                  setPickerAction('inspection');
                  setPickerInitialView('list');
                  if (sysTpls.length === 1) {
                    setPickerPreselectedTemplateId(sysTpls[0].id);
                    setPickerVisible(true);
                  } else {
                    const options = [...sysTpls.map(tpl => tpl.name), t('common.cancel')];
                    showActionSheet(
                      { title: t('home.chooseTemplate'), options, cancelButtonIndex: options.length - 1 },
                      (idx) => {
                        if (idx == null || idx === options.length - 1) return;
                        setPickerPreselectedTemplateId(sysTpls[idx].id);
                        setPickerVisible(true);
                      },
                    );
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
          <Pressable onPress={() => router.push('/(tabs)/projects' as any)} hitSlop={8}>
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
              <Pressable onPress={() => router.push('/history' as any)} hitSlop={8} {...a11y('ყველა აქტივობის ნახვა', 'შეეხეთ ისტორიის სანახავად', 'button')}>
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
                      const rowContent = (
                        <Pressable
                          onPress={() =>
                            router.push(routeForInspection(tpl?.category, q.id, q.status === 'completed') as any)
                          }
                          style={[styles.recentRow, !isLast && styles.recentRowBorder]}
                          {...a11y(
                            `${templateName(q.template_id)}, ${q.status === 'completed' ? 'დასრულებული' : 'მონახაზი'}`,
                            q.status === 'completed' ? 'შეეხეთ დეტალების სანახავად' : 'შეეხეთ გასაგრძელებლად',
                            'button',
                          )}
                        >
                          <InspectionTypeAvatar
                            category={tpl?.category}
                            size={48}
                            status={q.status === 'completed' ? 'completed' : 'draft'}
                            style={{ marginRight: 14 }}
                          />
                          <View style={staticStyles.flex}>
                            <Text style={styles.recentTitle} numberOfLines={1}>
                              {templateName(q.template_id)}
                            </Text>
                            <Text style={styles.recentMeta} numberOfLines={1}>
                              {(() => { const p = projects.find(pr => pr.id === q.project_id); return p ? (p.company_name || p.name) : ''; })()}
                            </Text>
                          </View>
                          <Text style={styles.recentTime}>{relativeTime(q.created_at, t, i18n.language)}</Text>
                          <Ionicons name="chevron-forward" size={14} color="#D3D1C7" />
                        </Pressable>
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
                              <Ionicons name="trash-outline" size={22} color="#fff" />
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

      <ProjectPickerSheet
        visible={pickerVisible}
        initialView={pickerInitialView}
        action={pickerAction}
        projects={projects}
        templates={templates}
        preselectedTemplateId={pickerPreselectedTemplateId}
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

// ──────────── PROJECT PICKER SHEET ────────────

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
  action = 'inspection',
  projects,
  templates,
  preselectedTemplateId = null,
  onClose,
  onCreated,
  onProjectCreated,
}: {
  visible: boolean;
  initialView?: 'list' | 'new';
  action?: 'inspection' | 'incident' | 'briefing' | 'report';
  projects: Project[];
  templates: Template[];
  preselectedTemplateId?: string | null;
  onClose: () => void;
  onCreated: () => Promise<void>;
  onProjectCreated?: (id: string) => void;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const pickerStyles = useMemo(() => getPickerStyles(theme), [theme]);
  const router = useRouter();
  const toast = useToast();
  const [view, setView] = useState<'list' | 'new'>('list');
  const [pickedTemplateId, setPickedTemplateId] = useState<string | null>(null);
  const pickedTemplateIdRef = useRef<string | null>(null);
  useEffect(() => { pickedTemplateIdRef.current = pickedTemplateId; }, [pickedTemplateId]);
  const [company, setCompany] = useState('');
  const [address, setAddress] = useState('');
  const [pin, setPin] = useState<LatLng | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);
  const keyboardMargin = useSheetKeyboardMargin();

  // Reset form + view every time the sheet opens or props change
  useEffect(() => {
    if (visible) {
      setView(initialView);
      setPickedTemplateId(preselectedTemplateId ?? null);
      setCompany('');
      setAddress('');
      setPin(null);
      setLogo(null);
      setBusy(false);
      setMapVisible(false);
    }
  }, [visible, initialView, preselectedTemplateId]);

  const onPickLogo = async () => {
    const next = await pickProjectLogo();
    if (next) setLogo(next);
  };

  const onProjectPicked = (projectId: string) => {
    if (action !== 'inspection') {
      const route =
        action === 'incident'  ? `/incidents/new?projectId=${projectId}` :
        action === 'briefing'  ? `/briefings/new?projectId=${projectId}` :
                                 `/reports/new?projectId=${projectId}`;
      onClose();
      router.push(route as any);
      return;
    }
    const tplId = pickedTemplateIdRef.current;
    if (!tplId) {
      toast.error(t('errors.notFoundTemplate'));
      return;
    }
    void startInspection(projectId, tplId);
  };

  const startInspection = async (projectId: string, templateId: string) => {
    const tpl = templates.find(t => t.id === templateId);
    try {
      let newId: string;
      if (tpl?.category === 'bobcat') {
        newId = (await bobcatApi.create({ projectId, templateId })).id;
      } else if (tpl?.category === 'excavator') {
        newId = (await excavatorApi.create({ projectId, templateId })).id;
      } else if (tpl?.category === 'general_equipment') {
        newId = (await generalEquipmentApi.create({ projectId, templateId })).id;
      } else {
        newId = (await questionnairesApi.create({ projectId, templateId })).id;
      }
      onClose();
      router.push(routeForInspection(tpl?.category, newId, false) as any);
    } catch (e) {
      toast.error(friendlyError(e, t('errors.createFailed')));
    }
  };

  const createProject = async () => {
    if (!company.trim()) return;
    setBusy(true);
    try {
      // Create project — API returns the created object directly
      const created = await projectsApi.create({
        name: company.trim(),
        companyName: company.trim(),
        address: address.trim() || null,
        latitude: pin?.latitude ?? null,
        longitude: pin?.longitude ?? null,
        logo,
      });
      // Refresh the dashboard in the background — `onCreated` re-fetches all
      // 4 home endpoints, which used to gate navigation on a full reload.
      // Fire-and-forget so the new project screen opens immediately; by the
      // time the user navigates back, the dashboard data has already updated.
      void onCreated();
      // Use returned project directly (no stale prop issues)
      if (created?.id) {
        setCompany('');
        setAddress('');
        setPin(null);
        setLogo(null);
        if (action === 'inspection') {
          const tplId = pickedTemplateIdRef.current;
          if (tplId) {
            await startInspection(created.id, tplId);
            return;
          }
        }
        if (onProjectCreated) {
          onProjectCreated(created.id);
        } else {
          onClose();
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
          <RNAnimated.View style={{ width: '100%', marginBottom: keyboardMargin }}>
          <Pressable style={[pickerStyles.card, { maxHeight: '90%' }]} onPress={() => {}}>
            <View style={pickerStyles.handle} />

            {view === 'list' ? (
              <>
                {/* Sheet header */}
                <View style={pickerStyles.sheetHeader}>
                  {pickedTemplateId ? (
                    <InspectionTypeAvatar
                      category={templates.find(t => t.id === pickedTemplateId)?.category}
                      size={36}
                    />
                  ) : null}
                  <Text style={[pickerStyles.sheetTitle, { flex: 1 }]}>{t('home.startInspectionSheetTitle')}</Text>
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
                        onPress={() => onProjectPicked(p.id)}
                        style={pickerStyles.projectRow}
                      >
                        <ProjectAvatar project={p} size={44} />
                        <View style={staticStyles.flex}>
                          <Text style={pickerStyles.rowName} numberOfLines={1}>{p.company_name || p.name}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </>
            ) : (
              <>
                {/* New project form header with back button */}
                <View style={pickerStyles.sheetHeader}>
                  <Pressable onPress={() => setView('list')} hitSlop={10} style={staticStyles.backButtonMargin}>
                    <Ionicons name="arrow-back" size={22} color={theme.colors.accent} />
                  </Pressable>
                  <Text style={[pickerStyles.sheetTitle, staticStyles.flex]}>{t('home.newProjectFormTitle')}</Text>
                  <Pressable onPress={onClose} hitSlop={10}>
                    <Ionicons name="close" size={22} color={theme.colors.inkSoft} />
                  </Pressable>
                </View>

                {/* Form fields */}
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="interactive"
                  showsVerticalScrollIndicator={false}
                  style={{ maxHeight: '72%' }}
                  contentContainerStyle={staticStyles.formContent}
                >
                  <View style={staticStyles.logoWrap}>
                    <ProjectAvatar
                      project={{ name: company || '—', logo }}
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
                    {...a11y(t('common.address'), 'შეიყვანეთ მისამართი', 'text')}
                  />
                  <LocationRow pin={pin} address={address} onPress={() => { Keyboard.dismiss(); setMapVisible(true); }} />
                </ScrollView>
                <View style={{ paddingHorizontal: 24, paddingTop: 10, paddingBottom: insets.bottom || 16 }}>
                  <Button
                    title={t('projects.createButton')}
                    onPress={createProject}
                    loading={busy}
                    disabled={!company.trim()}
                    {...a11y(t('projects.createButton'), 'შეეხეთ ახალი პროექტის შესაქმნელად', 'button')}
                  />
                </View>
              </>
            )}
          </Pressable>
          </RNAnimated.View>

        {/* Full-screen map overlay — no nested Modal */}
        {mapVisible && (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.colors.background }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: insets.top + 12, paddingVertical: 12 }}>
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

const ProjectCard = memo(function ProjectCard({
  project,
  width,
  onPress,
}: {
  project: Project;
  width: number;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <Pressable
      onPress={onPress}
      {...a11y(
        `პროექტი: ${project.company_name || project.name}`,
        'შეეხეთ პროექტის დეტალების სანახავად',
        'button'
      )}
    >
      <View style={[styles.projectCard, { width }]}>
        {project.latitude != null && project.longitude != null && (
          <>
            <MapView
              style={StyleSheet.absoluteFill}
              provider={PROVIDER_DEFAULT}
              region={{
                latitude: project.latitude,
                longitude: project.longitude,
                latitudeDelta: 0.018,
                longitudeDelta: 0.018,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              liteMode
              pointerEvents="none"
            />
            <View style={styles.projectCardMapOverlay} />
          </>
        )}
        <View style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden' }}>
          <ProjectAvatar project={project} size={44} />
        </View>
        <Text style={styles.projectName} numberOfLines={2}>{project.company_name || project.name}</Text>
      </View>
    </Pressable>
  );
}, (prev, next) => prev.project.id === next.project.id && prev.width === next.width);

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

// Skeleton placeholder arrays — hoisted so .map() doesn't allocate a fresh
// array on every render of the loading state.
const PROJECT_SKELETONS = [0, 1] as const;
const RECENT_SKELETONS = [0, 1, 2] as const;

function tipOfTheDay(t: (key: string) => string) {
  const day = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return t(TIP_KEYS[day % TIP_KEYS.length]);
}

function dateGroupLabel(iso: string, lang: string): string {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'დღეს';
  if (diff === 1) return 'გუშინ';
  const locale = lang.startsWith('en') ? 'en-US' : 'ka-GE';
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

function groupByDate<T extends { created_at: string }>(
  items: T[],
  lang: string,
): { label: string; items: T[] }[] {
  const groups: { label: string; items: T[] }[] = [];
  for (const item of items) {
    const label = dateGroupLabel(item.created_at, lang);
    const existing = groups.find(g => g.label === label);
    if (existing) existing.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
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
    color: '#6B7280',
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
    gap: 6,
    height: PROJECT_CARD_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
  },
  projectCardMapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: withOpacity(theme.colors.card, 0.88),
  },
  projectEmoji: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.ink,
    lineHeight: 19,
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
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  recentTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
    lineHeight: 20,
    marginBottom: 3,
  },
  recentMeta: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '400',
  },
  recentTime: {
    fontSize: 12,
    color: '#B4B2A9',
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
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.08,
  },

  // DRAFT DELETE ACTION
  deleteAction: {
    backgroundColor: '#EF4444',
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
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
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

function getPickerStyles(theme: Theme) {
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
