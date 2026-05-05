// Inspection done screen.
//
// Reached immediately after the wizard conclusion step finishes.
// Shows a success state with a quick summary of the completed inspection,
// plus the option to view the inspection detail or go home.
import { useCallback, useEffect, useState, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Screen } from '../../../components/ui';
import { Skeleton, SkeletonCard } from '../../../components/Skeleton';
import { AnimatedSuccessIcon, CelebrationBurst } from '../../../components/animations';
import { inspectionsApi, projectsApi, templatesApi } from '../../../lib/services';
import { useTheme } from '../../../lib/theme';
import { haptic } from '../../../lib/haptics';
import type { Inspection, Project, Template } from '../../../types/models';

export default function InspectionDoneScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
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
    const t = setTimeout(() => haptic.inspectionComplete(), 400);
    return () => clearTimeout(t);
  }, [load]);

  const viewInspection = () => {
    router.back();
  };

  const goHome = () => {
    router.replace('/(tabs)/home' as any);
  };

  return (
    <Screen edgeToEdge>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <CelebrationBurst />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Success header */}
        <View style={styles.header}>
          <AnimatedSuccessIcon />
          <Text style={styles.title}>ინსპექცია შენახულია!</Text>
          <Text style={styles.subtitle}>
            ყველა მონაცემი შენახულია. PDF რეპორტის ჩამოტვირთვა და ხელმოწერა
            შეგიძლიათ ინსპექციის გვერდიდან.
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
            {project ? <Text style={styles.inspMeta}>{project.name}</Text> : null}
            <Text style={styles.inspMeta}>
              {new Date(inspection.completed_at ?? inspection.created_at).toLocaleString('ka-GE')}
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
          title="ინსპექციის ნახვა"
          onPress={viewInspection}
          size="xl"
          leftIcon="document-text"
          style={{ alignSelf: 'stretch', justifyContent: 'center', marginTop: 4 }}
        />

        {/* Secondary actions */}
        <View style={styles.actionGroup}>
          <ActionCard
            icon="eye-outline"
            title="PDF პრევიუ და ჩამოტვირთვა"
            subtitle="დაათვალიერეთ და ჩამოტვირთეთ რეპორტი"
            onPress={viewInspection}
          />
          <ActionCard
            icon="home-outline"
            title="მთავარ გვერდზე"
            subtitle="დაბრუნდი საწყის გვერდზე"
            onPress={goHome}
          />
        </View>
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
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
      ]}
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

function getstyles(theme: any) {
  return StyleSheet.create({
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
    header: { alignItems: 'center', gap: 12, marginBottom: 4 },
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
}
