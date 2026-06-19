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
import { RefreshControl } from '../../components/primitives';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight, CalendarDays, Infinity, TriangleAlert, Moon, Languages, FileText, Box, ExternalLink, LogOut, Clock, Award, BookOpen } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Badge, Card } from '../../components/ui';
import { Skeleton } from '../../components/Skeleton';
import { useSession } from '../../lib/session';
import { isExpiringSoon } from '../../lib/services';
import {
  useInspectionCounts,
  usePaymentHistory,
  useProjects,
  useQualifications,
  useTemplates,
} from '../../lib/apiHooks';
import { useToast } from '../../lib/toast';
import { useTheme, type Theme } from '../../lib/theme';
import { CustomDropdown } from '../../components/ui/CustomDropdown';
import { usePdfUsage, useInvalidatePdfUsage, type PdfUsage } from '../../lib/usePdfUsage';
import { formatShortDate } from '../../lib/formatDate';
import { supabase } from '../../lib/supabase';

import { a11y } from '../../lib/accessibility';
import { useTranslation } from 'react-i18next';
import { saveLanguage } from '../../lib/i18n';
import i18n from '../../lib/i18n';
import { REGULATIONS } from '../../lib/regulations';
import { relativeTime } from '../../lib/homeUtils';
import type { PaymentRecord, Project, Qualification, Template } from '../../types/models';

