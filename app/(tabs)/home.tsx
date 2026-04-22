import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../../lib/session';
import { certificatesApi, projectsApi, questionnairesApi, templatesApi, isExpiringSoon } from '../../lib/services';
import { shareStoredPdf } from '../../lib/sharePdf';
import { theme } from '../../lib/theme';
import { Card, Chip, SectionHeader } from '../../components/ui';
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
        questionnairesApi.recent(5).catch(() => []),
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

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const user = state.status === 'signedIn' ? state.user : null;
  const firstName = user?.first_name ?? '';
  const greeting = greetingFor(firstName);
  const systemTemplates = templates.filter(t => t.is_system);
  const showCertBanner = certs.length === 0 || certs.some(isExpiringSoon);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const startTemplate = (template: Template) => {
    router.push(`/template/${template.id}/start` as any);
  };

  const sharePdf = async (path: string) => {
    try {
      await shareStoredPdf(path);
    } catch {
      // ignore — silent fail matches existing behavior
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingVertical: 16 }}
        style={{ backgroundColor: theme.colors.background }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />}
      >
        {/* Greeting + profile */}
        <View style={styles.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 32, fontWeight: '900', color: theme.colors.ink }}>
              {greeting}
            </Text>
            <Text style={{ color: theme.colors.inkSoft, marginTop: 4 }}>რას შევამოწმებთ დღეს?</Text>
          </View>
          <Pressable onPress={() => router.push('/(tabs)/more' as any)} hitSlop={8} accessibilityLabel="profile">
            <Ionicons name="person-circle" size={32} color={theme.colors.accent} />
          </Pressable>
        </View>

        {showCertBanner ? (
          <Pressable onPress={() => router.push('/certificates')}>
            <Card padding={14} style={{ marginHorizontal: 16, marginBottom: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={styles.bannerIcon}>
                  <Ionicons name="warning" size={20} color={theme.colors.warn} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', color: theme.colors.ink }}>
                    ატვირთე სერტიფიკატები
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.colors.inkSoft, marginTop: 2 }}>
                    კითხვარს PDF-ში ერთვის თან.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.warn} />
              </View>
            </Card>
          </Pressable>
        ) : null}

        <SectionHeader title="სწრაფი დაწყება" />
        <View style={{ gap: 12, paddingHorizontal: 16, marginTop: 10 }}>
          {systemTemplates.map(t => (
            <Pressable key={t.id} onPress={() => startTemplate(t)}>
              <QuickTile template={t} />
            </Pressable>
          ))}
        </View>

        {recent.length > 0 ? (
          <>
            <View style={{ marginTop: 20 }}>
              <SectionHeader title="ბოლოდროინდელი" />
            </View>
            <View style={{ gap: 10, paddingHorizontal: 16, marginTop: 10 }}>
              {recent.map(q => (
                <Pressable
                  key={q.id}
                  onPress={() =>
                    q.status === 'completed' && q.pdf_url
                      ? sharePdf(q.pdf_url)
                      : router.push(`/questionnaire/${q.id}` as any)
                  }
                >
                  <Card padding={12}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '600', color: theme.colors.ink }}>
                          {templates.find(t => t.id === q.template_id)?.name ?? 'კითხვარი'}
                        </Text>
                        <Text style={{ fontSize: 11, color: theme.colors.inkSoft, marginTop: 2 }}>
                          {new Date(q.created_at).toLocaleString('ka')}
                        </Text>
                      </View>
                      <StatusPill status={q.status} />
                      <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
                    </View>
                  </Card>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        <View style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 2 }}>
          <Text style={{ flex: 1, fontSize: 11, fontWeight: '700', color: theme.colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            ჩემი პროექტები
          </Text>
          <Pressable onPress={() => router.push('/(tabs)/projects' as any)} hitSlop={8}>
            <Text style={{ fontSize: 13, color: theme.colors.accent, fontWeight: '600' }}>ყველა</Text>
          </Pressable>
        </View>
        <View style={{ gap: 10, paddingHorizontal: 16, marginTop: 10, marginBottom: 8 }}>
          {projects.length === 0 ? (
            <Card padding={14}>
              <Text style={{ color: theme.colors.inkSoft, textAlign: 'center', fontSize: 13 }}>
                პროექტები ჯერ არ გაქვს. დაამატე პირველი.
              </Text>
              <Pressable
                onPress={() => router.push('/(tabs)/projects' as any)}
                style={{ marginTop: 10, alignItems: 'center' }}
              >
                <Text style={{ color: theme.colors.accent, fontWeight: '600' }}>+ ახალი პროექტი</Text>
              </Pressable>
            </Card>
          ) : (
            projects.slice(0, 3).map(p => (
              <Pressable key={p.id} onPress={() => router.push(`/projects/${p.id}` as any)}>
                <Card padding={12}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={styles.projectIcon}>
                      <Ionicons name="folder" size={20} color={theme.colors.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '600', color: theme.colors.ink }}>{p.name}</Text>
                      {p.company_name || p.address ? (
                        <Text style={{ fontSize: 11, color: theme.colors.inkSoft, marginTop: 2 }} numberOfLines={1}>
                          {[p.company_name, p.address].filter(Boolean).join(' · ')}
                        </Text>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
                  </View>
                </Card>
              </Pressable>
            ))
          )}
          {projects.length > 3 ? (
            <Pressable onPress={() => router.push('/(tabs)/projects' as any)}>
              <Text style={{ color: theme.colors.accent, fontWeight: '600', textAlign: 'center', paddingVertical: 6 }}>
                კიდევ {projects.length - 3} პროექტი →
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickTile({ template }: { template: Template }) {
  const isHarness = template.category === 'harness';
  const tint = isHarness ? theme.colors.harnessTint : theme.colors.accent;
  const bg = isHarness ? theme.colors.harnessSoft : theme.colors.accentSoft;
  const icon = isHarness ? 'body' : 'construct';
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <View style={[styles.tileIcon, { backgroundColor: bg }]}>
          <Ionicons name={icon as any} size={28} color={tint} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.ink }}>
            {template.name}
          </Text>
          <Text style={{ fontSize: 12, color: theme.colors.inkSoft, marginTop: 2 }}>
            კითხვარის გახსნა
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.inkFaint} />
      </View>
    </Card>
  );
}

function StatusPill({ status }: { status: Questionnaire['status'] }) {
  if (status === 'completed') {
    return <Chip>დასრულდა</Chip>;
  }
  return (
    <Chip tint={theme.colors.warn} bg={theme.colors.warnSoft}>
      დრაფტი
    </Chip>
  );
}

function greetingFor(name: string) {
  const hour = new Date().getHours();
  const base = hour < 5 ? 'კარგი ღამე' : hour < 12 ? 'დილა მშვიდობისა' : hour < 18 ? 'გამარჯობა' : 'საღამო მშვიდობისა';
  return name ? `${base}, ${name}` : base;
}

const styles = StyleSheet.create({
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.warnSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileIcon: {
    width: 62,
    height: 62,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
