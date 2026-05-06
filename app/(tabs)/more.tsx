import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Card } from '../../components/ui';
import { Skeleton } from '../../components/Skeleton';
import { useSession } from '../../lib/session';
import { isExpiringSoon } from '../../lib/services';
import {
  useInspectionCounts,
  useProjects,
  useQualifications,
  useTemplates,
} from '../../lib/apiHooks';
import { useToast } from '../../lib/toast';
import { useTheme, type Theme } from '../../lib/theme';
import { useBottomSheet } from '../../components/BottomSheet';
import { usePdfUsage, useInvalidatePdfUsage, type PdfUsage } from '../../lib/usePdfUsage';
import { PaywallModal } from '../../components/PaywallModal';
import { formatShortDate } from '../../lib/formatDate';
import { supabase } from '../../lib/supabase';

import { a11y } from '../../lib/accessibility';
import { useTranslation } from 'react-i18next';
import { saveLanguage } from '../../lib/i18n';
import i18n from '../../lib/i18n';
import type { Project, Qualification, Template } from '../../types/models';

export default function MoreScreen() {
  const { theme, isDark, mode, setMode } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const { state, signOut } = useSession();
  const router = useRouter();
  const toast = useToast();
  const showActionSheet = useBottomSheet();
  const [signingOut, setSigningOut] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const signingOutGuard = useRef(false);
  const pdfUsage = usePdfUsage().data;
  const countsQ = useInspectionCounts();
  const certsQ = useQualifications();
  const templatesQ = useTemplates();
  const projectsQ = useProjects();

  const counts = countsQ.data ?? { total: 0, drafts: 0, completed: 0, latestCreatedAt: null };
  const certs = certsQ.data ?? [];
  const templates = templatesQ.data ?? [];
  const projects = projectsQ.data ?? [];
  const loaded = !countsQ.isLoading && !certsQ.isLoading && !templatesQ.isLoading && !projectsQ.isLoading;

  const user = state.status === 'signedIn' ? state.user : null;
  const completed = counts.completed;
  const drafts = counts.drafts;
  const expiring = certs.filter(isExpiringSoon).length;
  const systemTpl = templates.filter(t => t.is_system).length;
  const avatarSeed = encodeURIComponent(user?.id ?? user?.email ?? 'guest');
  const avatarUrl = `https://api.dicebear.com/9.x/adventurer/png?seed=${avatarSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&size=128`;

  const onToggleDark = (val: boolean) => {
    setMode(val ? 'dark' : 'light');
  };

  const onChangeLang = async (lng: 'ka' | 'en') => {
    await saveLanguage(lng);
    toast.success(t('notifications.languageChanged'));
  };

  const handleLogout = () => {
    if (signingOutGuard.current || signingOut) return;
    Alert.alert(t('more.signOutConfirmTitle'), t('more.signOutConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel', onPress: () => { signingOutGuard.current = false; } },
      {
        text: t('more.signOut'),
        style: 'destructive',
        onPress: async () => {
          if (signingOutGuard.current) return;
          signingOutGuard.current = true;
          setSigningOut(true);
          try {
            await signOut();
            await AsyncStorage.removeItem('@auth:email').catch(() => {});
            toast.success(t('notifications.signedOut'));
          } catch (e) {
            signingOutGuard.current = false;
            setSigningOut(false);
            toast.error(t('notifications.signOutFailed'));
          }
        },
      },
    ]);
  };

  const openLanguagePicker = () => {
    const currentLang = i18n.language;
    const options = ['ქართული', 'English', 'გაუქმება'];
    const selectedOptionIndex = currentLang === 'en' ? 1 : 0;
    showActionSheet(
      { title: 'ენა / LANGUAGE', options, cancelButtonIndex: 2, selectedOptionIndex },
      idx => {
        if (idx === 0) onChangeLang('ka');
        if (idx === 1) onChangeLang('en');
      },
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingVertical: 16, gap: 18 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', fontFamily: theme.typography.fontFamily.heading, paddingHorizontal: 20, color: theme.colors.ink }}>
          {t('more.title')}
        </Text>

        {/* Profile */}
        <Card style={{ marginHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', fontSize: 17, color: theme.colors.ink }}>
                {`${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || '—'}
              </Text>
              <Text style={{ color: theme.colors.inkSoft, fontSize: 12 }}>{user?.email ?? ''}</Text>
            </View>
          </View>
        </Card>

        {/* Subscription management */}
        <SubscriptionSection
          pdfUsage={pdfUsage}
          onOpenPaywall={() => setPaywallVisible(true)}
        />

        {/* Payment history — scaffold */}
        <Card style={{ marginHorizontal: 16 }}>
          <Text style={styles.sectionHeader}>გადახდის ისტორია</Text>
          {/* TODO: fetch payment history from Supabase once BOG webhook stores transaction records */}
          <View style={styles.emptyScaffold}>
            <Ionicons name="receipt-outline" size={28} color={theme.colors.inkFaint} />
            <Text style={styles.emptyScaffoldText}>ჩანაწერები არ არის</Text>
          </View>
        </Card>

        {/* Invoices — scaffold */}
        <Card style={{ marginHorizontal: 16 }}>
          <Text style={styles.sectionHeader}>ანგარიშ-ფაქტურები</Text>
          {/* TODO: generate VAT invoices once company registration is complete */}
          <View style={styles.emptyScaffold}>
            <Ionicons name="document-outline" size={28} color={theme.colors.inkFaint} />
            <Text style={styles.emptyScaffoldText}>ხელმისაწვდომი იქნება კომპანიის{'\n'}რეგისტრაციის შემდეგ</Text>
          </View>
        </Card>

        {/* Hub tiles */}
        <View style={styles.grid}>
          <HubTile
            title={t('more.history')}
            icon="time"
            tint={theme.colors.accent}
            bg={theme.colors.accentSoft}
            primary={loaded ? `${counts.total}` : null}
            secondary={loaded ? (counts.latestCreatedAt ? `${t('more.lastInspection', { date: relativeTime(counts.latestCreatedAt, t) })}` : t('more.emptyLast')) : null}
            onPress={() => router.push('/history')}
          />
          <HubTile
            title={t('more.qualifications')}
            icon="ribbon"
            tint={theme.colors.certTint}
            bg={theme.colors.certSoft}
            primary={loaded ? `${certs.length}` : null}
            secondary={loaded ? (expiring > 0 ? t('more.expiringCount', { count: expiring }) : certs.length === 0 ? t('more.uploadPrompt') : t('more.allActive')) : null}
            badge={loaded && expiring > 0 ? t('more.expiringCount', { count: expiring }) : undefined}
            onPress={() => router.push('/qualifications' as any)}
          />
          <HubTile
            title={t('more.templates')}
            icon="documents"
            tint={theme.colors.harnessTint}
            bg={theme.colors.harnessSoft}
            primary={loaded ? `${templates.length}` : null}
            secondary={loaded ? (systemTpl === templates.length ? t('more.system') : `${systemTpl} ${t('more.system')}`) : null}
            onPress={() => router.push('/templates')}
          />
          <HubTile
            title={t('more.regulations')}
            icon="book"
            tint={theme.colors.regsTint}
            bg={theme.colors.regsSoft}
            primary="3"
            secondary={t('more.document')}
            onPress={() => router.push('/(tabs)/regulations')}
          />
        </View>

        {/* Settings */}
        <Card style={[styles.settingsCard, { marginHorizontal: 16 }]}>
          <Text style={styles.settingsHeader}>{t('more.settings')}</Text>

          <View style={styles.settingsRow}>
            <Ionicons name="moon-outline" size={18} color={theme.colors.inkSoft} />
            <Text style={styles.settingsLabel}>{t('more.darkMode')}</Text>
            <Switch
              value={isDark}
              onValueChange={onToggleDark}
              trackColor={{ false: theme.colors.hairline, true: theme.colors.accent }}
              thumbColor={theme.colors.white}
            />
          </View>
          <View style={styles.divider} />

          <Pressable onPress={openLanguagePicker} style={styles.settingsRow} {...a11y(t('more.language'), undefined, 'button')}>
            <Ionicons name="language-outline" size={18} color={theme.colors.inkSoft} />
            <Text style={styles.settingsLabel}>{t('more.language')}</Text>
            <Text style={{ fontSize: 13, color: theme.colors.inkSoft }}>{i18n.language === 'ka' ? 'ქართული' : 'English'}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
          </Pressable>
          <View style={styles.divider} />

          <Pressable onPress={() => router.push('/terms?mode=view')} style={styles.settingsRow} {...a11y(t('more.terms'), undefined, 'button')}>
            <Ionicons name="document-text-outline" size={18} color={theme.colors.inkSoft} />
            <Text style={styles.settingsLabel}>{t('more.terms')}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable onPress={() => router.push('/account-settings')} style={styles.settingsRow} {...a11y(t('more.changePassword'), undefined, 'button')}>
            <Ionicons name="key-outline" size={18} color={theme.colors.inkSoft} />
            <Text style={styles.settingsLabel}>{t('more.changePassword')}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable onPress={() => router.push('/guide')} style={styles.settingsRow} {...a11y('Guide / ინსტრუქცია', undefined, 'button')}>
            <Ionicons name="book-outline" size={18} color={theme.colors.inkSoft} />
            <Text style={styles.settingsLabel}>Guide / ინსტრუქცია</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            onPress={() => router.push('/safety-3d')}
            style={styles.settingsRow}
            {...a11y('3D Safety Guide / 3D უსაფრთხოების გიდი', undefined, 'button')}
          >
            <Ionicons name="cube-outline" size={18} color={theme.colors.inkSoft} />
            <Text style={styles.settingsLabel}>3D Safety Guide / 3D უსაფრთხოების გიდი</Text>
            <Ionicons name="open-outline" size={16} color={theme.colors.inkFaint} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable onPress={handleLogout} disabled={signingOut} style={[styles.settingsRow, signingOut && { opacity: 0.5 }]} {...a11y(t('more.signOut'), undefined, 'button')}>
            <Ionicons name="log-out-outline" size={18} color={signingOut ? theme.colors.inkFaint : theme.colors.danger} />
            <Text style={{ flex: 1, fontSize: 15, fontWeight: '500', color: signingOut ? theme.colors.inkFaint : theme.colors.danger }}>{t('more.signOut')}</Text>
          </Pressable>
        </Card>
      </ScrollView>
      <PaywallModal visible={paywallVisible} onClose={() => setPaywallVisible(false)} />
    </SafeAreaView>
  );
}

// ───────── SUBSCRIPTION SECTION ─────────

function SubscriptionSection({
  pdfUsage,
  onOpenPaywall,
}: {
  pdfUsage: PdfUsage | undefined;
  onOpenPaywall: () => void;
}) {
  const { theme } = useTheme();
  const toast = useToast();
  const s = useMemo(() => getStyles(theme), [theme]);
  const invalidatePdfUsage = useInvalidatePdfUsage();
  const { state } = useSession();

  if (!pdfUsage) return null;

  const { status, count, limit, expiresAt } = pdfUsage;

  const confirmCancel = () => {
    const until = expiresAt ? formatShortDate(expiresAt) : null;
    const userId = state.status === 'signedIn' ? state.session.user.id : null;
    Alert.alert(
      'გამოწერის გაუქმება?',
      until
        ? `წვდომა გაგრძელდება ${until}-მდე. ავტომატური განახლება არ მოხდება.`
        : 'გამოწერა გაუქმდება. ახალი გადახდა არ მოხდება.',
      [
        { text: 'უკან', style: 'cancel' },
        {
          text: 'გაუქმება',
          style: 'destructive',
          onPress: async () => {
            if (!userId) {
              toast.error('სესია არ არის');
              return;
            }
            try {
              const { error } = await supabase.rpc('cancel_subscription', { user_id: userId });
              if (error) throw error;
              invalidatePdfUsage();
              toast.success(until ? `წვდომა გაგრძელდება ${until}-მდე` : 'გამოწერა გაუქმდა');
            } catch (e) {
              console.error('cancel_subscription failed:', e);
              toast.error('გაუქმება ვერ მოხერხდა');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={{ marginHorizontal: 16, gap: 0 }}>
      {/* Section label */}
      <Text style={[s.sectionHeader, { marginBottom: 8 }]}>გამოწერა</Text>

      {status === 'active' ? (
        <Card style={{ gap: 12 }}>
          {/* PRO badge row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={s.proBadge}>
              <Text style={s.proBadgeText}>PRO ✓</Text>
            </View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.colors.ink }}>Sarke Pro</Text>
          </View>

          {/* Expiry */}
          {expiresAt && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="calendar-outline" size={15} color={theme.colors.inkSoft} />
              <Text style={{ fontSize: 13, color: theme.colors.inkSoft }}>
                {`მოქმედია: ${formatShortDate(expiresAt)}-მდე`}
              </Text>
            </View>
          )}

          {/* Perk line */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="infinite-outline" size={15} color={theme.colors.inkSoft} />
            <Text style={{ fontSize: 13, color: theme.colors.inkSoft }}>შეუზღუდავი PDF გენერაცია</Text>
          </View>

          {/* Cancel link */}
          <Pressable
            onPress={confirmCancel}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, alignSelf: 'flex-start' })}
            {...a11y('გამოწერის გაუქმება', undefined, 'button')}
          >
            <Text style={{ fontSize: 13, color: theme.colors.danger, fontWeight: '600' }}>
              გამოწერის გაუქმება
            </Text>
          </Pressable>
        </Card>
      ) : status === 'expired' ? (
        <Card style={{ gap: 12 }}>
          {/* Expired amber banner */}
          <View style={[s.expiredBanner]}>
            <Ionicons name="warning-outline" size={16} color={theme.colors.warn} />
            <Text style={[s.expiredBannerText]}>გამოწერა ამოიწურა</Text>
          </View>

          {/* PDF usage */}
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: theme.colors.inkSoft }}>PDF გამოყენება</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.warn }}>
                {`${count} / ${limit}`}
              </Text>
            </View>
            <ProgressBar value={count} max={limit} locked />
          </View>

          {/* Renew button */}
          <Pressable
            style={({ pressed }) => [s.proBtn, pressed && { opacity: 0.85 }]}
            onPress={onOpenPaywall}
            {...a11y('განახლება', 'გამოწერის განახლება', 'button')}
          >
            <Text style={s.proBtnText}>განახლება ₾19/თვე</Text>
          </Pressable>
        </Card>
      ) : (
        /* free */
        <Card style={{ gap: 12 }}>
          {/* Plan label + count */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.ink }}>უფასო გეგმა</Text>
            <Text style={{ fontSize: 13, color: count >= limit ? theme.colors.warn : theme.colors.inkSoft }}>
              {`PDF: ${count}/${limit} გამოყენებული`}
            </Text>
          </View>

          <ProgressBar value={count} max={limit} locked={count >= limit} />

          {/* Upgrade button */}
          <Pressable
            style={({ pressed }) => [s.proBtn, pressed && { opacity: 0.85 }]}
            onPress={onOpenPaywall}
            {...a11y('PRO-ზე გადასვლა', 'Sarke Pro-ს გამოწერა', 'button')}
          >
            <Text style={s.proBtnText}>PRO-ზე გადასვლა ₾19/თვე</Text>
          </Pressable>
        </Card>
      )}
    </View>
  );
}

function ProgressBar({ value, max, locked }: { value: number; max: number; locked: boolean }) {
  const { theme } = useTheme();
  const pct = `${Math.min(100, Math.round((value / max) * 100))}%` as const;
  return (
    <View style={{ height: 6, backgroundColor: theme.colors.surfaceSecondary, borderRadius: 3, overflow: 'hidden' }}>
      <View style={{
        width: pct,
        height: '100%',
        backgroundColor: locked ? theme.colors.warn : theme.colors.accent,
        borderRadius: 3,
      }} />
    </View>
  );
}

// ───────── HELPERS ─────────

function StatPill({ value, label, tint, theme }: { value: number | null; label: string; tint: string; theme: Theme }) {
  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <View style={[styles.statPill, { backgroundColor: theme.colors.card, borderColor: theme.colors.hairline }]}>
      {value === null ? (
        <Skeleton width={30} height={22} />
      ) : (
        <Text style={{ fontSize: 22, fontWeight: '800', fontFamily: theme.typography.fontFamily.display, color: tint }}>{value}</Text>
      )}
      <Text
        style={{
          fontSize: 10,
          fontWeight: '600',
          color: theme.colors.inkSoft,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function HubTile({
  title,
  icon,
  tint,
  bg,
  primary,
  secondary,
  badge,
  onPress,
}: {
  title: string;
  icon: any;
  tint: string;
  bg: string;
  primary: string | null;
  secondary: string | null;
  badge?: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  return (
    <Pressable onPress={onPress} style={styles.hubTileWrap} {...a11y(title, 'გადასვლა', 'button')}>
      <Card style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={[styles.tileIcon, { backgroundColor: bg }]}>
            <Ionicons name={icon} size={20} color={tint} />
          </View>
          {badge ? (
            <Badge variant="warning" size="sm">{badge}</Badge>
          ) : null}
        </View>
        {primary === null ? (
          <Skeleton width={40} height={28} />
        ) : (
          <Text style={{ fontSize: 28, fontWeight: '900', fontFamily: theme.typography.fontFamily.display, color: theme.colors.ink }}>{primary}</Text>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontWeight: '600', color: theme.colors.ink }}>{title}</Text>
            {secondary === null ? (
              <Skeleton width={'70%'} height={11} />
            ) : (
              <Text style={{ fontSize: 11, color: theme.colors.inkSoft }} numberOfLines={1}>{secondary}</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={14} color={theme.colors.inkFaint} />
        </View>
      </Card>
    </Pressable>
  );
}

function relativeTime(iso: string, t: (key: string, opts?: any) => string) {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return t('home.relNow');
  if (m < 60) return t('home.relMinAgo', { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t('home.relHourAgo', { n: h });
  const d = Math.floor(h / 24);
  return t('home.relDayAgo', { n: d });
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.subtleSurface,
    },
    statPill: {
      flex: 1,
      borderRadius: theme.radius.cardInner,
      borderWidth: 1,
      padding: 14,
      gap: 3,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 24,
      gap: 12,
    },
    hubTileWrap: {
      width: '48%',
    },
    tileIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    settingsCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
      overflow: 'hidden',
      marginBottom: 24,
      paddingVertical: 8,
    },
    settingsHeader: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.inkSoft,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 4,
    },
    settingsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    settingsLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: theme.colors.ink,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.hairline,
      marginLeft: 46,
    },
    sectionHeader: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.inkFaint,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.6,
      marginBottom: 4,
    },
    proBadge: {
      backgroundColor: theme.colors.semantic.successSoft,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    proBadgeText: {
      fontSize: 13,
      fontWeight: '800',
      color: theme.colors.semantic.success,
      letterSpacing: 0.3,
    },
    expiredBanner: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      backgroundColor: theme.colors.warnSoft,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    expiredBannerText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.warn,
    },
    proBtn: {
      backgroundColor: theme.colors.accent,
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: 'center' as const,
    },
    proBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
    emptyScaffold: {
      alignItems: 'center' as const,
      paddingVertical: 24,
      gap: 8,
    },
    emptyScaffoldText: {
      fontSize: 13,
      color: theme.colors.inkFaint,
      textAlign: 'center' as const,
      lineHeight: 19,
    },
  });
}
