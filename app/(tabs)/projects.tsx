import AsyncStorage from '@react-native-async-storage/async-storage';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Animated,
  Dimensions,
  Keyboard,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useSheetKeyboardMargin } from '../../lib/useSheetKeyboardMargin';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { ProjectAvatar } from '../../components/ProjectAvatar';
import { pickProjectLogo } from '../../lib/projectLogo';
import { Button, Card } from '../../components/ui';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import { FabButton } from '../../components/primitives';
import { A11yText, A11yText as Text } from '../../components/primitives/A11yText';
import { SheetLayout } from '../../components/SheetLayout';
import { PressableScale } from '../../components/animations/PressableScale';
import { a11y } from '../../lib/accessibility';
import EmptyState from '../../components/EmptyState';
import { Skeleton } from '../../components/Skeleton';
import { MapPicker, type LatLng } from '../../components/MapPicker';
import { MapPreview } from '../../components/MapPreview';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { projectsApi } from '../../lib/services';
import { useToast } from '../../lib/toast';
import { useTheme } from '../../lib/theme';
import { useCalendarEvents } from '../../lib/apiHooks';
import { useBottomSheet } from '../../components/BottomSheet';
import { friendlyError } from '../../lib/errorMap';
import { haptic } from '../../lib/haptics';
import type { Project } from '../../types/models';
import { TourGuide, type TourStep } from '../../components/TourGuide';
import { useTranslation } from 'react-i18next';

type Stats = Record<string, { drafts: number; completed: number }>;

// Query keys exposed so the create flow + session prefetch can invalidate
// or seed the cache without re-defining the keys inline.
export const PROJECTS_LIST_QK = ['projects', 'list'] as const;
export const PROJECTS_STATS_QK = ['projects', 'stats'] as const;

