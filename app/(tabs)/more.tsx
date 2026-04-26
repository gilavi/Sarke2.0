import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
import { googleCalendar } from '../../lib/googleCalendar';
import { useToast } from '../../lib/toast';
import { theme } from '../../lib/theme';
import { termsKa } from '../../lib/terms';
import { toErrorMessage } from '../../lib/logError';
import type { Project, Qualification, Template } from '../../types/models';

export default function MoreScreen() {
  const { state, signOut } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [termsVisible, setTermsVisible] = useState(false);
  const [counts, setCounts] = useState<{ total: number; drafts: number; completed: number; latestCreatedAt: string | null }>({
    total: 0,
    drafts: 0,
    completed: 0,
    latestCreatedAt: null,
  });
  const [certs, setCerts] = useState<Qualification[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const [cs, c, t, p, gc] = await Promise.all([
          inspectionsApi
            .counts()
            .catch(() => ({ total: 0, drafts: 0, completed: 0, latestCreatedAt: null })),
          qualificationsApi.list().catch(() => []),
          templatesApi.list().catch(() => []),
          projectsApi.list().catch(() => []),
          googleCalendar.isConnected().catch(() => false),
        ]);
        setCounts(cs);
        setCerts(c);
        setTemplates(t);
        setProjects(p);
        setLoaded(true);
        setGoogleConnected(gc);
      })();
    }, []),
  );

  const toggleGoogle = async () => {
    try {
      if (googleConnected) {
        await googleCalendar.disconnect();
        setGoogleConnected(false);
        toast.success('Google კალენდარი გაითიშა');
      } else {
        await googleCalendar.connect();
        setGoogleConnected(true);
        toast.success('Google კალენდარი შეერთდა');
      }
    } catch (e) {
      toast.error(toErrorMessage(e, 'ვერ მოხერხდა'));
    }
  };

  const user = state.status === 'signedIn' ? state.user : null;
  const completed = counts.completed;
  const drafts = counts.drafts;
  const expiring = certs.filter(isExpiringSoon).length;
  const systemTpl = templates.filter(t => t.is_system).length;
  const avatarSeed = encodeURIComponent(user?.id ?? user?.email ?? 'guest');
  const avatarUrl = `https://api.dicebear.com/9.x/adventurer/png?seed=${avatarSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&size=128`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingVertical: 16, gap: 18 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', paddingHorizontal: 20, color: theme.colors.ink }}>
          მეტი
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
            label="პროექტი"
            tint={theme.colors.accent}
          />
          <StatPill
            value={loaded ? completed : null}
            label="დასრულდა"
            tint={theme.colors.harnessTint}
          />
          <StatPill
            value={loaded ? drafts : null}
            label="დრაფტი"
            tint={theme.colors.warn}
          />
        </View>

        {/* Hub tiles */}
        <View style={styles.grid}>
          <HubTile
            title="ისტორია"
            icon="time"
            tint={theme.colors.accent}
            bg={theme.colors.accentSoft}
            primary={loaded ? `${counts.total}` : null}
            secondary={loaded ? (counts.latestCreatedAt ? `ბოლო: ${relativeTime(counts.latestCreatedAt)}` : 'ცარიელია') : null}
            onPress={() => router.push('/history')}
          />
          <HubTile
            title="კვალიფიკაცია"
            icon="ribbon"
            tint={theme.colors.certTint}
            bg={theme.colors.certSoft}
            primary={loaded ? `${certs.length}` : null}
            secondary={loaded ? (certs.length === 0 ? 'ცარიელია' : expiring > 0 ? `${expiring} იწურება` : 'ყველა აქტიური') : null}
            badge={loaded && expiring > 0 ? `${expiring} იწურება` : undefined}
            onPress={() => router.push('/qualifications' as any)}
          />
          <HubTile
            title="შაბლონები"
            icon="documents"
            tint={theme.colors.harnessTint}
            bg={theme.colors.harnessSoft}
            primary={loaded ? `${templates.length}` : null}
            secondary={loaded ? (systemTpl === templates.length ? 'სისტემური' : `${systemTpl} სისტემური`) : null}
            onPress={() => router.push('/templates')}
          />
          <HubTile
            title="რეგულაციები"
            icon="book"
            tint={theme.colors.regsTint}
            bg={theme.colors.regsSoft}
            primary="3"
            secondary="დოკუმენტი"
            onPress={() => router.push('/(tabs)/regulations')}
          />
        </View>

        {/* Settings rows */}
        <View style={[styles.settingsCard, { marginHorizontal: 16 }]}>
          <SettingsRow
            icon="create-outline"
            label={user?.saved_signature_url ? 'ჩემი ხელმოწერა' : 'ხელმოწერის დახატვა'}
            onPress={() => router.push('/signature' as any)}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="document-text-outline"
            label="წესები და პირობები"
            onPress={() => setTermsVisible(true)}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="log-out-outline"
            label="გასვლა"
            onPress={signOut}
            danger
          />
        </View>
      </ScrollView>

      {/* Terms & Privacy Modal — replaces broken /terms route navigation */}
      <TermsModal visible={termsVisible} onClose={() => setTermsVisible(false)} />
    </SafeAreaView>
  );
}

