import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../../lib/session';
import { projectAvatar } from '../../lib/projectAvatar';
import {
  qualificationsApi,
  isExpiringSoon,
  projectsApi,
  questionnairesApi,
  templatesApi,
} from '../../lib/services';
// shareStoredPdf import removed — PDF sharing now lives on the inspection
// detail screen (which fetches certificates list) post 0006 decoupling.
import { theme } from '../../lib/theme';
import { Button, Field, Input } from '../../components/ui';
import { Skeleton } from '../../components/Skeleton';
import { MapPicker, type LatLng } from '../../components/MapPicker';
import { useToast } from '../../lib/toast';
import type { Inspection, Project, Qualification, Template } from '../../types/models';

export default function HomeScreen() {
  const { state } = useSession();
  const router = useRouter();
  const [certs, setCerts] = useState<Qualification[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [recent, setRecent] = useState<Inspection[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  // `loaded` flips true after the first fetch finishes (success or not) so
  // we know when to swap skeletons for real content. Pull-to-refresh doesn't
  // re-show skeletons — the RefreshControl spinner already signals that.
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, t, r, p] = await Promise.all([
        qualificationsApi.list().catch(() => []),
        templatesApi.list().catch(() => []),
        questionnairesApi.recent(10).catch(() => []),
        projectsApi.list().catch(() => []),
      ]);
      setCerts(c);
      setTemplates(t);
      setRecent(r);
      setProjects(p);
    } catch {
      // ignore
    } finally {
      setLoaded(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

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
  const greeting = greetingFor(firstName);
  const expiringCount = certs.filter(isExpiringSoon).length;
  const latestDraft = recent.find(q => q.status === 'draft');
  const showCertBanner = certs.length === 0 || expiringCount > 0;
  const tip = tipOfTheDay();

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const templateName = (id: string) => templates.find(t => t.id === id)?.name ?? 'კითხვარი';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />}
      >
        {/* ───────── HERO ───────── */}
        <View style={styles.hero}>
          <Text style={styles.dateLine}>{todayFormatted()}</Text>
          <Text style={styles.greeting}>{greeting}</Text>
        </View>

        {/* ───────── CONTINUE / START ───────── */}
        <View style={styles.sectionWrap}>
          {latestDraft ? (
            <Pressable onPress={() => router.push(`/inspections/${latestDraft.id}/wizard` as any)}>
              <View style={styles.resumeCard}>
                <View style={styles.resumeIcon}>
                  <Ionicons name="pencil" size={16} color={theme.colors.warn} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resumeEyebrow}>გააგრძელე დრაფტი</Text>
                  <Text style={styles.resumeTitle} numberOfLines={1}>
                    {templateName(latestDraft.template_id)}
                  </Text>
                  <Text style={styles.resumeMeta} numberOfLines={1}>
                    {relativeTime(latestDraft.created_at)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.inkFaint} />
              </View>
            </Pressable>
          ) : (
            <Pressable onPress={() => setPickerVisible(true)}>
              <View style={styles.startCard}>
                <View style={styles.startIcon}>
                  <Ionicons name="add" size={26} color={theme.colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.startTitle}>ახალი შემოწმება</Text>
                  <Text style={styles.startSub}>აირჩიე პროექტი და დაიწყე</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.accent} />
              </View>
            </Pressable>
          )}
        </View>

        {/* ───────── CERT BANNER (warn only) ───────── */}
        {showCertBanner ? (
          <Pressable onPress={() => router.push('/certificates' as any)}>
            <View style={styles.certBanner}>
              <View style={styles.bannerIcon}>
                <Ionicons name={certs.length === 0 ? 'cloud-upload-outline' : 'warning'} size={18} color={theme.colors.warn} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>
                  {certs.length === 0 ? 'ატვირთე სერტიფიკატები' : `${expiringCount} სერტიფიკატი იწურება`}
                </Text>
                <Text style={styles.bannerSub}>
                  {certs.length === 0 ? 'PDF ანგარიშს ავტომატურად ერთვის.' : 'შეამოწმე ვადები სანამ არ გააჩერდება.'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.warn} />
            </View>
          </Pressable>
        ) : null}

        {/* ───────── PROJECTS ───────── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>პროექტები</Text>
          <Pressable onPress={() => router.push('/(tabs)/projects' as any)} hitSlop={8}>
            <Text style={styles.sectionLink}>ყველა</Text>
          </Pressable>
        </View>

        {!loaded && projects.length === 0 ? (
          <View style={{ flexDirection: 'row', paddingHorizontal: HPAD, paddingTop: 10, gap: GAP }}>
            {Array.from({ length: 2 }).map((_, i) => (
              <View key={i} style={[styles.projectCard, { width: (screenWidth - HPAD * 2 - GAP) / 2, gap: 10 }]}>
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
          >
            <View style={styles.emptyProjects}>
              <View style={styles.emptyPlusIcon}>
                <Ionicons name="add" size={24} color={theme.colors.accent} />
              </View>
              <Text style={styles.emptyProjectsCta}>ახალი პროექტი</Text>
              <Text style={styles.emptyProjectsText}>შექმენი პირველი</Text>
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
              onPress={() => setPickerVisible(true)}
              style={{ width: Math.round(projectCardWidth * 0.72) }}
            >
              <View style={styles.newProjectCard}>
                <Ionicons name="add-circle-outline" size={28} color={theme.colors.accent} />
                <Text style={styles.newProjectCardText}>ახალი</Text>
              </View>
            </Pressable>
          </ScrollView>
        ) : (
          <View style={{ flexDirection: 'row', paddingHorizontal: HPAD, paddingTop: 10, gap: GAP }}>
            {projects.map(p => (
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
              <Text style={styles.sectionHeader}>ბოლო აქტივობა</Text>
            </View>
            <View style={[styles.recentList, { marginTop: 8 }]}>
              {Array.from({ length: 3 }).map((_, i) => (
                <View
                  key={i}
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
              <Text style={styles.sectionHeader}>ბოლო აქტივობა</Text>
              <Pressable onPress={() => router.push('/history' as any)} hitSlop={8}>
                <Text style={styles.sectionLink}>ყველა</Text>
              </Pressable>
            </View>
            <View style={[styles.recentList, { marginTop: 8 }]}>
              {recent.slice(0, 4).map((q, i) => (
                <Pressable
                  key={q.id}
                  // Draft → resume wizard; completed → inspection detail (its
                  // certificates list lives there).
                  onPress={() =>
                    q.status === 'completed'
                      ? router.push(`/inspections/${q.id}` as any)
                      : router.push(`/inspections/${q.id}/wizard` as any)
                  }
                  style={[styles.recentRow, i > 0 && styles.recentRowBorder]}
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
                    <Text style={styles.recentMeta}>{relativeTime(q.created_at)}</Text>
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
      </ScrollView>

      {/* Animated FAB — rotates + to × when sheet opens, pulses on press */}
      <AnimatedFAB
        open={pickerVisible}
        onPress={() => setPickerVisible(true)}
      />

      <ProjectPickerSheet
        visible={pickerVisible}
        projects={projects}
        templates={templates}
        onClose={() => setPickerVisible(false)}
        onCreated={load}
      />
    </SafeAreaView>
  );
}

