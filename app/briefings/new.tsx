import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Keyboard,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { DateTimeField } from '../../components/DateTimeField';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { KeyboardSafeArea } from '../../components/layout/KeyboardSafeArea';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Button } from '../../components/ui';
import { FlowHeader } from '../../components/FlowHeader';
import { FlowProjectPicker } from '../../components/FlowProjectPicker';
import { TopicSelector } from '../../components/briefings/TopicSelector';
import { ParticipantsStep } from '../../components/briefings/ParticipantsStep';
import { useTheme } from '../../lib/theme';
import { useSession } from '../../lib/session';
import { briefingsApi } from '../../lib/briefingsApi';
import { projectsApi } from '../../lib/services';
import type { BriefingParticipant, Project } from '../../types/models';

export default function NewBriefingScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { projectId: paramProjectId } = useLocalSearchParams<{ projectId?: string }>();
  const router = useRouter();
  const session = useSession();

  // ── Project (for header context) ──
  const [pickedProject, setPickedProject] = useState<Project | null>(null);
  const projectId = paramProjectId ?? pickedProject?.id;
  const [project, setProject] = useState<Project | null>(null);
  useEffect(() => {
    if (!projectId || project) return;
    let mounted = true;
    projectsApi.getById(projectId).then(p => { if (mounted) setProject(p); }).catch(() => null);
    return () => { mounted = false; };
  }, [projectId, project]);

  // ── Wizard step (1 = topics, 2 = participants; signing is the next route) ──
  const [step, setStep] = useState<1 | 2>(1);

  // ── Form state ──
  const [dateTime, setDateTime] = useState(() => new Date());
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [customTopic, setCustomTopic] = useState('');
  const [participants, setParticipants] = useState<BriefingParticipant[]>([]);
  const [busy, setBusy] = useState(false);

  // ── Inspector name from session ──
  const inspectorName = useMemo(() => {
    if (session.state.status !== 'signedIn') return '';
    const u = session.state.user;
    if (u) return `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
    return session.state.session.user.email ?? '';
  }, [session.state]);

  const toggleTopic = (key: string) => {
    setSelectedTopics(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const addParticipant = (name: string) => {
    setParticipants(prev => [...prev, { name, signature: null }]);
  };

  const removeParticipant = (idx: number) => {
    setParticipants(prev => prev.filter((_, i) => i !== idx));
  };

  const builtTopics = useMemo(() => {
    const result: string[] = [];
    for (const key of selectedTopics) {
      if (key === 'other') {
        const ct = customTopic.trim();
        if (ct) result.push(`custom:${ct}`);
      } else {
        result.push(key);
      }
    }
    return result;
  }, [selectedTopics, customTopic]);

  const hasTopics = builtTopics.length > 0;
  const canStart = participants.length >= 1 && hasTopics;
  const hasAnyData =
    participants.length > 0 || selectedTopics.size > 0 || customTopic.trim().length > 0;

  const onStart = useCallback(async () => {
    if (!projectId || !canStart) return;
    setBusy(true);
    try {
      const briefing = await briefingsApi.create({
        projectId,
        dateTime: dateTime.toISOString(),
        topics: builtTopics,
        participants,
        inspectorName,
      });
      router.replace(`/briefings/${briefing.id}/sign` as any);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('შეცდომა', `ინსტრუქტაჟის შექმნა ვერ მოხერხდა\n\n${msg}`);
    } finally {
      setBusy(false);
    }
  }, [projectId, dateTime, participants, builtTopics, inspectorName, canStart, router]);

  const onBack = useCallback(() => {
    if (step === 2) setStep(1);
    else router.back();
  }, [step, router]);

  // Launched from Home without a project - pick one as the first full-screen step.
  if (!projectId) {
    return (
      <FlowProjectPicker
        flowTitle="ინსტრუქტაჟი"
        action="briefing"
        onBack={() => router.back()}
        onPicked={(p) => { setPickedProject(p); setProject(p); }}
      />
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <FlowHeader
        flowTitle="ინსტრუქტაჟი"
        project={project}
        step={step}
        totalSteps={3}
        leading="back"
        trailing="close"
        onBack={onBack}
        onClose={() => router.back()}
        confirmExit={hasAnyData}
        surfaceColor={theme.colors.surface}
      />

      <KeyboardSafeArea contentStyle={{ padding: 16, gap: 20 }}>
        {step === 1 ? (
          <>
            {/* ── Date & Time ── */}
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>თარიღი და დრო</Text>
              <DateTimeField
                value={dateTime}
                onChange={d => { Keyboard.dismiss(); setDateTime(d); }}
                mode="datetime"
              />
            </View>

            {/* ── Topics ── */}
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>ინსტრუქტაჟის თემა</Text>
              <Text style={styles.sectionHint}>შეარჩიეთ ერთი ან მეტი</Text>
              <TopicSelector
                selectedTopics={selectedTopics}
                onToggle={toggleTopic}
                customTopic={customTopic}
                onChangeCustomTopic={setCustomTopic}
              />
            </View>
          </>
        ) : (
          /* ── Participants ── */
          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>მონაწილეები</Text>
              {participants.length > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{participants.length}</Text>
                </View>
              )}
            </View>
            <Text style={styles.sectionHint}>მინიმუმ 1 მონაწილე საჭიროა</Text>
            <ParticipantsStep
              participants={participants}
              onAdd={addParticipant}
              onRemove={removeParticipant}
            />
          </View>
        )}
      </KeyboardSafeArea>

      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={[styles.footer, { paddingBottom: insets.bottom }]}>
          {step === 1 ? (
            <Button
              title="შემდეგი"
              size="lg"
              rightIcon={ChevronRight}
              onPress={() => setStep(2)}
              disabled={!hasTopics}
              style={{ width: '100%' }}
            />
          ) : (
            <>
              {!canStart && (
                <Text style={styles.footerHint}>დაამატეთ მინიმუმ 1 მონაწილე</Text>
              )}
              <Button
                title="დაწყება →"
                size="lg"
                onPress={onStart}
                disabled={!canStart}
                loading={busy}
                style={{ width: '100%' }}
              />
            </>
          )}
        </View>
      </KeyboardStickyView>
    </View>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.card,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 10,
    },
    sectionLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.ink,
    },
    sectionHint: {
      fontSize: 12,
      color: theme.colors.inkFaint,
      marginTop: -6,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    countBadge: {
      backgroundColor: theme.colors.subtleSurface,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
    },
    countBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.inkSoft,
    },
    footer: {
      paddingTop: 12,
      gap: 8,
    },
    footerHint: {
      fontSize: 12,
      color: theme.colors.inkFaint,
      textAlign: 'center',
    },
  });
}
