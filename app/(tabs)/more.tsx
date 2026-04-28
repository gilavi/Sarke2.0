import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
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
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/ui';
import { Skeleton } from '../../components/Skeleton';
import { useSession } from '../../lib/session';
import {
  inspectionsApi,
  isExpiringSoon,
  projectsApi,
  qualificationsApi,
  templatesApi,
} from '../../lib/services';
import { useToast } from '../../lib/toast';
import { useTheme } from '../../lib/theme';

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
  const [langVisible, setLangVisible] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [counts, setCounts] = useState<{ total: number; drafts: number; completed: number; latestCreatedAt: string | null }>({
    total: 0,
    drafts: 0,
    completed: 0,
    latestCreatedAt: null,
  });
  const [certs, setCerts] = useState<Qualification[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const [cs, c, t, p] = await Promise.all([
          inspectionsApi
            .counts()
            .catch(() => ({ total: 0, drafts: 0, completed: 0, latestCreatedAt: null })),
          qualificationsApi.list().catch(() => []),
          templatesApi.list().catch(() => []),
          projectsApi.list().catch(() => []),
        ]);
        setCounts(cs);
        setCerts(c);
        setTemplates(t);
        setProjects(p);
        setLoaded(true);
      })();
    }, []),
  );

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
    setLangVisible(false);
    toast.success(t('notifications.languageChanged'));
  };

  const handleLogout = () => {
    Alert.alert(t('more.signOutConfirmTitle'), t('more.signOutConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('more.signOut'),
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            await signOut();
            await AsyncStorage.removeItem('@auth:email').catch(() => {});
            toast.success(t('notifications.signedOut'));
          } catch (e) {
            setSigningOut(false);
            toast.error(t('notifications.signOutFailed'));
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingVertical: 16, gap: 18 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', paddingHorizontal: 20, color: theme.colors.ink }}>
          {t('more.title')}
        </Text>

        {/* Profile */}
        <Card style={{ marginHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', fontSize: 17, color: theme.colors.ink }}>
                {`${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || '—'}
              </Text>
              <Text style={{ color: theme.colors.inkSoft, fontSize: 12 }}>{user?.email ?? ''}</Text>
            </View>
          </View>
        </Card>

        {/* Stat strip */}
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16 }}>
          <StatPill
            value={loaded ? projects.length : null}
            label={t('more.projectsCount')}
            tint={theme.colors.accent}
            theme={theme}
          />
          <StatPill
            value={loaded ? completed : null}
            label={t('more.completedCount')}
            tint={theme.colors.harnessTint}
            theme={theme}
          />
          <StatPill
            value={loaded ? drafts : null}
            label={t('more.draftCount')}
            tint={theme.colors.warn}
            theme={theme}
          />
        </View>

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
        <View style={[styles.settingsCard, { marginHorizontal: 16 }]}>
          <Text style={styles.settingsHeader}>{t('more.settings')}</Text>

          <View style={styles.settingsRow}>
            <Ionicons name="moon-outline" size={18} color={theme.colors.inkSoft} />
            <Text style={{ flex: 1, fontSize: 15, fontWeight: '500', color: theme.colors.ink }}>{t('more.darkMode')}</Text>
            <Switch
              value={isDark}
              onValueChange={onToggleDark}
              trackColor={{ false: theme.colors.hairline, true: theme.colors.accent }}
              thumbColor={theme.colors.white}
            />
          </View>
          <View style={styles.divider} />

          <Pressable onPress={() => setLangVisible(true)} style={styles.settingsRow} {...a11y(t('more.language'), undefined, 'button')}>
            <Ionicons name="language-outline" size={18} color={theme.colors.inkSoft} />
            <Text style={{ flex: 1, fontSize: 15, fontWeight: '500', color: theme.colors.ink }}>{t('more.language')}</Text>
            <Text style={{ fontSize: 13, color: theme.colors.inkSoft }}>{i18n.language === 'ka' ? 'ქართული' : 'English'}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
          </Pressable>
          <View style={styles.divider} />

          <Pressable onPress={() => router.push('/signature' as any)} style={styles.settingsRow} {...a11y(user?.saved_signature_url ? t('more.mySignature') : t('more.drawSignature'), undefined, 'button')}>
            <Ionicons name="create-outline" size={18} color={theme.colors.inkSoft} />
            <Text style={{ flex: 1, fontSize: 15, fontWeight: '500', color: theme.colors.ink }}>{user?.saved_signature_url ? t('more.mySignature') : t('more.drawSignature')}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable onPress={() => router.push('/terms?mode=view')} style={styles.settingsRow} {...a11y(t('more.terms'), undefined, 'button')}>
            <Ionicons name="document-text-outline" size={18} color={theme.colors.inkSoft} />
            <Text style={{ flex: 1, fontSize: 15, fontWeight: '500', color: theme.colors.ink }}>{t('more.terms')}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable onPress={() => router.push('/account-settings')} style={styles.settingsRow} {...a11y(t('more.changePassword'), undefined, 'button')}>
            <Ionicons name="key-outline" size={18} color={theme.colors.inkSoft} />
            <Text style={{ flex: 1, fontSize: 15, fontWeight: '500', color: theme.colors.ink }}>{t('more.changePassword')}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable onPress={handleLogout} disabled={signingOut} style={[styles.settingsRow, signingOut && { opacity: 0.5 }]} {...a11y(t('more.signOut'), undefined, 'button')}>
            <Ionicons name="log-out-outline" size={18} color={signingOut ? theme.colors.inkFaint : theme.colors.danger} />
            <Text style={{ flex: 1, fontSize: 15, fontWeight: '500', color: signingOut ? theme.colors.inkFaint : theme.colors.danger }}>{t('more.signOut')}</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Language picker modal */}
      <Modal visible={langVisible} transparent animationType="slide" onRequestClose={() => setLangVisible(false)}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setLangVisible(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} />
        </Pressable>
        <SafeAreaView edges={['bottom']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.ink, marginBottom: 16 }}>{t('more.language')}</Text>
          <Pressable onPress={() => onChangeLang('ka')} style={[styles.langRow, i18n.language === 'ka' && { backgroundColor: theme.colors.accentSoft }]}>
            <Text style={{ fontSize: 16, color: theme.colors.ink }}>ქართული</Text>
            {i18n.language === 'ka' && <Ionicons name="checkmark" size={20} color={theme.colors.accent} />}
          </Pressable>
          <Pressable onPress={() => onChangeLang('en')} style={[styles.langRow, i18n.language === 'en' && { backgroundColor: theme.colors.accentSoft }]}>
            <Text style={{ fontSize: 16, color: theme.colors.ink }}>English</Text>
            {i18n.language === 'en' && <Ionicons name="checkmark" size={20} color={theme.colors.accent} />}
          </Pressable>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

// ───────── HELPERS ─────────

function StatPill({ value, label, tint, theme }: { value: number | null; label: string; tint: string; theme: any }) {
  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <View style={[styles.statPill, { backgroundColor: theme.colors.card, borderColor: theme.colors.hairline }]}>
      {value === null ? (
        <Skeleton width={30} height={22} />
      ) : (
        <Text style={{ fontSize: 22, fontWeight: '800', color: tint }}>{value}</Text>
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
            <View style={{ backgroundColor: theme.colors.warnSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: theme.colors.warn }}>{badge}</Text>
            </View>
          ) : null}
        </View>
        {primary === null ? (
          <Skeleton width={40} height={28} />
        ) : (
          <Text style={{ fontSize: 28, fontWeight: '900', color: theme.colors.ink }}>{primary}</Text>
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

function getStyles(theme: any) {
  return StyleSheet.create({
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: '#F5F5F0',
    },
    statPill: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 1,
      padding: 14,
      gap: 3,
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
    settingsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.hairline,
      marginLeft: 46,
    },
    langRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: 12,
      marginBottom: 8,
    },
  });
}


