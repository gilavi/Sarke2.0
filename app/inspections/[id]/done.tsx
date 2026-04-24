// Inspection done screen.
//
// Reached immediately after the wizard conclusion step finishes and
// `inspectionsApi.finish()` completes. Shows a success state with
// a quick summary of the completed inspection, plus the option to
// generate a PDF report now or view the inspection detail later.
import { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

  useEffect(() => { void load(); }, [load]);

  const generatePdf = () => {
    if (!id) return;
    // replace so the user can't back into this screen from the PDF generator
    router.replace(`/certificates/new?inspectionId=${id}` as any);
  };

  const viewInspection = () => {
    if (!id) return;
    router.replace(`/inspections/${id}` as any);
  };

  return (
    <Screen>
      {/* Celebratory dead-end: forward nav only. Block swipe-back so the user
          can't accidentally return to the completed wizard from here. */}
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Success header */}
          <View style={styles.header}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={44} color={theme.colors.white} />
            </View>
            <Text style={styles.title}>ინსპექცია შენახულია!</Text>
            <Text style={styles.subtitle}>
              ყველა მონაცემი ჩაიწერა. შეგიძლია ახლავე დააგენერირო PDF
              რეპორტი ან მოგვიანებით.
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

          {/* Actions */}
          <Button
            title="PDF რეპორტის გენერაცია"
            onPress={generatePdf}
          />
          <Button
            title="ინსპექციის ნახვა"
            variant="secondary"
            onPress={viewInspection}
          />
          <Button
            title="მთავარ გვერდზე"
            variant="ghost"
            onPress={() => router.replace('/(tabs)/home' as any)}
            style={{ marginTop: 4 }}
          />
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingTop: 40, gap: 16 },
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
