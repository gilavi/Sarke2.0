import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../../lib/session';
import { projectAvatar } from '../../lib/projectAvatar';
import {
  certificatesApi,
  isExpiringSoon,
  projectsApi,
  questionnairesApi,
  templatesApi,
} from '../../lib/services';
import { shareStoredPdf } from '../../lib/sharePdf';
import { theme } from '../../lib/theme';
import type { Certificate, Project, Questionnaire, Template } from '../../types/models';

export default function HomeScreen() {
  const { state } = useSession();
  const router = useRouter();
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [recent, setRecent] = useState<Questionnaire[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, t, r, p] = await Promise.all([
        certificatesApi.list().catch(() => []),
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

  const sharePdf = async (path: string) => {
    try { await shareStoredPdf(path); } catch { /* silent */ }
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
            <Pressable onPress={() => router.push(`/questionnaire/${latestDraft.id}` as any)}>
              <View style={styles.resumeCard}>
                <View style={styles.resumeIcon}>
                  <Ionicons name="play" size={16} color={theme.colors.accent} />
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
            <Pressable onPress={() => router.push('/new-inspection' as any)}>
              <View style={styles.startCard}>
                <View style={styles.startIcon}>
                  <Ionicons name="add" size={26} color={theme.colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.startTitle}>ახალი შემოწმება</Text>
                  <Text style={styles.startSub}>აირჩიე ტიპი და დაიწყე</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.accent} />
              </View>
            </Pressable>
          )}
        </View>

        {/* ───────── CERT BANNER (warn only) ───────── */}
        {showCertBanner ? (
          <Pressable onPress={() => router.push('/certificates')}>
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

        {/* ───────── PROJECTS CAROUSEL ───────── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>პროექტები</Text>
          <Pressable onPress={() => router.push('/(tabs)/projects' as any)} hitSlop={8}>
            <Text style={styles.sectionLink}>ყველა</Text>
          </Pressable>
        </View>

        {projects.length === 0 ? (
          <View style={[styles.sectionWrap, { marginTop: 8 }]}>
            <View style={styles.emptyProjects}>
              <Ionicons name="folder-open-outline" size={28} color={theme.colors.inkFaint} />
              <Text style={styles.emptyProjectsText}>პროექტები ჯერ არ გაქვს</Text>
              <Pressable onPress={() => router.push('/(tabs)/projects' as any)}>
                <Text style={styles.emptyProjectsCta}>+ დაამატე პირველი</Text>
              </Pressable>
            </View>
          </View>
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
        {recent.length > 0 ? (
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
                  onPress={() =>
                    q.status === 'completed' && q.pdf_url
                      ? sharePdf(q.pdf_url)
                      : router.push(`/questionnaire/${q.id}` as any)
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
                      name={q.status === 'completed' ? 'checkmark' : 'time-outline'}
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
                  <Ionicons
                    name={q.status === 'completed' && q.pdf_url ? 'share-outline' : 'chevron-forward'}
                    size={16}
                    color={theme.colors.inkFaint}
                  />
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

      {/* Persistent new-inspection FAB */}
      <Pressable
        onPress={() => router.push('/new-inspection' as any)}
        style={styles.fab}
      >
        <Ionicons name="add" size={28} color={theme.colors.white} />
      </Pressable>
    </SafeAreaView>
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

  // RESUME CARD — subtle, same visual weight as other cards
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
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeEyebrow: {
    color: theme.colors.accent,
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
    gap: 8,
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    borderStyle: 'dashed',
    paddingVertical: 28,
  },
  emptyProjectsText: {
    fontSize: 13,
    color: theme.colors.inkSoft,
  },
  emptyProjectsCta: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.accent,
    marginTop: 2,
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
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
  },
});