export default function ProjectsScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const router = useRouter();
  const toast = useToast();
  const showActionSheet = useBottomSheet();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'map'>('list');
  const openSwipeRefs = useRef(new Map<string, { close: () => void }>());

  useEffect(() => {
    AsyncStorage.getItem('projects_view_pref').then(v => {
      if (v === 'grid' || v === 'map') setViewMode(v);
    });
  }, []);

  const applyView = useCallback((mode: 'list' | 'grid' | 'map') => {
    setViewMode(mode);
    void AsyncStorage.setItem('projects_view_pref', mode);
  }, []);

  // Tour refs
  const listRef = useRef<View>(null);
  const firstCardRef = useRef<View>(null);
  const fabRef = useRef<View>(null);

  // Projects + stats now flow through React Query: 5-min staleTime means
  // tab-switching is instant, and the AsyncStorage persister keeps the cache
  // warm across app launches so the first tap after cold start doesn't have
  // to wait for the network either.
  const projectsQ = useQuery<Project[]>({
    queryKey: PROJECTS_LIST_QK,
    queryFn: () => projectsApi.list(),
  });

  const statsQ = useQuery<Stats>({
    queryKey: PROJECTS_STATS_QK,
    queryFn: () => projectsApi.stats(),
  });

  const projects = projectsQ.data ?? [];
  const stats = statsQ.data ?? {};
  const loading = projectsQ.isPending && !projectsQ.data;

  const calendarEvents = useCalendarEvents();
  const overdueByProject = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of calendarEvents) {
      if (e.status === 'overdue') {
        map[e.projectId] = (map[e.projectId] ?? 0) + 1;
      }
    }
    return map;
  }, [calendarEvents]);

  const onDelete = useCallback((project: Project) => {
    showActionSheet(
      {
        title: 'დარწმუნებული ხართ?',
        options: ['დიახ, წაშლა', 'გაუქმება'],
        cancelButtonIndex: 1,
        destructiveButtonIndex: 0,
      },
      async idx => {
        if (idx !== 0) return;
        try {
          await projectsApi.remove(project.id);
          // Optimistically prune the local cache; let stats refresh in the
          // background so the badge counts reflect the deletion.
          qc.setQueryData<Project[]>(
            PROJECTS_LIST_QK,
            prev => prev?.filter(p => p.id !== project.id) ?? [],
          );
          qc.invalidateQueries({ queryKey: PROJECTS_STATS_QK });
          toast.success(t('notifications.deleted'));
        } catch (e) {
          toast.error(friendlyError(e, t('errors.deleteFailed')));
        }
      },
    );
  }, [toast, showActionSheet, t, qc]);

  const tourSteps: TourStep[] = useMemo(() => {
    const steps: TourStep[] = [
      {
        targetRef: listRef,
        title: t('projects.yourProjects'),
        body: t('projects.subtitle'),
        position: 'bottom',
      },
    ];
    if (projects.length > 0) {
      steps.push({
        targetRef: firstCardRef,
        title: t('common.project'),
        body: t('projects.tapForDetails'),
        position: 'bottom',
      });
    }
    steps.push({
      targetRef: fabRef,
      title: t('projects.addProject'),
      body: t('projects.addProjectSubtitle'),
      position: 'top',
    });
    return steps;
  }, [projects.length, t]);

  const renderItem = useCallback(({ item, index }: { item: Project; index: number }) => (
    <ProjectRow
      project={item}
      stats={stats[item.id]}
      overdue={overdueByProject[item.id] ?? 0}
      isGrid={viewMode === 'grid'}
      cardRef={index === 0 ? firstCardRef : undefined}
      onOpen={() => router.push(`/projects/${item.id}` as any)}
      onDelete={() => onDelete(item)}
      registerSwipeable={viewMode === 'list' ? (ref) => {
        if (ref) openSwipeRefs.current.set(item.id, ref);
        else openSwipeRefs.current.delete(item.id);
      } : undefined}
      onSwipeOpen={viewMode === 'list' ? () => {
        openSwipeRefs.current.forEach((ref, id) => {
          if (id !== item.id) ref.close();
        });
      } : undefined}
    />
  ), [stats, overdueByProject, viewMode, firstCardRef, router, onDelete, openSwipeRefs]);

  return (
    <TourGuide tourId="homepage_v1" steps={tourSteps}>
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('projects.title')}</Text>
        <View style={styles.viewToggle}>
          <Pressable
            onPress={() => applyView('list')}
            hitSlop={8}
            style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
          >
            <Ionicons
              name="list"
              size={22}
              color={viewMode === 'list' ? theme.colors.accent : theme.colors.inkSoft}
            />
          </Pressable>
          <Pressable
            onPress={() => applyView('grid')}
            hitSlop={8}
            style={[styles.toggleBtn, viewMode === 'grid' && styles.toggleBtnActive]}
          >
            <Ionicons
              name="grid"
              size={19}
              color={viewMode === 'grid' ? theme.colors.accent : theme.colors.inkSoft}
            />
          </Pressable>
          <Pressable
            onPress={() => applyView('map')}
            hitSlop={8}
            style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
          >
            <Ionicons
              name="location"
              size={20}
              color={viewMode === 'map' ? theme.colors.accent : theme.colors.inkSoft}
            />
          </Pressable>
        </View>
      </View>
      <View ref={listRef} collapsable={false} style={{ flex: 1 }}>
      {viewMode === 'map' ? (
        <ProjectsMapView
          projects={projects}
          stats={stats}
          overdueByProject={overdueByProject}
          onProjectOpen={id => router.push(`/projects/${id}` as any)}
        />
      ) : (
      <FlatList
        key={viewMode}
        data={projects}
        keyExtractor={p => p.id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        columnWrapperStyle={viewMode === 'grid' ? { gap: 10, paddingHorizontal: 24, marginBottom: 10 } : undefined}
        contentContainerStyle={
          viewMode === 'list'
            ? { padding: 16, paddingBottom: 100, gap: 10 }
            : { paddingTop: 12, paddingBottom: 100 }
        }
        renderItem={renderItem}
        initialNumToRender={8}
        windowSize={7}
        removeClippedSubviews
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              haptic.medium();
              setRefreshing(true);
              await Promise.all([projectsQ.refetch(), statsQ.refetch()]);
              setRefreshing(false);
            }}
            tintColor={theme.colors.accent}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: 10 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <ProjectRowSkeleton key={`skeleton-${i}`} />
              ))}
            </View>
          ) : (
            <EmptyState
              type="projects"
              title={t('projects.noProjects')}
              subtitle={t('projects.noProjectsHint')}
              action={{
                label: t('projects.createProject'),
                onPress: () => setCreating(true),
              }}
              backgroundPattern
            />
          )
        }
      />
      )}
      </View>

      <FabButton
        ref={fabRef}
        onPress={() => setCreating(true)}
        a11yLabel="ახალი პროექტი"
        a11yHint="შეეხეთ ახალი პროექტის შესაქმნელად"
      />

      <CreateProjectSheet
        visible={creating}
        onClose={() => setCreating(false)}
        onCreated={p => {
          // Seed the cache directly so the new row appears instantly without
          // a refetch round-trip. Stats will pick up the new project on its
          // next natural refresh — a brand new project has no inspections so
          // its badge would be 0/0 anyway.
          qc.setQueryData<Project[]>(
            PROJECTS_LIST_QK,
            prev => [p, ...((prev ?? []).filter(x => x.id !== p.id))],
          );
          setCreating(false);
          toast.success(t('notifications.projectCreated'));
        }}
      />
    </SafeAreaView>
    </TourGuide>
  );
}

