import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Screen } from '../../../components/ui';
import { AnimatedSuccessIcon, CelebrationBurst } from '../../../components/animations';
import { useTheme } from '../../../lib/theme';
import { haptic } from '../../../lib/haptics';
import { useIncident, useProject } from '../../../lib/apiHooks';
import { INCIDENT_TYPE_FULL_LABEL } from '../../../types/models';
import { formatShortDateTime } from '../../../lib/formatDate';

function getTypeBadge(theme: any): Record<string, { bg: string; text: string; border: string }> {
  const isDark = theme.colors.semantic.dangerSoft === '#3A1F1F';
  if (isDark) {
    return {
      minor:    { bg: '#3F2E0F', text: '#FCD34D', border: '#F59E0B' },
      severe:   { bg: '#3D1F08', text: '#FCA673', border: '#F97316' },
      fatal:    { bg: '#3A1F1F', text: '#FCA5A5', border: '#EF4444' },
      mass:     { bg: '#3A1F1F', text: '#FCA5A5', border: '#EF4444' },
      nearmiss: { bg: '#2D1F4F', text: '#C4B5FD', border: '#8B5CF6' },
    };
  }
  return {
    minor:    { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' },
    severe:   { bg: '#FFEDD5', text: '#9A3412', border: '#F97316' },
    fatal:    { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' },
    mass:     { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' },
    nearmiss: { bg: '#EDE9FE', text: '#5B21B6', border: '#8B5CF6' },
  };
}

export default function IncidentSuccessScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: incident } = useIncident(id);
  const { data: project } = useProject(incident?.project_id);

  useEffect(() => {
    const t = setTimeout(() => haptic.inspectionComplete(), 400);
    return () => clearTimeout(t);
  }, []);

  const badge = incident ? getTypeBadge(theme)[incident.type] : null;

  return (
    <Screen edgeToEdge>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <CelebrationBurst />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Success header */}
        <View style={styles.header}>
          <AnimatedSuccessIcon />
          <Text style={styles.title}>ინციდენტი შენახულია!</Text>
          <Text style={styles.subtitle}>
            ყველა მონაცემი შენახულია. PDF ოქმის ნახვა და გაზიარება
            შეგიძლიათ ინციდენტის გვერდიდან.
          </Text>
        </View>

        {/* Summary card */}
        {incident ? (
          <Card>
            <Text style={styles.eyebrow}>შეჯამება</Text>
            {badge ? (
              <View style={[styles.typeBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                <Text style={[styles.typeBadgeText, { color: badge.text }]}>
                  {INCIDENT_TYPE_FULL_LABEL[incident.type]}
                </Text>
              </View>
            ) : null}
            {project ? <Text style={styles.metaText}>{project.name}</Text> : null}
            <Text style={styles.metaText}>{formatShortDateTime(incident.date_time)}</Text>
            {incident.location ? (
              <Text style={styles.metaText}>{incident.location}</Text>
            ) : null}
            {incident.description ? (
              <Text style={styles.descText} numberOfLines={3}>
                {incident.description}
              </Text>
            ) : null}
          </Card>
        ) : null}

        {/* Primary CTA */}
        <Button
          title="ინციდენტის ნახვა"
          onPress={() => router.replace(`/incidents/${id}` as any)}
          size="xl"
          leftIcon="document-text"
          style={{ alignSelf: 'stretch', justifyContent: 'center', marginTop: 4 }}
        />

        {/* Secondary actions */}
        <View style={styles.actionGroup}>
          <ActionCard
            icon="home-outline"
            title="მთავარ გვერდზე"
            subtitle="დაბრუნდი საწყის გვერდზე"
            onPress={() => router.replace('/(tabs)/home' as any)}
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
  const styles = useMemo(() => makeStyles(theme), [theme]);
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

function makeStyles(theme: any) {
  return StyleSheet.create({
    scroll: { padding: 20, paddingTop: 40, paddingBottom: 32, gap: 16 },
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
    typeBadge: {
      alignSelf: 'flex-start',
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginTop: 6,
      marginBottom: 2,
    },
    typeBadgeText: { fontSize: 12, fontWeight: '700' },
    metaText: { fontSize: 12, color: theme.colors.inkSoft, marginTop: 3 },
    descText: { marginTop: 8, color: theme.colors.ink, fontSize: 14, lineHeight: 20 },
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
    actionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.ink },
    actionSubtitle: { fontSize: 12, color: theme.colors.inkSoft, marginTop: 2 },
  });
}
