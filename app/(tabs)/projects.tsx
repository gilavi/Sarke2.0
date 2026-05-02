import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
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
import { projectsApi } from '../../lib/services';
import { useToast } from '../../lib/toast';
import { useTheme } from '../../lib/theme';
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
  const openSwipeRefs = useRef(new Map<string, { close: () => void }>());

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
  // Spinner only shows when there's no cached data at all. Cached + revalidating
  // counts as "ready" so tab-switching back never re-shows the skeletons.
  const loading = projectsQ.isPending && !projectsQ.data;

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
      cardRef={index === 0 ? firstCardRef : undefined}
      onOpen={() => router.push(`/projects/${item.id}` as any)}
      onDelete={() => onDelete(item)}
      registerSwipeable={(ref) => {
        if (ref) openSwipeRefs.current.set(item.id, ref);
        else openSwipeRefs.current.delete(item.id);
      }}
      onSwipeOpen={() => {
        openSwipeRefs.current.forEach((ref, id) => {
          if (id !== item.id) ref.close();
        });
      }}
    />
  ), [stats, firstCardRef, router, onDelete, openSwipeRefs]);

  return (
    <TourGuide tourId="homepage_v1" steps={tourSteps}>
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('projects.title')}</Text>
      </View>
      <View ref={listRef} collapsable={false} style={{ flex: 1 }}>
      <FlatList
        data={projects}
        keyExtractor={p => p.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 10 }}
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
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState<LatLng | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setName('');
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
    if (!name.trim()) return;
    setBusy(true);
    try {
      const p = await projectsApi.create({
        name: name.trim(),
        companyName: company.trim() || null,
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
      <View style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={0} style={{ flex: 1, justifyContent: 'flex-end' }}>
          {/* Backdrop */}
          <Pressable
            style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.colors.overlay }]}
            onPress={() => mapVisible ? setMapVisible(false) : onClose()}
            {...a11y(t('common.close'), 'შეეხეთ ფონის დასახურად', 'button')}
          />
          {/* Card — sits at raised floor, right above keyboard */}
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
                    disabled={!name.trim()}
                  />
                }
              >
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <ProjectAvatar
                    project={{ name: name || '—', logo }}
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
                  label={t('common.name')}
                  required
                  value={name}
                  onChangeText={setName}
                  autoFocus
                />

                <FloatingLabelInput
                  label={t('common.company')}
                  value={company}
                  onChangeText={setCompany}
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
        </KeyboardAvoidingView>

        {/* Full-screen map overlay — no nested Modal */}
        {mapVisible && (
          <View style={StyleSheet.absoluteFillObject}>
            <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
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

const ProjectRow = memo(function ProjectRow({
  project,
  stats,
  onOpen,
  onDelete,
  registerSwipeable,
  onSwipeOpen,
  cardRef,
}: {
  project: Project;
  stats?: { drafts: number; completed: number };
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
  const renderRightActions = () => (
    <Pressable onPress={onDelete} style={styles.swipeDelete}>
      <Ionicons name="trash" size={20} color={theme.colors.white} />
      <A11yText size="xs" weight="semibold" color={theme.colors.white}>{t('common.delete')}</A11yText>
    </Pressable>
  );

  return (
    <View ref={cardRef} collapsable={false}>
    <Swipeable
      ref={swipeRef as any}
      onSwipeableOpen={() => registerSwipeable?.(swipeRef.current)}
      renderRightActions={renderRightActions}
      overshootRight={false}
      onSwipeableWillOpen={onSwipeOpen}
    >
      <PressableScale
        onPress={onOpen}
        hapticOnPress="navigate"
        scaleTo={0.98}
      >
        <Card padding={14}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <ProjectAvatar project={project} size={44} />
            <View style={{ flex: 1 }}>
              <A11yText size="base" weight="bold" numberOfLines={1}>
                {project.name}
              </A11yText>
              {project.company_name ? (
                <A11yText size="xs" color={theme.colors.inkSoft} style={{ marginTop: 2 }} numberOfLines={1}>
                  {project.company_name}
                  {project.address ? ` · ${project.address}` : ''}
                </A11yText>
              ) : project.address ? (
                <A11yText size="xs" color={theme.colors.inkSoft} style={{ marginTop: 2 }} numberOfLines={1}>
                  {project.address}
                </A11yText>
              ) : null}
              {stats && (stats.drafts > 0 || stats.completed > 0) ? (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                  {stats.drafts > 0 ? (() => {
                    const urgent = stats.drafts >= 3;
                    const elevated = stats.drafts === 2;
                    return (
                      <View style={[
                        styles.counter,
                        urgent
                          ? { backgroundColor: theme.colors.warn }
                          : elevated
                          ? { backgroundColor: theme.colors.warnSoft, borderWidth: 1, borderColor: theme.colors.warn }
                          : { backgroundColor: theme.colors.warnSoft },
                      ]}>
                        <Ionicons
                          name="document-text-outline"
                          size={11}
                          color={urgent ? theme.colors.white : theme.colors.warn}
                        />
                        <A11yText size="xs" weight="bold" color={urgent ? theme.colors.white : theme.colors.warn}>
                          {stats.drafts} {t('common.draft')}
                        </A11yText>
                      </View>
                    );
                  })() : null}
                  {stats.completed > 0 ? (
                    <View style={[styles.counter, { backgroundColor: theme.colors.accentSoft }]}>
                      <Ionicons name="checkmark" size={11} color={theme.colors.accent} />
                      <A11yText size="xs" weight="bold" color={theme.colors.accent}>
                        {stats.completed} {t('common.completed').toLowerCase()}
                      </A11yText>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.inkFaint} />
          </View>
        </Card>
      </PressableScale>
    </Swipeable>
    </View>
  );
});

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
});
}