/**
 * Bottom-sheet form for creating a new project.
 * Uses SheetLayout inside a Modal with backdrop tap-to-close.
 */
function CreateProjectSheet({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (p: Project) => void;
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

  useEffect(() => {
    if (visible) {
      setCompany('');
      setAddress('');
      setPhone('');
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

  const save = async () => {
    if (!company.trim()) return;
    setBusy(true);
    try {
      const p = await projectsApi.create({
        name: company.trim(),
        companyName: company.trim(),
        address: address.trim() || null,
        latitude: pin?.latitude ?? null,
        longitude: pin?.longitude ?? null,
        logo,
        contactPhone: phone.trim() || null,
      });
      onCreated(p);
    } catch (e) {
      toast.error(friendlyError(e, t('errors.createFailed')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => mapVisible ? setMapVisible(false) : onClose()}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* Backdrop */}
        <Pressable
          style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.colors.overlay }]}
          onPress={() => mapVisible ? setMapVisible(false) : onClose()}
          {...a11y(t('common.close'), 'შეეხეთ ფონის დასახურად', 'button')}
        />
        {/* Card — marginBottom rides the iOS keyboard so the card stops exactly at the keyboard top */}
        <Animated.View style={{ width: '100%', marginBottom: keyboardMargin }}>
          <Pressable onPress={() => {}} style={{ width: '100%' }}>
              <SheetLayout
                maxHeightRatio={0.92}
                header={{ title: t('home.newProjectFormTitle'), onClose }}
                footer={
                  <Button
                    title={t('projects.createButton')}
                    size="lg"
                    onPress={save}
                    loading={busy}
                    disabled={!company.trim()}
                  />
                }
              >
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <ProjectAvatar
                    project={{ name: company || '—', logo }}
                    size={88}
                    editable
                    onEdit={onPickLogo}
                  />
                  {logo ? (
                    <Pressable onPress={onPickLogo} hitSlop={6} {...a11y(t('projects.changePhoto'), 'შეეხეთ ლოგოს ასარჩევად', 'button')}>
                      <A11yText size="sm" weight="semibold" color={theme.colors.accent}>
                        {t('projects.changePhoto')}
                      </A11yText>
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

function ProjectRowSkeleton() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  return (
    <Card padding={14}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Skeleton width={44} height={44} radius={12} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width={'60%'} height={15} />
          <Skeleton width={'40%'} height={11} />
        </View>
      </View>
    </Card>
  );
}

function extractCity(address: string | null): string | null {
  if (!address) return null;
  const comma = address.indexOf(',');
  return (comma > 0 ? address.substring(0, comma) : address).trim() || null;
}

function projectStatusLine(
  stats: { drafts: number; completed: number } | undefined,
  overdue: number,
  theme: any,
): { text: string; color: string } {
  if (overdue > 0) return { text: `⚠ ${overdue} ვადაგადაცილებული`, color: theme.colors.danger };
  if ((stats?.drafts ?? 0) > 0) return { text: `✎ ${stats!.drafts} დრაფტი`, color: theme.colors.warn };
  if ((stats?.completed ?? 0) > 0) return { text: `✓ ${stats!.completed} დასრულებული`, color: theme.colors.inkSoft };
  return { text: 'შემოწმება არ არის', color: theme.colors.inkFaint };
}

const ProjectRow = memo(function ProjectRow({
  project,
  stats,
  overdue = 0,
  isGrid = false,
  onOpen,
  onDelete,
  registerSwipeable,
  onSwipeOpen,
  cardRef,
}: {
  project: Project;
  stats?: { drafts: number; completed: number };
  overdue?: number;
  isGrid?: boolean;
  onOpen: () => void;
  onDelete: () => void;
  registerSwipeable?: (ref: { close: () => void } | null) => void;
  onSwipeOpen?: () => void;
  cardRef?: React.RefObject<View | null>;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const swipeRef = useRef<any>(null);

  const city = extractCity(project.address);
  const subLine = city || null;
  const status = projectStatusLine(stats, overdue, theme);

  const renderRightActions = () => (
    <Pressable onPress={onDelete} style={styles.swipeDelete}>
      <Ionicons name="trash" size={20} color={theme.colors.white} />
      <A11yText size="xs" weight="semibold" color={theme.colors.white}>{t('common.delete')}</A11yText>
    </Pressable>
  );

  if (isGrid) {
    return (
      <View ref={cardRef} collapsable={false} style={{ flex: 1 }}>
        <PressableScale onPress={onOpen} hapticOnPress="navigate" scaleTo={0.98}>
          <Card padding={12}>
            <View style={{ gap: 6 }}>
              <ProjectAvatar project={project} size={36} />
              <A11yText size="base" weight="bold" numberOfLines={2}>
                {project.company_name || project.name}
              </A11yText>
              {subLine ? (
                <A11yText
                  size="xs"
                  color={theme.colors.inkSoft}
                  numberOfLines={1}
                  style={{ marginTop: -2 }}
                >
                  {subLine}
                </A11yText>
              ) : null}
              <Text style={[styles.statusText, { color: status.color }]}>
                {status.text}
              </Text>
            </View>
          </Card>
        </PressableScale>
      </View>
    );
  }

  return (
    <View ref={cardRef} collapsable={false}>
      <Swipeable
        ref={swipeRef as any}
        onSwipeableOpen={() => registerSwipeable?.(swipeRef.current)}
        renderRightActions={renderRightActions}
        overshootRight={false}
        onSwipeableWillOpen={onSwipeOpen}
      >
        <PressableScale onPress={onOpen} hapticOnPress="navigate" scaleTo={0.98}>
          <Card padding={14}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <ProjectAvatar project={project} size={44} />
              <View style={{ flex: 1 }}>
                <A11yText size="base" weight="bold" numberOfLines={1}>
                  {project.company_name || project.name}
                </A11yText>
                {subLine ? (
                  <A11yText
                    size="xs"
                    color={theme.colors.inkSoft}
                    style={{ marginTop: 2 }}
                    numberOfLines={1}
                  >
                    {subLine}
                  </A11yText>
                ) : null}
                <Text style={[styles.statusText, { color: status.color, marginTop: 4 }]}>
                  {status.text}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.inkFaint} />
            </View>
          </Card>
        </PressableScale>
      </Swipeable>
    </View>
  );
});

// ── Map view ──────────────────────────────────────────────────────────────────

function pinColor(
  project: Project,
  stats: Stats,
  overdueByProject: Record<string, number>,
): string {
  if ((overdueByProject[project.id] ?? 0) > 0) return '#EF4444';
  if ((stats[project.id]?.drafts ?? 0) > 0) return '#F59E0B';
  return '#1D9E75';
}

function ProjectsMapView({
  projects,
  stats,
  overdueByProject,
  onProjectOpen,
}: {
  projects: Project[];
  stats: Stats;
  overdueByProject: Record<string, number>;
  onProjectOpen: (id: string) => void;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const mappedProjects = useMemo(
    () => projects.filter(p => p.latitude != null && p.longitude != null),
    [projects],
  );
  const unmappedCount = projects.length - mappedProjects.length;

  const [selected, setSelected] = useState<Project | null>(null);
  const [showUnmapped, setShowUnmapped] = useState(false);
  const cardAnim = useRef(new Animated.Value(240)).current;

  const openCard = useCallback((project: Project) => {
    setSelected(project);
    Animated.spring(cardAnim, { toValue: 0, useNativeDriver: true, tension: 70, friction: 12 }).start();
  }, [cardAnim]);

  const closeCard = useCallback(() => {
    Animated.timing(cardAnim, { toValue: 240, duration: 200, useNativeDriver: true }).start(() =>
      setSelected(null),
    );
  }, [cardAnim]);

  const initialRegion = useMemo(() => {
    if (mappedProjects.length === 0) {
      return { latitude: 41.7151, longitude: 44.8271, latitudeDelta: 0.12, longitudeDelta: 0.12 };
    }
    const lats = mappedProjects.map(p => p.latitude!);
    const lngs = mappedProjects.map(p => p.longitude!);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const pad = 0.06;
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.03, maxLat - minLat + pad * 2),
      longitudeDelta: Math.max(0.03, maxLng - minLng + pad * 2),
    };
  }, [mappedProjects]);

  return (
    <View style={{ flex: 1 }}>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        onPress={closeCard}
      >
        {mappedProjects.map(project => {
          const color = pinColor(project, stats, overdueByProject);
          return (
            <Marker
              key={project.id}
              coordinate={{ latitude: project.latitude!, longitude: project.longitude! }}
              onPress={() => openCard(project)}
              tracksViewChanges={false}
            >
              <View style={{ alignItems: 'center' }}>
                <View
                  style={{
                    backgroundColor: color,
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
                  }}
                >
                  <Ionicons name="business" size={15} color="#fff" />
                </View>
                {/* Pin tail */}
                <View
                  style={{
                    width: 0,
                    height: 0,
                    borderLeftWidth: 5,
                    borderRightWidth: 5,
                    borderTopWidth: 7,
                    borderLeftColor: 'transparent',
                    borderRightColor: 'transparent',
                    borderTopColor: color,
                    marginTop: -1,
                  }}
                />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* No-location pill */}
      {unmappedCount > 0 && (
        <Pressable
          onPress={() => setShowUnmapped(true)}
          hitSlop={8}
          style={{
            position: 'absolute',
            bottom: insets.bottom + 100,
            alignSelf: 'center',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: 'rgba(0,0,0,0.68)',
            borderRadius: 999,
            paddingHorizontal: 14,
            paddingVertical: 8,
          }}
        >
          <Ionicons name="location-outline" size={14} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
            {unmappedCount} პროექტს ლოკაცია არ აქვს
          </Text>
        </Pressable>
      )}

      {/* Sliding project card */}
      {selected && (
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            transform: [{ translateY: cardAnim }],
          }}
        >
          <ProjectMapCard
            project={selected}
            stats={stats[selected.id]}
            overdue={overdueByProject[selected.id] ?? 0}
            onOpen={() => {
              onProjectOpen(selected.id);
              closeCard();
            }}
            onClose={closeCard}
            bottomInset={insets.bottom}
          />
        </Animated.View>
      )}

      {/* Unmapped projects sheet */}
      <UnmappedSheet
        visible={showUnmapped}
        projects={projects.filter(p => p.latitude == null || p.longitude == null)}
        onClose={() => setShowUnmapped(false)}
        onOpen={id => {
          setShowUnmapped(false);
          onProjectOpen(id);
        }}
      />
    </View>
  );
}

function ProjectMapCard({
  project,
  stats,
  overdue = 0,
  onOpen,
  onClose,
  bottomInset,
}: {
  project: Project;
  stats?: { drafts: number; completed: number };
  overdue?: number;
  onOpen: () => void;
  onClose: () => void;
  bottomInset: number;
}) {
  const { theme } = useTheme();
  const city = extractCity(project.address);
  const subLine = city || null;
  const status = projectStatusLine(stats, overdue, theme);

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: bottomInset + 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 12,
      }}
    >
      {/* Drag handle */}
      <Pressable onPress={onClose} hitSlop={12} style={{ alignItems: 'center', paddingBottom: 10 }}>
        <View
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: theme.colors.hairline,
          }}
        />
      </Pressable>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <ProjectAvatar project={project} size={44} />
        <View style={{ flex: 1 }}>
          <A11yText size="base" weight="bold" numberOfLines={1}>
            {project.company_name || project.name}
          </A11yText>
          {subLine ? (
            <A11yText
              size="xs"
              color={theme.colors.inkSoft}
              numberOfLines={1}
              style={{ marginTop: 2 }}
            >
              {subLine}
            </A11yText>
          ) : null}
          <Text style={{ fontSize: 12, color: status.color, marginTop: 4 }}>{status.text}</Text>
        </View>
        <Pressable
          onPress={onOpen}
          hitSlop={8}
          style={{
            backgroundColor: theme.colors.accent,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 9,
          }}
          {...a11y('გახსნა', 'პროექტის გახსნა', 'button')}
        >
          <A11yText size="sm" weight="semibold" color="#fff">
            გახსნა →
          </A11yText>
        </Pressable>
      </View>
    </View>
  );
}