export default function MoreScreen() {
  const { theme, isDark, mode, setMode } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const { state, signOut } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const signingOutGuard = useRef(false);
  const pdfUsage = usePdfUsage().data;
  const countsQ = useInspectionCounts();
  const certsQ = useQualifications();
  const templatesQ = useTemplates();
  const projectsQ = useProjects();
  const paymentHistoryQ = usePaymentHistory();

  const counts = countsQ.data ?? { total: 0, drafts: 0, completed: 0, latestCreatedAt: null };
  const certs = certsQ.data ?? [];
  const templates = templatesQ.data ?? [];
  const projects = projectsQ.data ?? [];
  const loaded = !countsQ.isLoading && !certsQ.isLoading && !templatesQ.isLoading && !projectsQ.isLoading;

  const user = state.status === 'signedIn' ? state.user : null;
  const completed = counts.completed;
  const drafts = counts.drafts;
  const expiring = certs.filter(isExpiringSoon).length;
  const systemTpl = templates.filter(tpl => tpl.is_system).length;
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
      { text: t('common.cancel'), style: 'cancel' },
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


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top', 'bottom']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 24, gap: 18 }}
        refreshControl={
          <RefreshControl
            queries={[countsQ, certsQ, templatesQ, projectsQ, paymentHistoryQ]}
          />
        }
      >
        <Text style={{ fontSize: 28, fontWeight: '800', fontFamily: theme.typography.fontFamily.display, paddingHorizontal: 20, color: theme.colors.ink }}>
          {t('more.title')}
        </Text>

        {/* Profile */}
        <Card
          style={{ marginHorizontal: 16 }}
          onPress={() => router.push('/profile')}
          a11y={a11y('პროფილი', 'პროფილის რედაქტირება', 'button')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', fontSize: 17, color: theme.colors.ink }}>
                {`${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || '-'}
              </Text>
              <Text style={{ color: theme.colors.inkSoft, fontSize: 12 }}>{user?.email ?? ''}</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.inkFaint} strokeWidth={1.5} />
          </View>
        </Card>

        {/* Subscription status (read-only - no purchase UI, Apple guideline 3.1.1) */}
        <SubscriptionSection pdfUsage={pdfUsage} />

        {/* Payment history - renders only when records exist (web-side
            purchases). Free accounts and App Review see no payment surfaces
            at all (guideline 3.1.1); the VAT-invoices scaffold was removed
            with the purchase UI. */}
        <PaymentHistoryCard records={paymentHistoryQ.data ?? []} />

        {/* Hub tiles */}
        <View style={styles.grid}>
          <HubTile
            title={t('more.history')}
            icon={Clock}
            tint={theme.colors.accent}
            bg={theme.colors.accentSoft}
            primary={loaded ? `${counts.total}` : null}
            secondary={loaded ? (counts.latestCreatedAt ? `${t('more.lastInspection', { date: relativeTime(counts.latestCreatedAt, t, i18n.language) })}` : t('more.emptyLast')) : null}
            onPress={() => router.push('/history')}
          />
          <HubTile
            title={t('more.qualifications')}
            icon={Award}
            tint={theme.colors.certTint}
            bg={theme.colors.certSoft}
            primary={loaded ? `${certs.length}` : null}
            secondary={loaded ? (expiring > 0 ? t('more.expiringCount', { count: expiring }) : certs.length === 0 ? t('more.uploadPrompt') : t('more.allActive')) : null}
            badge={loaded && expiring > 0 ? t('more.expiringCount', { count: expiring }) : undefined}
            onPress={() => router.push('/qualifications' as any)}
          />
          <HubTile
            title={t('more.templates')}
            icon={FileText}
            tint={theme.colors.harnessTint}
            bg={theme.colors.harnessSoft}
            primary={loaded ? `${templates.length}` : null}
            secondary={loaded ? (systemTpl === templates.length ? t('more.system') : `${systemTpl} ${t('more.system')}`) : null}
            onPress={() => router.push('/templates')}
          />
          <HubTile
            title={t('more.regulations')}
            icon={BookOpen}
            tint={theme.colors.regsTint}
            bg={theme.colors.regsSoft}
            primary={String(REGULATIONS.length)}
            secondary={t('more.document')}
            onPress={() => router.push('/(tabs)/regulations')}
          />
        </View>

        {/* Settings */}
        <Text style={styles.settingsSectionTitle}>{t('more.settings')}</Text>
        <Card style={[styles.settingsCard, { marginHorizontal: 16 }]}>
          <View style={styles.settingsRow}>
            <Moon size={18} color={theme.colors.inkSoft} strokeWidth={1.5} />
            <Text style={styles.settingsLabel}>{t('more.darkMode')}</Text>
            <Switch
              value={isDark}
              onValueChange={onToggleDark}
              trackColor={{ false: theme.colors.inkFaint, true: theme.colors.accent }}
              thumbColor={theme.colors.white}
            />
          </View>
          <View style={styles.divider} />

          <Pressable onPress={() => setLangPickerOpen(true)} style={styles.settingsRow} {...a11y(t('more.language'), undefined, 'button')}>
            <Languages size={18} color={theme.colors.inkSoft} strokeWidth={1.5} />
            <Text style={styles.settingsLabel}>{t('more.language')}</Text>
            <Text style={{ fontSize: 13, color: theme.colors.inkSoft }}>{i18n.language === 'ka' ? 'ქართული' : 'English'}</Text>
            <ChevronRight size={16} color={theme.colors.inkFaint} strokeWidth={1.5} />
          </Pressable>
          <CustomDropdown
            label="ენა / LANGUAGE"
            options={[
              { label: 'ქართული', value: 'ka' },
              { label: 'English', value: 'en' },
            ]}
            value={i18n.language}
            onChange={(lang) => onChangeLang(lang as 'ka' | 'en')}
            open={langPickerOpen}
            onOpenChange={setLangPickerOpen}
          />
          <View style={styles.divider} />

          <Pressable onPress={() => router.push('/terms?mode=view')} style={styles.settingsRow} {...a11y(t('more.terms'), undefined, 'button')}>
            <FileText size={18} color={theme.colors.inkSoft} strokeWidth={1.5} />
            <Text style={styles.settingsLabel}>{t('more.terms')}</Text>
            <ChevronRight size={16} color={theme.colors.inkFaint} strokeWidth={1.5} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable onPress={() => router.push('/guide')} style={styles.settingsRow} {...a11y('ხარაჩო 3D გიდი', undefined, 'button')}>
            <Box size={18} color={theme.colors.inkSoft} strokeWidth={1.5} />
            <Text style={styles.settingsLabel}>ხარაჩო 3D გიდი</Text>
            <Badge variant="default" size="sm">BETA</Badge>
            <ChevronRight size={16} color={theme.colors.inkFaint} strokeWidth={1.5} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            onPress={() => router.push('/safety-3d')}
            style={styles.settingsRow}
            {...a11y('3D Safety Guide / 3D უსაფრთხოების გიდი', undefined, 'button')}
          >
            <Box size={18} color={theme.colors.inkSoft} strokeWidth={1.5} />
            <Text style={styles.settingsLabel}>3D Safety Guide / 3D უსაფრთხოების გიდი</Text>
            <Badge variant="default" size="sm">BETA</Badge>
            <ExternalLink size={16} color={theme.colors.inkFaint} strokeWidth={1.5} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable onPress={handleLogout} disabled={signingOut} style={[styles.settingsRow, signingOut && { opacity: 0.5 }]} {...a11y(t('more.signOut'), undefined, 'button')}>
            <LogOut size={18} color={signingOut ? theme.colors.inkFaint : theme.colors.danger} strokeWidth={1.5} />
            <Text style={{ flex: 1, fontSize: 15, fontWeight: '500', color: signingOut ? theme.colors.inkFaint : theme.colors.danger }}>{t('more.signOut')}</Text>
          </Pressable>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

// ───────── PAYMENT HISTORY ─────────

const STATUS_COLOR: Record<PaymentRecord['status'], string> = {
  success: '#34C759',
  pending: '#FF9500',
  failed: '#FF3B30',
  refunded: '#8E8E93',
};
const STATUS_LABEL: Record<PaymentRecord['status'], string> = {
  success: 'გადახდილია',
  pending: 'მუშავდება',
  failed: 'წარუმატებელი',
  refunded: 'დაბრუნებულია',
};

function PaymentHistoryCard({ records }: { records: PaymentRecord[] }) {
  const { theme } = useTheme();
  const s = useMemo(() => getStyles(theme), [theme]);
  // No records (the common case - payments happen on the web platform):
  // render nothing rather than an empty "payment history" card.
  if (records.length === 0) return null;
  return (
    <Card style={{ marginHorizontal: 16 }}>
      <Text style={s.sectionHeader}>გადახდის ისტორია</Text>
      <View style={{ gap: 0 }}>
        {records.map((rec, idx) => (
          <View key={rec.id}>
            {idx > 0 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.hairline, marginLeft: 0 }} />}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: theme.colors.ink }}>
                  {rec.amount != null ? `${rec.amount} ${rec.currency ?? ''}` : '-'}
                </Text>
                <Text style={{ fontSize: 12, color: theme.colors.inkSoft, marginTop: 2 }}>
                  {formatShortDate(rec.created_at)}
                </Text>
              </View>
              <View style={{
                backgroundColor: `${STATUS_COLOR[rec.status]}20`,
                borderRadius: 6,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: STATUS_COLOR[rec.status] }}>
                  {STATUS_LABEL[rec.status]}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

// ───────── SUBSCRIPTION SECTION ─────────

function SubscriptionSection({ pdfUsage }: { pdfUsage: PdfUsage | undefined }) {
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
      {/* Section label - "გეგმა" (plan), not "გამოწერა" (subscription): accurate
          for free users and keeps the More tab free of purchase vocabulary
          (Apple guideline 3.1.1). */}
      <Text style={[s.sectionHeader, { marginBottom: 8 }]}>გეგმა</Text>

      {status === 'active' ? (
        <Card style={{ gap: 12 }}>
          {/* PRO badge row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={s.proBadge}>
              <Text style={s.proBadgeText}>PRO ✓</Text>
            </View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.colors.ink }}>Hubble Pro</Text>
          </View>

          {/* Expiry */}
          {expiresAt && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <CalendarDays size={15} color={theme.colors.inkSoft} strokeWidth={1.5} />
              <Text style={{ fontSize: 13, color: theme.colors.inkSoft }}>
                {`მოქმედია: ${formatShortDate(expiresAt)}-მდე`}
              </Text>
            </View>
          )}

          {/* Perk line */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Infinity size={15} color={theme.colors.inkSoft} strokeWidth={1.5} />
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
            <TriangleAlert size={16} color={theme.colors.warn} strokeWidth={1.5} />
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
  icon: LucideIcon;
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
            {(() => { const IconComp = icon; return <IconComp size={20} color={tint} strokeWidth={1.5} />; })()}
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
          <ChevronRight size={14} color={theme.colors.inkFaint} strokeWidth={1.5} />
        </View>
      </Card>
    </Pressable>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.subtleSurface,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 16,
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
    settingsSectionTitle: {
      fontSize: 20,
      fontWeight: '800',
      fontFamily: theme.typography.fontFamily.display,
      color: theme.colors.ink,
      paddingHorizontal: 16,
      marginBottom: 10,
    },
    settingsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 18,
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