// ───────── TERMS & PRIVACY MODAL ─────────

function TermsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      fade.setValue(0);
      slide.setValue(0);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(slide, { toValue: 1, friction: 9, tension: 80, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, fade, slide]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [500, 0] });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
      <View style={StyleSheet.absoluteFillObject}>
        {/* Dark overlay backdrop */}
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: 'rgba(0,0,0,0.55)', opacity: fade },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFillObject} onPress={handleClose} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View style={[termsStyles.sheet, { transform: [{ translateY }] }]}>
          <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
            <View style={termsStyles.handle} />
            {/* Header */}
            <View style={termsStyles.header}>
              <Text style={termsStyles.headerTitle}>{termsKa.heading}</Text>
              <Pressable onPress={handleClose} hitSlop={10} style={termsStyles.closeBtn}>
                <Ionicons name="close" size={22} color={theme.colors.inkSoft} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 40 }}>
              <Text style={{ fontSize: 12, color: theme.colors.inkSoft }}>{termsKa.updated}</Text>

              {termsKa.sections.map((s, i) => (
                <Card key={i} style={{ gap: 8 }}>
                  <Text style={{ fontWeight: '700', color: theme.colors.ink, fontSize: 15 }}>{s.title}</Text>
                  <Text style={{ color: theme.colors.inkSoft, lineHeight: 20, fontSize: 13 }}>{s.body}</Text>
                </Card>
              ))}

              {/* Privacy Policy section */}
              <Card style={{ gap: 8, backgroundColor: theme.colors.accentSoft }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="shield-checkmark" size={18} color={theme.colors.accent} />
                  <Text style={{ fontWeight: '700', color: theme.colors.accent, fontSize: 15 }}>კონფიდენციალურობის პოლიტიკა</Text>
                </View>
                <Text style={{ color: theme.colors.inkSoft, lineHeight: 20, fontSize: 13 }}>
                  Sarke 2.0 არ იზიარებს თქვენს პერსონალურ მონაცემებს მესამე მხარესთან.{'\n\n'}
                  • ფოტოები და ხელმოწერები ინახება მხოლოდ თქვენს პირად ანგარიშში{'\n'}
                  • PDF ანგარიშები ხელმისაწვდომია მხოლოდ თქვენთვის და თქვენი ორგანიზაციისთვის{'\n'}
                  • მონაცემთა წაშლა შესაძლებელია აპლიკაციის პარამეტრებიდან{'\n'}
                  • ყველა მონაცემი დაცულია Supabase-ის უსაფრთხო სერვერებზე
                </Text>
              </Card>

              <Text style={{ fontSize: 11, color: theme.colors.inkFaint, textAlign: 'center', marginTop: 8 }}>
                © 2026 Sarke 2.0 · ყველა უფლება დაცულია
              </Text>
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const termsStyles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: '8%',
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.hairline,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.hairline,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.ink,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.subtleSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

function StatPill({ value, label, tint }: { value: number | null; label: string; tint: string }) {
  return (
    <View style={[styles.statPill]}>
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
  return (
    <Pressable onPress={onPress} style={styles.hubTileWrap}>
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

function SettingsRow({ icon, label, onPress, danger }: { icon: any; label: string; onPress: () => void; danger?: boolean }) {
  const color = danger ? theme.colors.danger : theme.colors.ink;
  return (
    <Pressable onPress={onPress} style={styles.settingsRow}>
      <Ionicons name={icon} size={18} color={danger ? theme.colors.danger : theme.colors.inkSoft} />
      <Text style={{ flex: 1, fontSize: 15, fontWeight: '500', color }}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
    </Pressable>
  );
}

function relativeTime(iso: string) {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ახლა';
  if (m < 60) return `${m} წთ. წინ`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} სთ. წინ`;
  const d = Math.floor(h / 24);
  return `${d} დღის წინ`;
}

const styles = StyleSheet.create({
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.subtleSurface,
  },
  statPill: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    padding: 14,
    gap: 3,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  // `flex: 1` with minWidth: '45%' was unreliable — gap math pushed items to
  // their own row on some screen widths. Hard-setting 48% + wrap guarantees
  // exactly two columns regardless of device.
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
  signOut: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: theme.colors.dangerSoft,
    borderRadius: 14,
  },
  settingsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    overflow: 'hidden',
    marginBottom: 24,
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
});
