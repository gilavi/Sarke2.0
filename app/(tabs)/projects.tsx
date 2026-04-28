import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
import { projectsApi } from '../../lib/services';
import { useToast } from '../../lib/toast';
import { useTheme } from '../../lib/theme';
import { logError, toErrorMessage } from '../../lib/logError';
import { friendlyError } from '../../lib/errorMap';
import { haptic } from '../../lib/haptics';
import type { Project } from '../../types/models';
import { TourGuide, type TourStep } from '../../components/TourGuide';
import { useTranslation } from 'react-i18next';

type Stats = Record<string, { drafts: number; completed: number }>;

export default function ProjectsScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const sheetStyles = useMemo(() => getsheetStyles(theme), [theme]);
  const router = useRouter();
  const toast = useToast();
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

  const onDelete = (project: Project) => {
    Alert.alert(
      t('inspections.deleteTitle'),
      t('projects.deleteConfirm', { name: `"${project.name}"` }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await projectsApi.remove(project.id);
              setProjects(prev => prev.filter(p => p.id !== project.id));
              toast.success(t('notifications.deleted'));
            } catch (e) {
              toast.error(friendlyError(e, t('errors.deleteFailed')));
            }
          },
        },
      ],
    );
  };

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
        renderItem={({ item, index }) => (
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
        )}
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

      <Pressable
        ref={fabRef}
        onPress={() => setCreating(true)}
        style={[styles.fab, theme.shadow.button]}
      >
        <Ionicons name="add" size={28} color={theme.colors.white} />
      </Pressable>

      <CreateProjectSheet
        visible={creating}
        onClose={() => setCreating(false)}
        onCreated={p => {
          setProjects(prev => [p, ...prev.filter(x => x.id !== p.id)]);
          setCreating(false);
          toast.success(t('notifications.projectCreated'));
        }}
      />
    </SafeAreaView>
    </TourGuide>
  );
}

/**
 * Bottom-sheet form for creating a new project — mirrors the sheet pattern
 * used by ProjectPickerSheet in app/(tabs)/home.tsx (backdrop tap-to-close,
 * inner Pressable stops propagation, rounded handle, slide animation).
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
  const sheetStyles = useMemo(() => getsheetStyles(theme), [theme]);
  const toast = useToast();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [address, setAddress] = useState('');
  const [pin, setPin] = useState<LatLng | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setName('');
      setCompany('');
      setAddress('');
      setPin(null);
      setLogo(null);
      setBusy(false);
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
      toast.error(friendlyError(e, t('errors.createFailed')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={sheetStyles.backdrop} onPress={onClose}>
        {/* Stop touches inside the card from closing the sheet */}
        <Pressable style={sheetStyles.card} onPress={() => {}}>
          <View style={sheetStyles.handle} />
          <SheetLayout
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
                <Pressable onPress={onPickLogo} hitSlop={6}>
                  <A11yText size="sm" weight="semibold" color={theme.colors.accent}>
                    {t('projects.changePhoto')}
                  </A11yText>
                </Pressable>
              ) : null}
            </View>
            <FormField label={t('common.name')} required>
              <Input
                value={name}
                onChangeText={setName}
                placeholder={t('projects.projectNamePlaceholder')}
                autoFocus
              />
            </FormField>
            <FormField label={t('common.company')}>
              <Input value={company} onChangeText={setCompany} placeholder={t('projects.clientPlaceholder')} />
            </FormField>
            <FormField label={t('common.address')}>
              <MapPicker
                value={pin}
                onChange={setPin}
                address={address}
                onAddressChange={setAddress}
              />
            </FormField>
          </SheetLayout>
        </Pressable>
      </Pressable>
    </Modal>
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

function ProjectRow({
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
                  {stats.drafts > 0 ? (
                    <View style={[styles.counter, { backgroundColor: theme.colors.warnSoft }]}>
                      <Ionicons name="document-text-outline" size={11} color={theme.colors.warn} />
                      <A11yText size="xs" weight="bold" color={theme.colors.warn}>
                        {stats.drafts} {t('common.draft')}
                      </A11yText>
                    </View>
                  ) : null}
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

function getsheetStyles(theme: any) {
  return StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 10,
    paddingBottom: 24,
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
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.ink,
  },
});
}
