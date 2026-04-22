import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  const [counts, setCounts] = useState<{ total: number; drafts: number; completed: number }>({
    total: 0,
    drafts: 0,
    completed: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, t, r, p, cs] = await Promise.all([
        certificatesApi.list().catch(() => []),
        templatesApi.list().catch(() => []),
        questionnairesApi.recent(10).catch(() => []),
        projectsApi.list().catch(() => []),
        questionnairesApi.counts().catch(() => ({ total: 0, drafts: 0, completed: 0, latestCreatedAt: null })),
      ]);
      setCerts(c);
      setTemplates(t);
      setRecent(r);
      setProjects(p);
      setCounts(cs);
    } catch {
      // ignore
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

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
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 40 }}
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
                  <Ionicons name="play" size={22} color={theme.colors.white} />
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
                <Ionicons name="chevron-forward" size={20} color={theme.colors.white} />
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

        {/* ───────── STATS ───────── */}
        <View style={[styles.statRow, { marginTop: 20 }]}>
          <StatTile
            value={counts.completed}
            label="დასრულდა"
            tint={theme.colors.harnessTint}
          />
          <StatTile
            value={counts.drafts}
            label="დრაფტი"
            tint={theme.colors.warn}
            onPress={() => router.push('/history' as any)}
          />
          <StatTile
            value={expiringCount}
            label={expiringCount === 0 ? 'სერტ.' : 'იწურება'}
            tint={expiringCount > 0 ? theme.colors.danger : theme.colors.accent}
            onPress={() => router.push('/certificates' as any)}
            alert={expiringCount > 0}
          />
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
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4, gap: 12 }}
          >
            {projects.slice(0, 8).map(p => {
              const av = projectAvatar(p.id);
              return (
                <Pressable key={p.id} onPress={() => router.push(`/projects/${p.id}` as any)}>
                  <View style={styles.projectCard}>
                    <View style={[styles.projectEmoji, { backgroundColor: av.color + '22' }]}>
                      <Text style={{ fontSize: 26 }}>{av.emoji}</Text>
                    </View>
                    <Text style={styles.projectName} numberOfLines={2}>{p.name}</Text>
                    {p.company_name ? (
                      <Text style={styles.projectSub} numberOfLines={1}>{p.company_name}</Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
            {projects.length > 8 ? (
              <Pressable onPress={() => router.push('/(tabs)/projects' as any)} style={styles.projectCardMore}>
                <Ionicons name="arrow-forward" size={22} color={theme.colors.accent} />
                <Text style={styles.projectMoreText}>ყველა</Text>
              </Pressable>
            ) : null}
          </ScrollView>
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
    </SafeAreaView>
  );
}

// ──────────── STAT TILE ────────────

function StatTile({
  value,
  label,
  tint,
  onPress,
  alert,
}: {
  value: number;
  label: string;
  tint: string;
  onPress?: () => void;
  alert?: boolean;
}) {
  const Inner = (
    <View style={[styles.statTile, alert && { borderColor: tint + '55', backgroundColor: tint + '0E' }]}>
      <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
  return onPress ? <Pressable onPress={onPress} style={{ flex: 1 }}>{Inner}</Pressable> : <View style={{ flex: 1 }}>{Inner}</View>;
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
    gap: 14,
    backgroundColor: theme.colors.accent,
    borderRadius: 18,
    padding: 18,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  resumeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeEyebrow: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  resumeTitle: {
    color: theme.colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
  resumeMeta: {
    color: 'rgba(255,255,255,0.75)',
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

  // STATS
  statRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
  },
  statTile: {
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'flex-start',
    gap: 2,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    width: 140,
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
  projectCardMore: {
    width: 90,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.accent + '33',
    backgroundColor: theme.colors.accentSoft,
  },
  projectMoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.accent,
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
});
