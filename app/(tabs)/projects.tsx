import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '../../lib/apiHooks';
import {
  Animated,
  Dimensions,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { RefreshControl } from '../../components/primitives';
import { useSheetKeyboardMargin } from '../../lib/useSheetKeyboardMargin';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { ProjectAvatar } from '../../components/ProjectAvatar';
import { ProjectCard } from '../../components/home/ProjectCard';
import { pickProjectLogo } from '../../lib/projectLogo';
import { Button } from '../../components/ui';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import { GeocodingAddressInput } from '../../components/inputs/GeocodingAddressInput';
import { HeaderCloseButton } from '../../components/HeaderCloseButton';
import { useSubmitGuard } from '../../hooks/useSubmitGuard';
import { FabButton } from '../../components/primitives';
import { A11yText, A11yText as Text } from '../../components/primitives/A11yText';
import { SheetLayout } from '../../components/SheetLayout';
import { a11y } from '../../lib/accessibility';
import EmptyState from '../../components/EmptyState';
import { Skeleton } from '../../components/Skeleton';
import { MapPicker, type LatLng } from '../../components/MapPicker';
import { projectsApi } from '../../lib/services';
import { useToast } from '../../lib/toast';
import { useTheme } from '../../lib/theme';
import { useBottomSheet } from '../../components/BottomSheet';
import { friendlyError } from '../../lib/errorMap';
import { haptic } from '../../lib/haptics';
import type { Project } from '../../types/models';
import { TourGuide, type TourStep } from '../../components/TourGuide';
import { useTranslation } from 'react-i18next';

export default function ProjectsScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const router = useRouter();
  const toast = useToast();
  const showActionSheet = useBottomSheet();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const cardWidth = screenW - 40; // full-bleed map cards: 20 gutter each side
  const openSwipeRefs = useRef(new Map<string, { close: () => void }>());

  // Tour refs
  const listRef = useRef<View>(null);
  const firstCardRef = useRef<View>(null);
  const fabRef = useRef<View>(null);

  // Projects flow through React Query: 5-min staleTime means tab-switching is
  // instant, and the AsyncStorage persister keeps the cache warm across launches.
  const projectsQ = useQuery<Project[]>({
    queryKey: qk.projects.list,
    queryFn: () => projectsApi.list(),
    staleTime: 5 * 60 * 1000,
  });

  const projects = projectsQ.data ?? [];
  // Skeleton both on first fetch AND while a background refetch replaces a stale
  // empty result (canonical three-state guard).
  const loading =
    (projectsQ.isFetching || !projectsQ.isFetched) && projects.length === 0;

  const onDelete = useCallback((project: Project) => {
    showActionSheet(
      {
        title: t('common.areYouSure'),
        options: [t('projects.deleteConfirmYes'), t('common.cancel')],
        cancelButtonIndex: 1,
        destructiveButtonIndex: 0,
      },
      async idx => {
        if (idx !== 0) return;
        try {
          await projectsApi.remove(project.id);
          qc.setQueryData<Project[]>(
            qk.projects.list,
            prev => prev?.filter(p => p.id !== project.id) ?? [],
          );
          qc.invalidateQueries({ queryKey: qk.projects.stats });
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
    <Swipeable
      ref={((ref: { close: () => void } | null) => {
        if (ref) openSwipeRefs.current.set(item.id, ref);
        else openSwipeRefs.current.delete(item.id);
      }) as never}
      renderRightActions={() => (
        <Pressable onPress={() => onDelete(item)} style={styles.swipeDelete} {...a11y(t('common.delete'), undefined, 'button')}>
          <Trash2 size={20} color={theme.colors.white} strokeWidth={2} />
          <A11yText size="xs" weight="semibold" color={theme.colors.white}>{t('common.delete')}</A11yText>
        </Pressable>
      )}
      overshootRight={false}
      onSwipeableWillOpen={() => {
        openSwipeRefs.current.forEach((ref, id) => { if (id !== item.id) ref.close(); });
      }}
    >
      <View ref={index === 0 ? firstCardRef : undefined} collapsable={false}>
        <ProjectCard
          project={item}
          width={cardWidth}
          onPress={() => router.push(`/projects/${item.id}` as any)}
        />
      </View>
    </Swipeable>
  ), [onDelete, theme, t, cardWidth, router, styles]);

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
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120, gap: 14 }}
          renderItem={renderItem}
          initialNumToRender={6}
          windowSize={7}
          removeClippedSubviews
          refreshControl={<RefreshControl queries={[projectsQ]} />}
          ListEmptyComponent={
            loading ? (
              <View style={{ gap: 14 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <ProjectCardSkeleton key={`skeleton-${i}`} width={cardWidth} />
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
        a11yLabel={t('projects.fabA11yLabel')}
        a11yHint={t('projects.fabA11yHint')}
        style={{ bottom: insets.bottom + 56 + 16 }}
      />

      <CreateProjectSheet
        visible={creating}
        onClose={() => setCreating(false)}
        onCreated={p => {
          qc.setQueryData<Project[]>(
            qk.projects.list,
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

/** Full-width map-card skeleton, matching ProjectCard's height. */
function ProjectCardSkeleton({ width }: { width: number }) {
  return <Skeleton width={width} height={155} radius={16} />;
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
  // Enabled create button + on-press field error (see useSubmitGuard).
  const { attempted, guard } = useSubmitGuard();
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
          {...a11y(t('common.close'), t('projects.closeBackdrop'), 'button')}
        />
        {/* Card - marginBottom rides the iOS keyboard so the card stops exactly at the keyboard top */}
        <Animated.View style={{ width: '100%', marginBottom: keyboardMargin }}>
          <Pressable onPress={() => {}} style={{ width: '100%' }}>
              <SheetLayout
                insideBottomSheet
                maxHeightRatio={0.92}
                header={{ title: t('home.newProjectFormTitle'), onClose }}
                footer={
                  <Button
                    title={t('projects.createButton')}
                    size="lg"
                    onPress={() => guard(!!company.trim(), save)}
                    loading={busy}
                  />
                }
              >
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <ProjectAvatar
                    project={{ name: company || '-', logo }}
                    size={88}
                    editable
                    onEdit={onPickLogo}
                  />
                  {logo ? (
                    <Pressable onPress={onPickLogo} hitSlop={13} {...a11y(t('projects.changePhoto'), t('projects.changePhotoHint'), 'button')}>
                      <A11yText size="sm" weight="medium" color={theme.colors.ink}>
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
                  error={attempted && !company.trim() ? t('errors.requiredField') : undefined}
                  autoFocus
                />

                <GeocodingAddressInput
                  label={t('common.address')}
                  value={address}
                  onChangeText={setAddress}
                  onPin={setPin}
                  rightIcon={MapPin}
                  onRightIconPress={() => { Keyboard.dismiss(); setMapVisible(true); }}
                />

                <FloatingLabelInput
                  label={t('projects.contactPhone')}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </SheetLayout>
          </Pressable>
        </Animated.View>

        {/* Full-screen map overlay - no nested Modal */}
        {mapVisible && (
          <View style={StyleSheet.absoluteFillObject}>
            <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: insets.top + 12, paddingVertical: 12 }}>
                <View style={{ width: 38 }} />
                <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: theme.colors.ink }}>
                  {t('projects.chooseLocation')}
                </Text>
                <HeaderCloseButton onPress={() => setMapVisible(false)} />
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
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState<LatLng | null>(initialPin);
  const [address, setAddress] = useState(initialAddress);
  // Enabled confirm + on-press error when no pin is dropped.
  const [attempted, setAttempted] = useState(false);
  const screenH = Dimensions.get('window').height;
  // Reserve space for header (~60) + bottom action bar (~160) + safe areas
  const mapHeight = Math.max(240, screenH - insets.top - insets.bottom - 220);

  useEffect(() => {
    setPin(initialPin);
    setAddress(initialAddress);
  }, [initialPin, initialAddress]);

  const handleConfirm = () => {
    if (!pin) {
      setAttempted(true);
      haptic.validationError();
      return;
    }
    onConfirm(pin, address);
  };

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
        {attempted && !pin ? (
          <Text style={{ color: theme.colors.danger, fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
            {t('projects.mapPickError')}
          </Text>
        ) : null}
        <Button
          title={t('common.confirm')}
          size="lg"
          onPress={handleConfirm}
        />
        <Pressable onPress={onCancel} style={{ alignSelf: 'center', paddingVertical: 8 }} hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: theme.colors.inkSoft }}>
            {t('common.cancel')}
          </Text>
        </Pressable>
      </View>
    </View>
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