function UnmappedSheet({
  visible,
  projects,
  onClose,
  onOpen,
}: {
  visible: boolean;
  projects: Project[];
  onClose: () => void;
  onOpen: (id: string) => void;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.colors.overlay }]}
          onPress={onClose}
        />
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingBottom: insets.bottom + 16,
            maxHeight: '70%',
          }}
        >
          {/* Handle */}
          <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: theme.colors.hairline,
              }}
            />
          </View>
          <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
            <A11yText size="lg" weight="bold">
              ლოკაციის გარეშე
            </A11yText>
            <A11yText size="sm" color={theme.colors.inkSoft} style={{ marginTop: 2 }}>
              ამ პროექტებს კოორდინატები არ აქვთ
            </A11yText>
          </View>
          <FlatList
            data={projects}
            keyExtractor={p => p.id}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onOpen(item.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  backgroundColor: theme.colors.card,
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <ProjectAvatar project={item} size={36} />
                <View style={{ flex: 1 }}>
                  <A11yText size="base" weight="semibold" numberOfLines={1}>
                    {item.company_name || item.name}
                  </A11yText>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
              </Pressable>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

function getstyles(theme: any) {
  return StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  title: { fontSize: 28, fontWeight: '800', fontFamily: theme.typography.fontFamily.display, color: theme.colors.ink },
  subtitle: { fontSize: 11, color: theme.colors.inkSoft },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accentSoft,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.ink },
  rowMeta: { fontSize: 12, color: theme.colors.inkSoft, marginTop: 2 },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 16,
  },
  swipeDelete: {
    width: 96,
    backgroundColor: theme.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginLeft: 8,
    borderRadius: theme.radius.lg,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '400',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: theme.colors.subtleSurface,
    borderRadius: 8,
    padding: 3,
  },
  toggleBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnActive: {
    backgroundColor: theme.colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
});
}


