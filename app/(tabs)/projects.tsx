import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { projectAvatar } from '../../lib/projectAvatar';
import { Button, Card, Field, Input } from '../../components/ui';
import { PressableScale } from '../../components/animations/PressableScale';
import { a11y } from '../../lib/accessibility';
import EmptyState from '../../components/EmptyState';
import { Skeleton } from '../../components/Skeleton';
import { MapPicker, type LatLng } from '../../components/MapPicker';
import { projectsApi } from '../../lib/services';
import { useToast } from '../../lib/toast';
import { theme } from '../../lib/theme';
import { logError, toErrorMessage } from '../../lib/logError';
import { friendlyError } from '../../lib/errorMap';
import type { Project } from '../../types/models';
import { TourGuide, type TourStep } from '../../components/TourGuide';

type Stats = Record<string, { drafts: number; completed: number }>;

export default function ProjectsScreen() {
  const router = useRouter();
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
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

  const filtered = useMemo(() => {
    if (!query.trim()) return projects;
    const q = query.toLowerCase();
    return projects.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        (p.company_name ?? '').toLowerCase().includes(q) ||
        (p.address ?? '').toLowerCase().includes(q),
    );
  }, [projects, query]);

  const onDelete = (project: Project) => {
    Alert.alert(
      'წაშლა?',
      `"${project.name}" — ეს მოცილდება ყველა კითხვარსაც. გსურს გაგრძელება?`,
      [
        { text: 'გაუქმება', style: 'cancel' },
        {
          text: 'წაშლა',
          style: 'destructive',
          onPress: async () => {
            try {
              await projectsApi.remove(project.id);
              setProjects(prev => prev.filter(p => p.id !== project.id));
              toast.success('წაიშალა');
            } catch (e) {
              toast.error(friendlyError(e, 'ვერ წაიშალა'));
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

  return (
    <TourGuide tourId="homepage_v1" steps={tourSteps}>
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>პროექტები</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={styles.subtitle}>
            {projects.length > 0 ? `სულ ${projects.length}` : ''}
          </Text>
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
      {projects.length > 0 ? (
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={theme.colors.inkSoft} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="ძებნა..."
            placeholderTextColor={theme.colors.inkFaint}
            style={styles.searchInput}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8} {...a11y('ძებნის გასუფთავება', 'შეეხეთ ძებნის ველის გასასუფთავებლად', 'button')}>
              <Ionicons name="close-circle" size={18} color={theme.colors.inkFaint} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View ref={listRef} collapsable={false} style={{ flex: 1 }}>
      <FlatList
        data={filtered}
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
          ) : query ? (
            <EmptyState
              type="projects"
              title="ვერაფერი მოიძებნა"
              subtitle="სცადეთ სხვა საძიებო სიტყვა."
              compact
            />
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
  const toast = useToast();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [address, setAddress] = useState('');
  const [pin, setPin] = useState<LatLng | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setName('');
      setCompany('');
      setAddress('');
      setPin(null);
      setBusy(false);
    }
  }, [visible]);

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
      });
      onCreated(p);
    } catch (e) {
      toast.error(friendlyError(e, 'ვერ შეიქმნა'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={sheetStyles.backdrop} onPress={onClose} {...a11y('დახურვა', 'შეეხეთ ფონის დასახურად', 'button')}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%' }}
        >
          {/* Stop touches inside the card from closing the sheet */}
          <Pressable style={sheetStyles.card} onPress={() => {}}>
            <View style={sheetStyles.handle} />
            <View style={sheetStyles.sheetHeader}>
              <Text style={[sheetStyles.sheetTitle, { flex: 1 }]}>ახალი პროექტი</Text>
              <Pressable onPress={onClose} hitSlop={10} {...a11y('დახურვა', 'შეეხეთ ფანჯრის დასახურად', 'button')}>
                <Ionicons name="close" size={22} color={theme.colors.inkSoft} />
              </Pressable>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingTop: 4, paddingBottom: 8 }}
              style={{ maxHeight: '78%' }}
            >
              <Field label="სახელი">
                <Input
                  value={name}
                  onChangeText={setName}
                  placeholder="მაგ. ვაკე-საბურთალოს ობიექტი"
                  autoFocus
                />
              </Field>
              <Field label="კომპანია">
                <Input value={company} onChangeText={setCompany} placeholder="შემკვეთი" />
              </Field>
              <Field label="მისამართი">
                <MapPicker
                  value={pin}
                  onChange={setPin}
                  address={address}
                  onAddressChange={setAddress}
                />
              </Field>
            </ScrollView>
            <Button
              title="შექმნა"
              onPress={save}
              loading={busy}
              disabled={!name.trim()}
              style={{ marginTop: 16 }}
            />
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

function ProjectRowSkeleton() {
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
  const swipeRef = useRef<any>(null);
  const renderRightActions = () => (
    <Pressable onPress={onDelete} style={styles.swipeDelete} {...a11y('წაშლა', 'შეეხეთ პროექტის წასაშლელად', 'button')}>
      <Ionicons name="trash" size={20} color={theme.colors.white} />
      <Text style={{ color: theme.colors.white, fontWeight: '600', fontSize: 12 }}>წაშლა</Text>
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
            <View style={[styles.iconBox, { backgroundColor: projectAvatar(project.id).color + '22' }]}>
              <Text style={{ fontSize: 22 }}>{projectAvatar(project.id).emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {project.name}
              </Text>
              {project.company_name ? (
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {project.company_name}
                  {project.address ? ` · ${project.address}` : ''}
                </Text>
              ) : project.address ? (
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {project.address}
                </Text>
              ) : null}
              {stats && (stats.drafts > 0 || stats.completed > 0) ? (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                  {stats.drafts > 0 ? (
                    <View style={[styles.counter, { backgroundColor: theme.colors.warnSoft }]}>
                      <Ionicons name="document-text-outline" size={11} color={theme.colors.warn} />
                      <Text style={{ color: theme.colors.warn, fontSize: 11, fontWeight: '700' }}>
                        {stats.drafts} დრაფტი
                      </Text>
                    </View>
                  ) : null}
                  {stats.completed > 0 ? (
                    <View style={[styles.counter, { backgroundColor: theme.colors.accentSoft }]}>
                      <Ionicons name="checkmark" size={11} color={theme.colors.accent} />
                      <Text style={{ color: theme.colors.accent, fontSize: 11, fontWeight: '700' }}>
                        {stats.completed} დასრულდა
                      </Text>
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

const styles = StyleSheet.create({
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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.card,
    marginHorizontal: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
  },
  searchInput: { flex: 1, color: theme.colors.ink, fontSize: 15, padding: 0 },
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

const sheetStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
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
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.ink,
  },
});
