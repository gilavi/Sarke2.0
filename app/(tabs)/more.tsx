import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/ui';
import { useSession } from '../../lib/session';
import {
  certificatesApi,
  isExpiringSoon,
  projectsApi,
  questionnairesApi,
  templatesApi,
} from '../../lib/services';
import { theme } from '../../lib/theme';
import type { Certificate, Project, Questionnaire, Template } from '../../types/models';

export default function MoreScreen() {
  const { state, signOut } = useSession();
  const router = useRouter();
  const [history, setHistory] = useState<Questionnaire[]>([]);
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const [h, c, t, p] = await Promise.all([
          questionnairesApi.recent(500).catch(() => []),
          certificatesApi.list().catch(() => []),
          templatesApi.list().catch(() => []),
          projectsApi.list().catch(() => []),
        ]);
        setHistory(h);
        setCerts(c);
        setTemplates(t);
        setProjects(p);
      })();
    }, []),
  );

  const user = state.status === 'signedIn' ? state.user : null;
  const completed = history.filter(q => q.status === 'completed').length;
  const drafts = history.filter(q => q.status === 'draft').length;
  const expiring = certs.filter(isExpiringSoon).length;
  const systemTpl = templates.filter(t => t.is_system).length;
  const initials = `${(user?.first_name?.[0] ?? '')}${(user?.last_name?.[0] ?? '')}`.trim() || '·';
  const latest = history[0];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingVertical: 16, gap: 18 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', paddingHorizontal: 20, color: theme.colors.ink }}>
          მეტი
        </Text>

        {/* Profile */}
        <Card style={{ marginHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={styles.avatar}>
              <Text style={{ color: theme.colors.white, fontSize: 22, fontWeight: '700' }}>{initials}</Text>
            </View>
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
            primary={`${history.length}`}
            secondary={latest ? `ბოლო: ${relativeTime(latest.created_at)}` : 'ცარიელია'}
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
            onPress={() => router.push('/certificates')}
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

        <Pressable
          onPress={signOut}
          style={[styles.signOut, { marginHorizontal: 16 }]}
        >
          <Ionicons name="log-out-outline" size={18} color={theme.colors.danger} />
          <Text style={{ color: theme.colors.danger, fontWeight: '600' }}>გასვლა</Text>
        </Pressable>
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
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={[styles.tileIcon, { backgroundColor: bg }]}>
            <Ionicons name={icon} size={20} color={tint} />
          </View>
          {badge ? (
            <View
              style={{
                backgroundColor: theme.colors.warnSoft,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 999,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', color: theme.colors.warn }}>
                {badge}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={{ fontSize: 28, fontWeight: '900', color: theme.colors.ink }}>{primary}</Text>
        <View>
          <Text style={{ fontWeight: '600', color: theme.colors.ink }}>{title}</Text>
          <Text style={{ fontSize: 11, color: theme.colors.inkSoft }} numberOfLines={1}>
            {secondary}
          </Text>
        </View>
      </Card>
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
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
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
});
