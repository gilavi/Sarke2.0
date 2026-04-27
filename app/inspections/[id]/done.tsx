// Inspection done screen.
//
// Reached immediately after the wizard conclusion step finishes and
// `inspectionsApi.finish()` completes. Shows a success state with
// a quick summary of the completed inspection, plus the option to
// generate a PDF report now or view the inspection detail later.
import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Screen } from '../../../components/ui';
import { Skeleton, SkeletonCard } from '../../../components/Skeleton';
import {
  inspectionsApi,
  projectsApi,
  templatesApi,
} from '../../../lib/services';
import { theme } from '../../../lib/theme';
import { haptic } from '../../../lib/haptics';
import type { Inspection, Project, Template } from '../../../types/models';

export default function InspectionDoneScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const insp = await inspectionsApi.getById(id).catch(() => null);
      setInspection(insp);
      if (!insp) return;
      const [tpl, proj] = await Promise.all([
        templatesApi.getById(insp.template_id).catch(() => null),
        projectsApi.getById(insp.project_id).catch(() => null),
      ]);
      setTemplate(tpl);
      setProject(proj);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
    // Celebration haptic on first mount
    const t = setTimeout(() => haptic.inspectionComplete(), 400);
    return () => clearTimeout(t);
  }, [load]);

  const generatePdf = () => {
    if (!id) return;
    // replace so the user can't back into this screen from the PDF generator
    router.replace(`/certificates/new?inspectionId=${id}` as any);
  };

  const previewPdf = () => {
    if (!id) return;
    router.push(`/inspections/${id}?tab=preview` as any);
  };

  const viewInspection = () => {
    if (!id) return;
    router.replace(`/inspections/${id}` as any);
  };

  return (
    <Screen edgeToEdge>
      {/* No header — celebratory dead-end screen, forward nav only. */}
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scroll}>
          {/* Success header */}
          <View style={styles.header}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={44} color={theme.colors.white} />
            </View>
            <Text style={styles.title}>ინსპექცია შენახულია!</Text>
            <Text style={styles.subtitle}>
              ყველა მონაცემი შენახულია. PDF რეპორტი შეგიძლიათ
              დააგენერიროთ ახლა ან მოგვიანებით.
            </Text>
          </View>

          {/* Summary card */}
          {loading ? (
            <SkeletonCard>
              <Skeleton width={90} height={10} />
              <View style={{ height: 10 }} />
              <Skeleton width={'80%'} height={18} />
              <View style={{ height: 6 }} />
              <Skeleton width={'50%'} height={12} />
              <View style={{ height: 14 }} />
              <Skeleton width={'65%'} height={14} />
              <View style={{ height: 8 }} />
              <Skeleton width={'95%'} height={12} />
              <View style={{ height: 4 }} />
              <Skeleton width={'70%'} height={12} />
            </SkeletonCard>
          ) : inspection ? (
            <Card>
              <Text style={styles.eyebrow}>შეჯამება</Text>
              <Text style={styles.inspTitle}>{template?.name ?? 'ინსპექცია'}</Text>
              {project ? (
                <Text style={styles.inspMeta}>{project.name}</Text>
              ) : null}
              <Text style={styles.inspMeta}>
                {new Date(inspection.completed_at ?? inspection.created_at).toLocaleString('ka')}
              </Text>
              <View style={{ height: 10 }} />
              <Text
                style={{
                  fontWeight: '700',
                  color:
                    inspection.is_safe_for_use === false
                      ? theme.colors.danger
                      : theme.colors.accent,
                }}
              >
                {inspection.is_safe_for_use === false
                  ? '✗ არ არის უსაფრთხო ექსპლუატაციისთვის'
                  : '✓ უსაფრთხოა ექსპლუატაციისთვის'}
              </Text>
              {inspection.conclusion_text ? (
                <Text style={styles.conclusion} numberOfLines={4}>
                  {inspection.conclusion_text}
                </Text>
              ) : null}
            </Card>
          ) : null}

          {/* Primary CTA */}
          <Button
            title="PDF რეპორტის გენერაცია"
            onPress={generatePdf}
            size="xl"
            leftIcon="document-text"
            style={{ alignSelf: 'stretch', justifyContent: 'center', marginTop: 4 }}
          />

          {/* Secondary action cards */}
          <View style={styles.actionGroup}>
            <ActionCard
              icon="eye-outline"
              title="პრევიუს ნახვა"
              subtitle="დაათვალიერეთ რეპორტი დაგენერირებამდე"
              onPress={previewPdf}
            />
            <ActionCard
              icon="list"
              title="ინსპექციის ნახვა"
              subtitle="ყველა პასუხი და ფოტო ერთად"
              onPress={viewInspection}
            />
          </View>

          {/* Tertiary: text link */}
          <Pressable
            onPress={() => router.replace('/(tabs)/home' as any)}
            style={({ pressed }) => [styles.homeLink, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="home-outline" size={16} color={theme.colors.inkSoft} />
            <Text style={styles.homeLinkText}>მთავარ გვერდზე</Text>
          </Pressable>
        </ScrollView>
    </Screen>
  );
}

function ActionCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}
    >
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={22} color={theme.colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.actionSubtitle}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.inkSoft} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingTop: 40, paddingBottom: 32, gap: 16 },
  actionGroup: { gap: 10, marginTop: 4 },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.hairline,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accentSoft,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  actionSubtitle: {
    fontSize: 12,
    color: theme.colors.inkSoft,
    marginTop: 2,
  },
  homeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    marginTop: 8,
  },
  homeLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.inkSoft,
  },
  header: { alignItems: 'center', gap: 12, marginBottom: 4 },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.ink,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.inkSoft,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  eyebrow: {
    fontSize: 11,
    color: theme.colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  inspTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.ink,
    marginTop: 6,
  },
  inspMeta: {
    fontSize: 12,
    color: theme.colors.inkSoft,
    marginTop: 2,
  },
  conclusion: {
    marginTop: 8,
    color: theme.colors.ink,
    fontSize: 14,
    lineHeight: 20,
  },
});
