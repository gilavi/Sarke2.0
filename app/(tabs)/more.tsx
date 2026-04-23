import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/ui';
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
import type { Project, Qualification, Template } from '../../types/models';

export default function MoreScreen() {
  const { state, signOut } = useSession();
  const router = useRouter();
  const toast = useToast();
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
    } catch (e: any) {
      toast.error(e?.message ?? 'ვერ მოხერხდა');
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
          <StatPill value={projects.length} label="პროექტი" tint={theme.colors.accent} />
          <StatPill value={completed} label="დასრულდა" tint={theme.colors.harnessTint} />
          <StatPill value={drafts} label="დრაფტი" tint={theme.colors.warn} />
        </View>

        {/* Hub tiles */}
        <View style={styles.grid}>
          <HubTile
            title="ისტორია"
            icon="time"
            tint={theme.colors.accent}
            bg={theme.colors.accentSoft}
            primary={`${counts.total}`}
            secondary={counts.latestCreatedAt ? `ბოლო: ${relativeTime(counts.latestCreatedAt)}` : 'ცარიელია'}
            onPress={() => router.push('/history')}
          />
          <HubTile
            title="სერტიფიკატები"
            icon="ribbon"
            tint={theme.colors.certTint}
            bg={theme.colors.certSoft}
            primary={`${certs.length}`}
            secondary={certs.length === 0 ? 'ცარიელია' : expiring > 0 ? `${expiring} იწურება` : 'ყველა აქტიური'}
            badge={expiring > 0 ? `${expiring} იწურება` : undefined}
            onPress={() => router.push('/(tabs)/certificates' as any)}
          />
          <HubTile
            title="შაბლონები"
            icon="documents"
            tint={theme.colors.harnessTint}
            bg={theme.colors.harnessSoft}
            primary={`${templates.length}`}
            secondary={systemTpl === templates.length ? 'სისტემური' : `${systemTpl} სისტემური`}
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
            icon="calendar-outline"
            label={googleConnected ? 'Google კალენდარი · შეერთდა' : 'Google კალენდარი · შეერთება'}
            onPress={toggleGoogle}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="document-text-outline"
            label="წესები და პირობები"
            onPress={() => router.push('/terms?mode=view' as any)}
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
    </SafeAreaView>
  );
}

function StatPill({ value, label, tint }: { value: number; label: string; tint: string }) {
  return (
    <View style={[styles.statPill]}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: tint }}>{value}</Text>
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
  primary: string;
  secondary: string;
  badge?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1, minWidth: '45%' }}>
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
        <Text style={{ fontSize: 28, fontWeight: '900', color: theme.colors.ink }}>{primary}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '600', color: theme.colors.ink }}>{title}</Text>
            <Text style={{ fontSize: 11, color: theme.colors.inkSoft }} numberOfLines={1}>{secondary}</Text>
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
