import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FlatList } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { ProjectAvatar } from '../../components/ProjectAvatar';
import { pickProjectLogo } from '../../lib/projectLogo';
import { Button, Card, Input } from '../../components/ui';
import { A11yText, A11yText as Text } from '../../components/primitives/A11yText';
import { FormField } from '../../components/FormField';
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
import { logError, toErrorMessage } from '../../lib/logError';
import { friendlyError } from '../../lib/errorMap';
import { haptic } from '../../lib/haptics';
import type { Project } from '../../types/models';
import { TourGuide, type TourStep } from '../../components/TourGuide';

type Stats = Record<string, { drafts: number; completed: number }>;

export default function ProjectsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const router = useRouter();
  const toast = useToast();
  const showActionSheet = useBottomSheet();
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const openSwipeRefs = useRef(new Map<string, { close: () => void }>());

  // Tour refs
  const listRef = useRef<View>(null);
  const firstCardRef = useRef<View>(null);
  const fabRef = useRef<View>(null);
  const avatarRef = useRef<View>(null);

  const load = useCallback(async () => {
    try {
      const [ps, s] = await Promise.all([
        projectsApi.list(),
        projectsApi.stats().catch((e) => { logError(e, 'projects.stats'); return {} as Stats; }),
      ]);
      setProjects(ps);
      setStats(s);
    } catch (e) {
      logError(e, 'projects.load');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

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
          setProjects(prev => prev.filter(p => p.id !== project.id));
          toast.success('წაიშალა');
        } catch (e) {
          toast.error(friendlyError(e, 'ვერ წაიშალა'));
        }
      },
    );
  }, [toast, showActionSheet]);

  const tourSteps: TourStep[] = useMemo(() => {
    const steps: TourStep[] = [
      {
        targetRef: listRef,
        title: 'შენი პროექტები',
        body: 'აქ ჩანს ყველა შენი მიმდინარე პროექტი',
        position: 'bottom',
      },
    ];
    if (projects.length > 0) {
      steps.push({
        targetRef: firstCardRef,
        title: 'პროექტი',
        body: 'შეეხე პროექტს დეტალების სანახავად',
        position: 'bottom',
      });
    }
    steps.push(
      {
        targetRef: fabRef,
        title: 'ახალი პროექტი',
        body: 'დაამატე სამშენებლო ობიექტი შემოწმების დასაწყებად',
        position: 'top',
      },
      {
        targetRef: avatarRef,
        title: 'შენი პროფილი',
        body: 'აქ არის შენი ხელმოწერა და პარამეტრები',
        position: 'bottom',
      },
    );
    return steps;
  }, [projects.length]);

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
        <Text style={styles.title}>პროექტები</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            ref={avatarRef}
            onPress={() => router.push('/(tabs)/more' as any)}
            style={styles.avatarBtn}
            {...a11y('პროფილი', 'შეეხეთ პროფილისა და პარამეტრების სანახავად', 'button')}
          >
            <Ionicons name="person" size={18} color={theme.colors.accent} />
          </Pressable>
        </View>
      </View>
      <View ref={listRef} collapsable={false} style={{ flex: 1 }}>
      <FlatList
        data={projects}
        keyExtractor={p => p.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 10 }}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              haptic.medium();
              setRefreshing(true);
              await load();
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
              title="ჯერ პროექტი არ არის"
              subtitle="შექმენით პირველი პროექტი და დაიწყეთ ინსპექციები"
              action={{
                label: '+ ახალი პროექტი',
                onPress: () => setCreating(true),
              }}
              backgroundPattern
            />
          )
        }
      />
      </View>

      <Pressable
        ref={fabRef}
        onPress={() => setCreating(true)}
        style={[styles.fab, theme.shadow.button]}
        {...a11y('ახალი პროექტი', 'შეეხეთ ახალი პროექტის შესაქმნელად', 'button')}
      >
        <Ionicons name="add" size={28} color={theme.colors.white} />
      </Pressable>

      <CreateProjectSheet
        visible={creating}
        onClose={() => setCreating(false)}
        onCreated={p => {
          setProjects(prev => [p, ...prev.filter(x => x.id !== p.id)]);
          setCreating(false);
          toast.success('პროექტი შეიქმნა');
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
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [address, setAddress] = useState('');
  const [pin, setPin] = useState<LatLng | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);

  useEffect(() => {
    if (visible) {
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
      });
      onCreated(p);
    } catch (e) {
      toast.error(friendlyError(e, 'ვერ შეიქმნა'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => mapVisible ? setMapVisible(false) : onClose()}>
      <View style={{ flex: 1 }}>
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.45)',
            justifyContent: 'flex-end',
          }}
          onPress={() => mapVisible ? setMapVisible(false) : onClose()}
          {...a11y('დახურვა', 'შეეხეთ ფონის დასახურად', 'button')}
        >
          {/* Stop touches inside the card from closing the sheet */}
          <Pressable onPress={() => {}} style={{ width: '100%' }}>
            <SheetLayout
              header={{ title: 'ახალი პროექტი', onClose }}
              footer={
                <Button
                  title="შექმნა"
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
                  <Pressable onPress={onPickLogo} hitSlop={6} {...a11y('სურათის შეცვლა', 'შეეხეთ ლოგოს ასარჩევად', 'button')}>
                    <A11yText size="sm" weight="semibold" color={theme.colors.accent}>
                      სურათის შეცვლა
                    </A11yText>
                  </Pressable>
                ) : null}
              </View>

              <FormField label="სახელი" required>
                <Input
                  value={name}
                  onChangeText={setName}
                  placeholder="მაგ. ვაკე-საბურთალოს ობიექტი"
                  autoFocus
                />
              </FormField>

              <FormField label="კომპანია">
                <Input value={company} onChangeText={setCompany} placeholder="შემკვეთი" />
              </FormField>

              <FormField label="მისამართი">
                <Input
                  value={address}
                  onChangeText={setAddress}
                  placeholder="ქუჩა, ნომერი, ქალაქი"
                />
              </FormField>

              <FormField label="მდებარეობა">
                <LocationRow pin={pin} address={address} onPress={() => { Keyboard.dismiss(); setMapVisible(true); }} />
              </FormField>
            </SheetLayout>
          </Pressable>
        </Pressable>

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
          backgroundColor: '#FFFFFF',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
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
  const styles = useMemo(() => getstyles(theme), [theme]);
  const swipeRef = useRef<any>(null);
  const renderRightActions = () => (
    <Pressable onPress={onDelete} style={styles.swipeDelete} {...a11y('წაშლა', 'შეეხეთ პროექტის წასაშლელად', 'button')}>
      <Ionicons name="trash" size={20} color={theme.colors.white} />
      <A11yText size="xs" weight="semibold" color={theme.colors.white}>წაშლა</A11yText>
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
        {...a11y(
          `პროექტი: ${project.name}${project.address ? ', მისამართი: ' + project.address : ''}. ${stats ? `${stats.completed} დასრულებული, ${stats.drafts} დრაფტი` : ''}`,
          'შეეხეთ პროექტის დეტალების სანახავად',
          'button'
        )}
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
                  {stats.drafts > 0 ? (
                    <View style={[styles.counter, { backgroundColor: theme.colors.warnSoft }]}>
                      <Ionicons name="document-text-outline" size={11} color={theme.colors.warn} />
                      <A11yText size="xs" weight="bold" color={theme.colors.warn}>
                        {stats.drafts} დრაფტი
                      </A11yText>
                    </View>
                  ) : null}
                  {stats.completed > 0 ? (
                    <View style={[styles.counter, { backgroundColor: theme.colors.accentSoft }]}>
                      <Ionicons name="checkmark" size={11} color={theme.colors.accent} />
                      <A11yText size="xs" weight="bold" color={theme.colors.accent}>
                        {stats.completed} დასრულდა
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
  title: { fontSize: 28, fontWeight: '800', color: theme.colors.ink },
  subtitle: { fontSize: 12, color: theme.colors.inkSoft },
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
    borderRadius: 999,
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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
}