// ──────────── PROJECT PICKER SHEET ────────────

// ───────── ANIMATED FAB ─────────

function AnimatedFAB({ open, onPress }: { open: boolean; onPress: () => void }) {
  // Only the icon rotates — the button itself stays stable.
  // Press feedback comes from Pressable's built-in opacity change.
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(spin, {
      toValue: open ? 1 : 0,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [open, spin]);

  const rotation = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <Pressable onPress={onPress} style={styles.fabWrap}>
      {({ pressed }) => (
        <View style={[styles.fab, pressed && { opacity: 0.8 }]}>
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Ionicons name="add" size={28} color={theme.colors.white} />
          </Animated.View>
        </View>
      )}
    </Pressable>
  );
}

// ───────── ANIMATED DARK BACKDROP ─────────

function AnimatedDarkBackdrop({ visible, onPress }: { visible: boolean; onPress: () => void }) {
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: visible ? 1 : 0,
      duration: visible ? 300 : 200,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, fade]);

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFillObject,
        { backgroundColor: 'rgba(0,0,0,0.55)', opacity: fade },
      ]}
    >
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onPress} />
    </Animated.View>
  );
}

// ───────── PROJECT PICKER SHEET ─────────

function ProjectPickerSheet({
  visible,
  projects,
  templates,
  onClose,
  onCreated,
}: {
  visible: boolean;
  projects: Project[];
  templates: Template[];
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
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
  const [busy, setBusy] = useState(false);

  // Reset form + view every time the sheet opens
  useEffect(() => {
    if (visible) {
      setView('list');
      setPickedProjectId(null);
      setName('');
      setCompany('');
      setAddress('');
      setPin(null);
      setBusy(false);
    }
  }, [visible]);

  const systemTemplates = templates.filter(t => t.is_system);

  const pickTemplate = (projectId: string) => {
    if (systemTemplates.length === 0) {
      toast.error('შაბლონი არ არის');
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
    } catch (e: any) {
      toast.error(e?.message ?? 'შექმნა ვერ მოხერხდა');
    }
  };

  const createProject = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await projectsApi.create({
        name: name.trim(),
        companyName: company.trim() || null,
        address: address.trim() || null,
        latitude: pin?.latitude ?? null,
        longitude: pin?.longitude ?? null,
      });
      await onCreated();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? 'შექმნა ვერ მოხერხდა');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose} statusBarTranslucent>
      <View style={pickerStyles.container}>
        {/* Dark overlay backdrop with cross-fade */}
        <AnimatedDarkBackdrop visible={visible} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%' }}
        >
          {/* Stop touches inside the card from closing the sheet */}
          <Pressable style={pickerStyles.card} onPress={() => {}}>
            <View style={pickerStyles.handle} />

            {view === 'list' ? (
              <>
                {/* Sheet header */}
                <View style={pickerStyles.sheetHeader}>
                  <Text style={pickerStyles.sheetTitle}>შემოწმების დაწყება</Text>
                  <Pressable onPress={onClose} hitSlop={10}>
                    <Ionicons name="close" size={22} color={theme.colors.inkSoft} />
                  </Pressable>
                </View>

                {/* Project list */}
                {projects.length === 0 ? (
                  <View style={pickerStyles.emptyState}>
                    <Ionicons name="folder-open-outline" size={36} color={theme.colors.inkFaint} />
                    <Text style={pickerStyles.emptyText}>პროექტი ჯერ არ გაქვს</Text>
                    <Text style={pickerStyles.emptySubText}>დაამატე ქვემოთ</Text>
                  </View>
                ) : (
                  <ScrollView
                    style={{ maxHeight: 320 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    {projects.map(p => {
                      const av = projectAvatar(p.id);
                      return (
                        <Pressable
                          key={p.id}
                          onPress={() => pickTemplate(p.id)}
                          style={pickerStyles.projectRow}
                        >
                          <View style={[pickerStyles.avatarBubble, { backgroundColor: av.color + '22' }]}>
                            <Text style={{ fontSize: 22 }}>{av.emoji}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={pickerStyles.rowName} numberOfLines={1}>{p.name}</Text>
                            {p.company_name ? (
                              <Text style={pickerStyles.rowSub} numberOfLines={1}>{p.company_name}</Text>
                            ) : null}
                          </View>
                          <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}

                {/* Add new project row */}
                <Pressable onPress={() => setView('new')} style={pickerStyles.addNewRow}>
                  <View style={pickerStyles.addNewIcon}>
                    <Ionicons name="add" size={18} color={theme.colors.accent} />
                  </View>
                  <Text style={pickerStyles.addNewText}>ახალი პროექტის დამატება</Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.accent} />
                </Pressable>
              </>
            ) : view === 'template' ? (
              <>
                {/* Template picker header with back button */}
                <View style={pickerStyles.sheetHeader}>
                  <Pressable onPress={() => setView('list')} hitSlop={10} style={{ marginRight: 10 }}>
                    <Ionicons name="arrow-back" size={22} color={theme.colors.accent} />
                  </Pressable>
                  <Text style={[pickerStyles.sheetTitle, { flex: 1 }]}>აირჩიე შაბლონი</Text>
                  <Pressable onPress={onClose} hitSlop={10}>
                    <Ionicons name="close" size={22} color={theme.colors.inkSoft} />
                  </Pressable>
                </View>
                <ScrollView
                  style={{ maxHeight: 360 }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {systemTemplates.map(t => (
                    <Pressable
                      key={t.id}
                      onPress={() => pickedProjectId && void startInspection(pickedProjectId, t.id)}
                      style={pickerStyles.projectRow}
                    >
                      <View style={[pickerStyles.avatarBubble, { backgroundColor: theme.colors.accentSoft }]}>
                        <Ionicons name="document-text" size={22} color={theme.colors.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={pickerStyles.rowName} numberOfLines={2}>{t.name}</Text>
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
                  <Text style={[pickerStyles.sheetTitle, { flex: 1 }]}>ახალი პროექტი</Text>
                  <Pressable onPress={onClose} hitSlop={10}>
                    <Ionicons name="close" size={22} color={theme.colors.inkSoft} />
                  </Pressable>
                </View>

                {/* Form fields */}
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
                    <Input value={address} onChangeText={setAddress} placeholder="ობიექტის მისამართი" />
                  </Field>
                  <Field label="მდებარეობა რუკაზე">
                    <MapPicker value={pin} onChange={setPin} addressHint={address} />
                  </Field>
                </ScrollView>

                <Button
                  title="შექმნა"
                  onPress={createProject}
                  loading={busy}
                  disabled={!name.trim()}
                  style={{ marginTop: 16 }}
                />
              </>
            )}
          </Pressable>
        </KeyboardAvoidingView>
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
  const av = projectAvatar(project.id);
  return (
    <Pressable onPress={onPress} style={{ width }}>
      <View style={styles.projectCard}>
        <View style={[styles.projectEmoji, { backgroundColor: av.color + '22' }]}>
          <Text style={{ fontSize: 26 }}>{av.emoji}</Text>
        </View>
        <Text style={styles.projectName} numberOfLines={2}>{project.name}</Text>
        {project.company_name ? (
          <Text style={styles.projectSub} numberOfLines={1}>{project.company_name}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

// ──────────── HELPERS ────────────

function greetingFor(name: string) {
  const hour = new Date().getHours();
  const base =
    hour < 5 ? 'კარგი ღამე' :
    hour < 12 ? 'დილა მშვიდობისა' :
    hour < 18 ? 'გამარჯობა' :
    'საღამო მშვიდობისა';
  return name ? `${base}, ${name}` : base;
}

function todayFormatted() {
  try {
    return new Date().toLocaleDateString('ka-GE', { weekday: 'long', day: 'numeric', month: 'long' });
  } catch {
    return '';
  }
}

function relativeTime(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ახლა';
  if (m < 60) return `${m} წთ. წინ`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} სთ. წინ`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} დღის წინ`;
  return d.toLocaleDateString('ka-GE', { day: 'numeric', month: 'short' });
}

const TIPS = [
  'ხარაჩოს ინსპექტორობამდე დარწმუნდი, რომ ქამარი და მუზარადი გაქვს.',
  'ქარი 15 მ/წმ-ზე მაღლა — შეაჩერე სიმაღლის სამუშაოები.',
  'ქამრის ინსპექცია: შეამოწმე ნაკერები და ბალთები, არა მხოლოდ ზოლი.',
  'ფოტოს გადაღება ანგარიშში 3x უფრო ღირებულს ხდის — გადაიღე ყოველ ცვლილებას.',
  'ხარაჩოს ფეხის ფუძე უნდა იდოს მტკიცე, თანაბარ ზედაპირზე.',
  'ორი დამოუკიდებელი მიბმის წერტილი ყოველთვის უფრო უსაფრთხოა ერთზე.',
  'სველი ხარაჩო ორჯერ უფრო საშიშია — შეამოწმე ფიცრის გახრწნა.',
];

function tipOfTheDay() {
  const day = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return TIPS[day % TIPS.length];
}

// ──────────── STYLES ────────────

const styles = StyleSheet.create({
  // HERO
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
    color: theme.colors.ink,
    lineHeight: 36,
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
    fontSize: 12,
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
    borderRadius: 14,
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
    borderColor: theme.colors.accent + '33',
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
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  startSub: {
    fontSize: 12,
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
    borderRadius: 14,
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
    fontSize: 14,
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
    lineHeight: 18,
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
    borderColor: theme.colors.accent + '33',
    borderStyle: 'dashed',
    paddingVertical: 32,
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
    fontSize: 12,
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
    borderColor: theme.colors.accent + '33',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 20,
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

  // FAB
  fabWrap: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    zIndex: 50,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
  },
});

const pickerStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  blurWrap: {
    ...StyleSheet.absoluteFillObject,
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
    marginTop: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.accentSoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.accent + '33',
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
