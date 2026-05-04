import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/ui';
import { generateAndSharePdf } from '../../../lib/pdfOpen';
import { useTheme } from '../../../lib/theme';
import { briefingsApi } from '../../../lib/briefingsApi';
import { buildBriefingPdfHtml } from '../../../lib/briefingPdf';
import { generatePdfName } from '../../../lib/pdfName';
import { projectsApi } from '../../../lib/services';
import { a11y } from '../../../lib/accessibility';
import type { Briefing, Project } from '../../../types/models';

export default function BriefingDoneScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!id) return;
    briefingsApi.getById(id).then(async b => {
      if (!b) return;
      setBriefing(b);
      const p = await projectsApi.getById(b.projectId).catch(() => null);
      setProject(p);
    });
  }, [id]);

  const sharePdf = useCallback(async () => {
    if (!briefing || !project) return;
    setSharing(true);
    try {
      const html = buildBriefingPdfHtml(briefing, project);
      const pdfName = generatePdfName(project.company_name || project.name, 'ინსტრუქტაჟი', new Date(briefing.dateTime), briefing.id);
      await generateAndSharePdf(html, pdfName);
    } catch {
      Alert.alert('შეცდომა', 'PDF გენერირება ვერ მოხერხდა');
    } finally {
      setSharing(false);
    }
  }, [briefing, project]);

  const goToProject = () => {
    if (briefing?.projectId) {
      router.replace(`/projects/${briefing.projectId}` as any);
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />

      <View style={styles.content}>
        {/* Success icon */}
        <View style={styles.iconWrap}>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark-circle" size={72} color={theme.colors.accent} />
          </View>
        </View>

        <Text style={styles.title}>ინსტრუქტაჟი დასრულდა ✓</Text>

        {briefing && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{briefing.participants.length}</Text>
              <Text style={styles.statLabel}>მონაწილე</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{briefing.topics.length}</Text>
              <Text style={styles.statLabel}>თემა</Text>
            </View>
          </View>
        )}

        {briefing && project ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoProjectName} numberOfLines={1}>
              {project.company_name || project.name}
            </Text>
            {project.address ? (
              <Text style={styles.infoAddress} numberOfLines={2}>
                {project.address}
              </Text>
            ) : null}
          </View>
        ) : (
          <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 24 }} />
        )}
      </View>

      {/* Actions */}
      <View style={styles.footer}>
        <Button
          title={sharing ? 'PDF მზადდება...' : 'PDF გაზიარება'}
          size="lg"
          leftIcon="share-outline"
          onPress={sharePdf}
          loading={sharing}
          disabled={!briefing || !project || sharing}
          style={{ width: '100%' }}
        />
        <Pressable
          onPress={() => id && router.push(`/briefings/${id}` as any)}
          style={styles.secondaryBtn}
          {...a11y('ოქმის ნახვა', 'ინსტრუქტაჟის დეტალების ნახვა', 'button')}
        >
          <Ionicons name="document-text-outline" size={18} color={theme.colors.accent} />
          <Text style={styles.secondaryBtnText}>ოქმის ნახვა</Text>
        </Pressable>
        <Pressable
          onPress={goToProject}
          style={styles.ghostBtn}
          {...a11y('პროექტზე დაბრუნება', undefined, 'button')}
        >
          <Text style={styles.ghostBtnText}>პროექტზე დაბრუნება</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function getstyles(theme: any) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      gap: 20,
    },
    iconWrap: {
      alignItems: 'center',
    },
    iconCircle: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: theme.colors.semantic.successSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: theme.colors.ink,
      textAlign: 'center',
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 32,
      gap: 24,
      shadowColor: theme.colors.ink,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 3,
    },
    statItem: {
      alignItems: 'center',
      gap: 4,
    },
    statValue: {
      fontSize: 28,
      fontWeight: '800',
      color: theme.colors.accent,
    },
    statLabel: {
      fontSize: 12,
      color: theme.colors.inkSoft,
      fontWeight: '600',
    },
    statDivider: {
      width: 1,
      height: 40,
      backgroundColor: theme.colors.hairline,
    },
    infoCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 20,
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
      width: '100%',
    },
    infoProjectName: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.ink,
      textAlign: 'center',
    },
    infoAddress: {
      fontSize: 13,
      color: theme.colors.inkSoft,
      textAlign: 'center',
    },
    footer: {
      paddingHorizontal: 20,
      paddingBottom: 16,
      paddingTop: 12,
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: theme.colors.hairline,
      backgroundColor: theme.colors.background,
    },
    secondaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: theme.colors.accent,
    },
    secondaryBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.accent,
    },
    ghostBtn: {
      alignItems: 'center',
      paddingVertical: 10,
    },
    ghostBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.inkSoft,
    },
  });
}
